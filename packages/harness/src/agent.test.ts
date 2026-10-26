import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import { AgentStore, ProactiveAgent, ToolGateway, UsageLedger, defineReadTool, type Json, type ModelAdapter, type ResearchContext } from "./index.ts";

let clock = Date.parse("2026-10-26T09:00:00Z");
const handles = new Set<{ close(): void }>();
const folders: string[] = [];
afterEach(() => {
  for (const handle of handles) handle.close(); handles.clear();
  for (const folder of folders.splice(0)) { for (const name of ["work", "usage"]) for (const suffix of [".sqlite", ".sqlite-wal", ".sqlite-shm"]) {
    const path = join(folder, name + suffix); if (existsSync(path)) unlinkSync(path);
  } rmdirSync(folder); }
  clock = Date.parse("2026-10-26T09:00:00Z");
});
function context(): ResearchContext {
  return { scope: { tenantId: "alice", accountId: "account", conversationId: "conversation", runId: "placeholder", allowedReadTools: ["research.read"] },
    goal: "Test cross-asset research hypotheses within the mandate.",
    mandate: { id: "mandate", version: 1, status: "approved", authority: "paper-only", maxExposurePct: 50, maxPositionPct: 30, allowedSymbols: ["xyz:SP500", "xyz:GOLD"] },
    portfolio: { id: "synthetic-snapshot", asOf: new Date(clock).toISOString(), dataMode: "synthetic", cashCents: 100000, positions: [] } };
}
function review(overrides: Record<string, unknown> = {}) {
  return { type: "review", disposition: "watching", summary: "No demonstrated edge yet; investigate the remaining hypothesis.",
    nextTask: "Refresh funding and test whether the candidate survives realistic costs.", evidenceIds: ["mandate"], question: null, candidate: null, ...overrides };
}
function read(id = "read", topic = "screen") { return { type: "tools", question: `Investigate ${topic}.`, calls: [{ id, name: "research.read", input: { topic } }] }; }
function adapter(output: (request: Parameters<ModelAdapter["complete"]>[0]) => unknown = () => review()) {
  const complete = vi.fn(async (request: Parameters<ModelAdapter["complete"]>[0]) => ({ output: output(request),
    usage: { inputTokens: 10, outputTokens: 10, costMicros: 1 }, finishReason: "stop" as const }));
  return { provider: "fixture", model: "test", complete };
}
function setup(options: { storePath?: string; ledgerPath?: string; model?: ModelAdapter; tenantLimit?: number;
  limits?: Partial<ConstructorParameters<typeof ProactiveAgent>[0]["limits"]> } = {}) {
  const store = new AgentStore(options.storePath ?? ":memory:"), ledger = new UsageLedger(options.ledgerPath ?? ":memory:");
  handles.add(store); handles.add(ledger);
  ledger.configureTenant("alice", options.tenantLimit ?? 1000);
  const body = vi.fn(async ({ topic }: { topic: string }) => ({ data: { topic, edgeEstablished: false }, actualCostMicros: 1 }));
  const tool = defineReadTool({ name: "research.read", version: "1", description: "Synthetic test evidence", dataMode: "synthetic", maxCostMicros: 2,
    inputSchema: z.object({ topic: z.string() }), outputSchema: z.object({ topic: z.string(), edgeEstablished: z.boolean() }).strict(), execute: body });
  const model = options.model ?? adapter();
  const agent = new ProactiveAgent({ store, ledger, model, gateway: new ToolGateway({ tools: [tool], ledger, now: () => clock }), now: () => clock,
    limits: { modelCallMaxCostMicros: 5, runBudgetMicros: 100, ...options.limits } });
  store.create("goal", context(), clock);
  return { store, ledger, model, agent, body, tick: (loader = async () => context()) => agent.tick("alice", "goal", loader) };
}

