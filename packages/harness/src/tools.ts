import { createHash } from "node:crypto";
import { z } from "zod";
import { buildModelContext, CostMicros, freeze, HarnessError, Identifier, ToolCallSchema, validateContext, type Json, type ResearchContext, type ToolCall } from "./contracts.ts";
import { UsageLedger } from "./ledger.ts";

export interface ToolEnvironment {
  readonly context: Readonly<ResearchContext>;
  readonly signal: AbortSignal;
}
export interface RegisteredReadTool {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly readOnly: true;
  readonly dataMode: "synthetic" | "live-read-only";
  readonly maxCostMicros: number;
  readonly jsonSchema: Readonly<Json>;
  parseInput(value: Json): Json;
  parseOutput(value: unknown): Json;
  execute(input: Json, environment: ToolEnvironment): Promise<{ data: unknown; actualCostMicros: number }>;
}

export function defineReadTool<S extends z.ZodObject, O extends z.ZodType>(definition: {
  name: string; version: string; description: string; dataMode: "synthetic" | "live-read-only";
  maxCostMicros: number; inputSchema: S; outputSchema: O;
  execute(input: z.infer<S>, environment: ToolEnvironment): Promise<{ data: z.infer<O>; actualCostMicros: number }>;
}): RegisteredReadTool {
  const inputSchema = definition.inputSchema.strict();
  const outputSchema = definition.outputSchema;
  const execute = definition.execute;
  return Object.freeze({
    name: definition.name, version: definition.version, description: definition.description,
    readOnly: true as const, dataMode: definition.dataMode, maxCostMicros: definition.maxCostMicros,
    jsonSchema: freeze(z.json().parse(z.toJSONSchema(inputSchema))),
    parseInput(value: Json) { return z.json().parse(inputSchema.parse(value)); },
    parseOutput(value: unknown) { return z.json().parse(outputSchema.parse(value)); },
    execute(input: Json, environment: ToolEnvironment) { return execute(inputSchema.parse(input) as z.infer<S>, environment); },
  });
}

