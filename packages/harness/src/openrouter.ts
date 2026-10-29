import { OpenRouter } from "@openrouter/sdk";
import type { HTTPClient } from "@openrouter/sdk/lib/http.js";
import { CostMicros, HarnessError, Identifier, type ModelAdapter } from "./contracts.ts";

// Transport only. Pip owns the protocol, permissions, workflow and usage ledger.
export class OpenRouterAdapter implements ModelAdapter {
  readonly provider = "openrouter";
  readonly model: string;
  private client: OpenRouter;
  private mode: "connection-only" | "inference";
  constructor(options: { apiKey: string; model: string; httpClient?: HTTPClient; mode?: "connection-only" | "inference" }) {
    if (!options.apiKey.trim()) throw new HarnessError("PROVIDER_NOT_CONFIGURED", "Configure OPENROUTER_API_KEY locally; do not paste it into chat.");
    this.model = Identifier.parse(options.model);
    this.mode = options.mode ?? (process.env.PIP_MODEL_MODE === "inference" ? "inference" : "connection-only");
    this.client = new OpenRouter({ apiKey: options.apiKey, serverURL: "https://openrouter.ai/api/v1",
      retryConfig: { strategy: "none" }, httpClient: options.httpClient });
  }
  async complete(request: Parameters<ModelAdapter["complete"]>[0]): ReturnType<ModelAdapter["complete"]> {
    if (this.mode !== "inference") {
      throw new HarnessError("INFERENCE_DISABLED", "Runtime model use is connection-only. Paid inference has not been enabled.");
    }
    const result = await this.client.chat.send({ chatRequest: {
      model: this.model, stream: false, maxTokens: request.maxOutputTokens,
      responseFormat: { type: "json_object" },
      provider: { allowFallbacks: false, requireParameters: true, dataCollection: "deny" },
      messages: [
        { role: "system", content: request.context.system },
        { role: "user", content: JSON.stringify({ facts: request.context.facts, availableReadTools: request.tools, history: request.messages }) },
      ],
    } }, { signal: request.signal, retries: { strategy: "none" } });
    const usage = result.usage;
    if (!usage || typeof usage.cost !== "number" || !Number.isFinite(usage.cost) || usage.cost < 0
      || !Number.isSafeInteger(usage.promptTokens) || usage.promptTokens < 0
      || !Number.isSafeInteger(usage.completionTokens) || usage.completionTokens < 0) {
      throw new HarnessError("UNRESOLVED_CALL", "A complete provider cost receipt is required before continuing.");
    }
    const costMicros = CostMicros.parse(Math.ceil(usage.cost * 1_000_000));
    const choice = result.choices[0];
    let output: unknown = null;
    // Invalid content still returns trustworthy usage so the runner records known charges.
    if (result.choices.length === 1 && choice?.finishReason === "stop" && typeof choice.message.content === "string" && !choice.message.toolCalls?.length) {
      try { output = JSON.parse(choice.message.content); } catch { /* Runner rejects null after metering. */ }
    }
    return { output, usage: { inputTokens: usage.promptTokens, outputTokens: usage.completionTokens, costMicros },
      finishReason: choice?.finishReason === "length" ? "length" : "stop" };
  }
}