describe("persistent proactive research", () => {
  it("continues from screening to testing without another user message and saves a daily follow-up", async () => {
    const model = adapter(request => {
      const evidence = request.messages.filter(m => m && typeof m === "object" && !Array.isArray(m) && m.type === "evidence");
      return evidence.length === 0 ? read("first", "screen") : evidence.length === 1 ? read("second", "test") : review({ evidenceIds: ["read-1-0", "read-2-0"] });
    });
    const x = setup({ model });
    const result = await x.tick();
    expect(result.status).toBe("watching"); expect(result.nextTask).toContain("funding");
    expect(result.dueAt).toBe(clock + 86400000);
    expect(model.complete).toHaveBeenCalledTimes(3); expect(x.body).toHaveBeenCalledTimes(2);
    await x.tick(); expect(model.complete).toHaveBeenCalledTimes(3);
    expect(x.store.updates("alice", "goal")).toHaveLength(1);
    expect(x.ledger.budget("alice").spentMicros).toBe(5);
  });
  it("wakes on the saved due date with fresh context and the previous follow-up task", async () => {
    const model = adapter(); const x = setup({ model });
    await x.tick(); clock += 86400001;
    await x.tick(); expect(model.complete).toHaveBeenCalledTimes(2);
    const request = model.complete.mock.calls[1][0];
    expect(request.context.facts.portfolio.asOf).toBe(new Date(clock).toISOString());
    expect(JSON.stringify(request.messages)).toContain("Refresh funding");
    expect(JSON.stringify(request.messages)).toContain("previousSummary");
    expect(x.store.updates("alice", "goal")).toHaveLength(2);
  });
  it("fences a second worker while the first model call is in flight", async () => {
    const folder = mkdtempSync(join(tmpdir(), "pip-agent-")); folders.push(folder);
    const paths = { storePath: join(folder, "work.sqlite"), ledgerPath: join(folder, "usage.sqlite") };
    let resolve!: (value: Awaited<ReturnType<ModelAdapter["complete"]>>) => void;
    const model: ModelAdapter = { provider: "fixture", model: "test", complete: vi.fn(() => new Promise<Awaited<ReturnType<ModelAdapter["complete"]>>>(r => { resolve = r; })) };
    const x = setup({ ...paths, model });
    const first = x.tick(); await vi.waitFor(() => expect(resolve).toBeTypeOf("function"));
    const competing = setup({ ...paths, model });
    const second = await competing.tick(); expect(second.status).toBe("running"); expect(model.complete).toHaveBeenCalledTimes(1);
    resolve({ output: review(), usage: { inputTokens: 1, outputTokens: 1, costMicros: 1 }, finishReason: "stop" });
    expect((await first).status).toBe("watching");
  });
  it("replays a settled model request after a crash before its goal checkpoint commits", async () => {
    const folder = mkdtempSync(join(tmpdir(), "pip-agent-")); folders.push(folder);
    const model = adapter();
    const paths = { storePath: join(folder, "work.sqlite"), ledgerPath: join(folder, "usage.sqlite") };
    const x = setup({ ...paths, model });
    const original = x.store.finish.bind(x.store);
    x.store.finish = () => { throw new Error("simulated process death"); };
    await expect(x.tick()).rejects.toThrow("simulated process death");
    x.store.finish = original;
    handles.delete(x.store); handles.delete(x.ledger); x.store.close(); x.ledger.close();
    clock += 180001;
    const resumed = setup({ ...paths, model });
    expect((await resumed.tick()).status).toBe("watching");
    expect(model.complete).toHaveBeenCalledTimes(1); expect(resumed.ledger.budget("alice").spentMicros).toBe(1);
    expect(resumed.store.updates("alice", "goal")).toHaveLength(1);
  });
  it("blocks uncertain provider outcomes without a blind retry or automatic refund", async () => {
    const model: ModelAdapter = { provider: "fixture", model: "test", complete: vi.fn(async () => { throw new Error("private-provider-header"); }) };
    const x = setup({ model }); const result = await x.tick();
    expect(result.status).toBe("reconciliation-required");
    expect(x.ledger.budget("alice").reservedMicros).toBe(5);
    await x.tick(); expect(model.complete).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(x.store.updates("alice", "goal"))).not.toContain("private-provider-header");
    expect(() => x.store.requestReview("alice", "goal", clock)).toThrow(/Resolve/);
  });
  it("validates the entire tool batch before dispatching any part of it", async () => {
    const model = adapter(() => ({ type: "tools", question: "Read", calls: [read().calls[0], { id: "write", name: "orders.submit", input: {} }] }));
    const x = setup({ model }); const result = await x.tick();
    expect(result.status).toBe("blocked"); expect(result.summary).toContain("TOOL_DENIED");
    expect(x.body).not.toHaveBeenCalled(); expect(x.ledger.budget("alice").spentMicros).toBe(1);
  });
  it("rejects token-truncated tool requests while retaining known model charges", async () => {
    const model: ModelAdapter = { provider: "fixture", model: "test", complete: async () => ({ output: read(),
      usage: { inputTokens: 1, outputTokens: 100, costMicros: 2 }, finishReason: "length" }) };
    const x = setup({ model }); const result = await x.tick();
    expect(result.summary).toContain("TRUNCATED_OUTPUT"); expect(x.body).not.toHaveBeenCalled();
    expect(x.ledger.budget("alice")).toMatchObject({ spentMicros: 2, reservedMicros: 0 });
  });
  it("suppresses unchanged repeated reads and schedules a different investigation", async () => {
    const model = adapter(() => read()); const x = setup({ model });
    const result = await x.tick(); expect(result.status).toBe("watching"); expect(result.summary).toContain("NO_PROGRESS");
    expect(result.nextTask).toContain("different hypothesis"); expect(x.body).toHaveBeenCalledTimes(1);
  });
  it("enforces tenant budgets before model dispatch", async () => {
    const model = adapter(); const x = setup({ model, tenantLimit: 4 });
    expect((await x.tick()).status).toBe("budget-blocked"); expect(model.complete).not.toHaveBeenCalled();
    expect(x.ledger.budget("alice").spentMicros).toBe(0);
  });
  it("bounds an otherwise continuing cycle and retains the investigation for later", async () => {
    let topic = 0; const model = adapter(() => read("next", `hypothesis-${++topic}`));
    const x = setup({ model, limits: { maxModelCalls: 2 } }); const result = await x.tick();
    expect(result.status).toBe("watching"); expect(model.complete).toHaveBeenCalledTimes(2);
    expect(result.nextTask).toContain("hypothesis-2"); expect(x.body).toHaveBeenCalledTimes(2);
  });
  it("checks current authority again before dispatching model-selected tools", async () => {
    const x = setup({ model: adapter(() => read()) }); let loads = 0;
    const result = await x.tick(async () => { const value = context(); if (++loads >= 3) value.mandate.version = 2; return value; });
    expect(result.summary).toContain("MANDATE_CHANGED"); expect(x.body).not.toHaveBeenCalled();
  });
  it("honours a pause while a model response is in flight", async () => {
    let resolve!: (value: Awaited<ReturnType<ModelAdapter["complete"]>>) => void;
    const model: ModelAdapter = { provider: "fixture", model: "test", complete: () => new Promise(r => { resolve = r; }) };
    const x = setup({ model }); const pending = x.tick();
    await vi.waitFor(() => expect(resolve).toBeTypeOf("function")); x.store.pause("alice", "goal");
    resolve({ output: read(), usage: { inputTokens: 1, outputTokens: 1, costMicros: 1 }, finishReason: "stop" });
    expect((await pending).status).toBe("paused"); expect(x.body).not.toHaveBeenCalled();
    expect(x.ledger.budget("alice").spentMicros).toBe(1);
  });
  it("checks a pause that arrives during the authority refresh before reading tools", async () => {
    const x = setup({ model: adapter(() => read()) }); let loads = 0;
    const result = await x.tick(async () => { if (++loads >= 3) x.store.pause("alice", "goal"); return context(); });
    expect(result.status).toBe("paused"); expect(x.body).not.toHaveBeenCalled();
  });
  it("holds the model reservation when cancellation has no usage receipt", async () => {
    const cancellation = new AbortController();
    const model: ModelAdapter = { provider: "fixture", model: "test", complete: async () => {
      cancellation.abort(); return new Promise(() => {});
    } };
    const x = setup({ model }); const result = await x.agent.tick("alice", "goal", async () => context(), cancellation.signal);
    expect(result.status).toBe("reconciliation-required"); expect(x.ledger.budget("alice").reservedMicros).toBe(5);
  });
  it("requires collected evidence and mandate-eligible instruments for a candidate", async () => {
    const model = adapter(request => request.messages.length === 1 ? read() : review({ disposition: "proposal-ready", evidenceIds: ["read-1-0"],
      candidate: { thesis: "Example", symbols: ["UNAPPROVED"], risks: ["Example risk"], validationNeeded: ["Independent policy checks"] } }));
    const x = setup({ model }); const result = await x.tick();
    expect(result.summary).toContain("INSTRUMENT_DENIED"); expect(result.status).toBe("blocked");
  });
  it("does not allow invented evidence references", async () => {
    const x = setup({ model: adapter(() => review({ evidenceIds: ["invented"] })) });
    expect((await x.tick()).summary).toContain("UNKNOWN_EVIDENCE");
  });
  it("keeps an infeasible mandate actionable through a concrete revision question", async () => {
    const x = setup({ model: adapter(() => review({ disposition: "infeasible", question: "Should we revise the deadline or the target?",
      nextTask: "Use the user's revised objective to formulate the next investigation." })) });
    const result = await x.tick(); expect(result.status).toBe("infeasible"); expect(result.dueAt).toBeNull();
    expect(x.store.updates("alice", "goal")[0].detail).toMatchObject({ question: "Should we revise the deadline or the target?" });
  });
  it("records a provider overrun and freezes subsequent research spending", async () => {
    const model: ModelAdapter = { provider: "fixture", model: "test", complete: async () => ({ output: review(),
      usage: { inputTokens: 1, outputTokens: 1, costMicros: 20 }, finishReason: "stop" }) };
    const x = setup({ model }); expect((await x.tick()).status).toBe("reconciliation-required");
    expect(x.ledger.budget("alice")).toMatchObject({ spentMicros: 20, reservedMicros: 0, blocked: true });
  });
  it("rejects stale account facts without calling a model", async () => {
    const model = adapter(); const x = setup({ model });
    const result = await x.tick(async () => ({ ...context(), portfolio: { ...context().portfolio, asOf: new Date(clock - 300001).toISOString() } }));
    expect(result.summary).toContain("STALE_CONTEXT"); expect(model.complete).not.toHaveBeenCalled();
  });
  it("isolates goals and updates by tenant", () => {
    const x = setup(); expect(() => x.store.get("bob", "goal")).toThrow(/tenant scope/);
    expect(() => x.store.pause("bob", "goal")).toThrow(/tenant scope/);
    expect(x.store.get("alice", "goal").status).toBe("queued");
  });
  it("carries a user follow-up into the next cycle without changing approved authority", async () => {
    const model = adapter(); const x = setup({ model }); await x.tick();
    x.store.requestReview("alice", "goal", clock, "Prioritise comparing funding costs.");
    await x.tick();
    expect(JSON.stringify(model.complete.mock.calls[1][0].messages)).toContain("Prioritise comparing funding costs");
    expect(model.complete.mock.calls[1][0].context.facts.mandate.authority).toBe("paper-only");
  });
  it("does not discard an uncertain zero-cost request when stale work is reclaimed", async () => {
    const model = adapter(); const x = setup({ model }); const ctx = context(); ctx.scope.runId = "unfinished-free-read";
    x.ledger.configureRun(ctx.scope, 100);
    x.ledger.claim(ctx.scope, "free-read", "fingerprint", 0, {});
    x.ledger.uncertain(ctx.scope, "free-read", "INTERRUPTED");
    const lease = x.store.claim("alice", "goal", clock)!;
    x.store.save(lease, { context: ctx, phase: "tools", modelCalls: 1, toolCalls: 0, messages: [],
      evidenceIds: ["mandate", "portfolio"], seenReads: [], pending: [], cursor: 0 }, clock);
    clock += 400000;
    expect((await x.tick()).status).toBe("reconciliation-required"); expect(model.complete).not.toHaveBeenCalled();
    expect(x.ledger.budget("alice").reservedMicros).toBe(0);
    expect(x.ledger.hasUnresolved(ctx.scope)).toBe(true);
  });
  it("refreshes stale interrupted work when all previous dispatches have receipts", async () => {
    const model = adapter(); const x = setup({ model }); const ctx = context(); ctx.scope.runId = "old-cycle";
    x.ledger.configureRun(ctx.scope, 100);
    const lease = x.store.claim("alice", "goal", clock)!;
    x.store.save(lease, { context: ctx, phase: "model", modelCalls: 0, toolCalls: 0, messages: [],
      evidenceIds: ["mandate", "portfolio"], seenReads: [], pending: [], cursor: 0 }, clock);
    clock += 400000;
    expect((await x.tick()).status).toBe("watching");
    expect(model.complete.mock.calls[0][0].context.facts.portfolio.asOf).toBe(new Date(clock).toISOString());
    expect(JSON.stringify(model.complete.mock.calls[0][0].messages)).toContain("interrupted cycle");
  });
  it("stops before a paid request if the complete input exceeds its character bound", async () => {
    const model = adapter(); const x = setup({ model, limits: { maxInputCharacters: 1000 } });
    expect((await x.tick()).summary).toContain("CONTEXT_LIMIT"); expect(model.complete).not.toHaveBeenCalled();
  });
});