function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export class ToolGateway {
  private tools = new Map<string, RegisteredReadTool>();
  private ledger: UsageLedger;
  private now: () => number;
  private maxAgeMs: number;
  private timeoutMs: number;
  constructor(options: { tools: readonly RegisteredReadTool[]; ledger: UsageLedger; now?: () => number; maxAgeMs?: number; timeoutMs?: number }) {
    this.ledger = options.ledger;
    this.now = options.now ?? Date.now;
    this.maxAgeMs = options.maxAgeMs ?? 300_000;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 60_000) throw new HarnessError("INVALID_TIMEOUT", "Use a timeout between 1ms and 60 seconds.");
    for (const tool of options.tools) {
      Identifier.parse(tool.name); Identifier.parse(tool.version); CostMicros.parse(tool.maxCostMicros);
      if (tool.readOnly !== true || this.tools.has(tool.name)) throw new HarnessError("INVALID_REGISTRY", "Only unique, server-registered read-only tools are supported.");
      this.tools.set(tool.name, Object.freeze({ ...tool }));
    }
  }
  available(context: ResearchContext) {
    const checked = validateContext(context, this.now(), this.maxAgeMs);
    return [...this.tools.values()].filter((tool) => checked.scope.allowedReadTools.includes(tool.name))
      .map((tool) => ({ name: tool.name, version: tool.version, description: tool.description, inputSchema: tool.jsonSchema }));
  }
  validateBatch(context: ResearchContext, calls: readonly ToolCall[]): ToolCall[] {
    validateContext(context, this.now(), this.maxAgeMs);
    const ids = new Set<string>();
    return calls.map(value => {
      const call = ToolCallSchema.parse(value);
      if (ids.has(call.id)) throw new HarnessError("DUPLICATE_CALL", "Tool call identifiers must be unique within a batch.");
      ids.add(call.id);
      const tool = this.tools.get(call.name);
      if (!tool || !context.scope.allowedReadTools.includes(call.name)) throw new HarnessError("TOOL_DENIED", "The complete batch must contain only permitted read tools.");
      try { return { ...call, input: tool.parseInput(call.input) }; }
      catch { throw new HarnessError("INVALID_INPUT", "The complete batch must pass registered input schemas before dispatch."); }
    });
  }
  async invoke(contextInput: ResearchContext, callInput: ToolCall, signal?: AbortSignal): Promise<{ result: Json; cached: boolean }> {
    const context = freeze(validateContext(contextInput, this.now(), this.maxAgeMs));
    const parsed = ToolCallSchema.safeParse(callInput);
    if (!parsed.success) throw new HarnessError("INVALID_CALL", "The tool request is invalid.");
    const call = parsed.data;
    const tool = this.tools.get(call.name);
    if (!tool || !context.scope.allowedReadTools.includes(call.name)) throw new HarnessError("TOOL_DENIED", "This tool is unavailable in the current research scope.");
    if (signal?.aborted) throw new HarnessError("CANCELLED", "The request was cancelled before dispatch.");
    let input: Json;
    try { input = tool.parseInput(call.input); }
    catch { throw new HarnessError("INVALID_INPUT", "Tool arguments do not match the registered input schema."); }
    const identity = z.json().parse({
      context, policyVersion: "research-tools-v1",
      tool: { name: tool.name, version: tool.version, maxCostMicros: tool.maxCostMicros }, input,
    });
    const fingerprint = createHash("sha256").update(canonical(identity)).digest("hex");
    const claimed = this.ledger.claim(context.scope, call.id, fingerprint, tool.maxCostMicros, {
      callId: call.id, tool: tool.name, version: tool.version, input,
      accountId: context.scope.accountId, mandateId: context.mandate.id,
      mandateVersion: context.mandate.version, snapshotId: context.portfolio.id,
    });
    if (claimed.cached) return { result: claimed.result, cached: true };

    const bounded = AbortSignal.any([AbortSignal.timeout(this.timeoutMs), ...(signal ? [signal] : [])]);
    try {
      // An adapter must cooperate with cancellation. A timed-out reservation stays held.
      const receipt = await new Promise<{ data: unknown; actualCostMicros: number }>((resolve, reject) => {
        const abort = () => reject(new HarnessError("INTERRUPTED", "The tool call timed out or was cancelled. Its outcome needs reconciliation."));
        bounded.addEventListener("abort", abort, { once: true });
        if (bounded.aborted) { abort(); return; }
        Promise.resolve().then(() => { bounded.throwIfAborted(); return tool.execute(input, { context, signal: bounded }); })
          .then(resolve, reject).finally(() => bounded.removeEventListener("abort", abort));
      });
      CostMicros.parse(receipt.actualCostMicros);
      let data: Json;
      try {
        data = tool.parseOutput(receipt.data);
        if (JSON.stringify(data).length > 32_000) throw new Error("oversized output");
        validateContext(context, this.now(), this.maxAgeMs);
        if (bounded.aborted) throw new Error("interrupted");
      } catch {
        this.ledger.settle(context.scope, call.id, receipt.actualCostMicros, null, "INVALID_OR_STALE_OUTPUT");
        throw new HarnessError("INVALID_OUTPUT", "The output was invalid, oversized, interrupted or stale. Known usage was recorded.");
      }
      const result = z.json().parse({
        data,
        provenance: { tool: tool.name, version: tool.version, dataMode: tool.dataMode, snapshotId: context.portfolio.id, observedAt: new Date(this.now()).toISOString(), trust: "untrusted-evidence" },
      });
      this.ledger.settle(context.scope, call.id, receipt.actualCostMicros, result);
      return { result, cached: false };
    } catch (error) {
      const code = error instanceof HarnessError ? error.code : "TOOL_FAILED";
      this.ledger.uncertain(context.scope, call.id, code);
      if (error instanceof HarnessError) throw error;
      // Provider/plugin errors may contain credentials; never store or forward their raw text.
      throw new HarnessError("TOOL_FAILED", "The tool failed. Its cost reservation is retained until the outcome is reconciled.");
    }
  }
}

// Makes the model boundary easy to find from this module without a provider dependency.
export { buildModelContext };
