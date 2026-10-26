import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
import { AgentStore, ProactiveAgent, ToolGateway, UsageLedger, defineReadTool, type Json, type ModelAdapter, type ResearchContext } from "./index.ts";

// Deterministic, fabricated flow example. No model or market network requests.
let time = Date.now();
const tenant = "proactive-offline-demo", goalId = randomUUID();
const directory = resolve("packages/harness/.data");
let store = new AgentStore(resolve(directory, "agent-demo.sqlite"));
let ledger = new UsageLedger(resolve(directory, "agent-demo-usage.sqlite"));
let modelExecutions = 0, toolExecutions = 0;
const loadContext = async (): Promise<ResearchContext> => ({
  scope: { tenantId: tenant, accountId: "synthetic-account", conversationId: goalId, runId: "pending-cycle", allowedReadTools: ["pairs.screen", "hypothesis.test", "funding.review"] },
  goal: "Investigate eligible cross-asset paper strategies. Continue testing rather than stopping after a shortlist. This is a synthetic workflow example.",
  mandate: { id: "synthetic-mandate", version: 1, status: "approved", authority: "paper-only", maxExposurePct: 50, maxPositionPct: 30,
    allowedSymbols: ["xyz:XYZ100", "xyz:SP500", "xyz:GOLD", "xyz:SILVER"] },
  portfolio: { id: "synthetic-allocation", asOf: new Date(time).toISOString(), dataMode: "synthetic", cashCents: 100_000, positions: [] },
});
function fixture(name: string, data: Json) {
  return defineReadTool({ name, version: "synthetic-v1", description: "Fabricated workflow-test evidence; not a market observation.",
    dataMode: "synthetic", maxCostMicros: 2, inputSchema: z.object({}), outputSchema: z.json(),
    async execute() { toolExecutions++; return { data, actualCostMicros: 1 }; } });
}
const tools = [
  fixture("pairs.screen", { candidate: "index relationship", edgeEstablished: false }),
  fixture("hypothesis.test", { eligibleForEntry: false, reason: "Fabricated test: evidence does not establish an edge." }),
  fixture("funding.review", { changeDetected: true, needsIndependentValidation: true }),
];
const model: ModelAdapter = {
  provider: "offline-fixture", model: "deterministic-v1",
  async complete(request) {
    modelExecutions++;
    const history = JSON.stringify(request.messages);
    let output: unknown;
    if (history.includes('"previousSummary":"Research continued')) {
      output = history.includes('"type":"evidence"')
        ? { type: "review", disposition: "proposal-ready", summary: "Synthetic follow-up produced a candidate for independent review; no position was created.",
          nextTask: "Validate the exact candidate, costs and portfolio risk before requesting paper approval.", question: null,
          evidenceIds: ["read-1-0"], candidate: { thesis: "Fabricated index-pair candidate illustrating the workflow only.", symbols: ["xyz:XYZ100", "xyz:SP500"],
            risks: ["The example does not establish a real trading edge."], validationNeeded: ["Independent research, product and portfolio checks, followed by exact paper approval."] } }
        : { type: "tools", question: "Check the unresolved funding question from the previous daily review.", calls: [{ id: "next-review", name: "funding.review", input: {} }] };
    } else if (!history.includes('"type":"evidence"')) {
      output = { type: "tools", question: "Which eligible pair merits testing?", calls: [{ id: "screen", name: "pairs.screen", input: {} }] };
    } else if (!history.includes('"name":"hypothesis.test"')) {
      output = { type: "tools", question: "Does the strongest candidate survive an explicit hypothesis test?", calls: [{ id: "test", name: "hypothesis.test", input: {} }] };
    } else {
      output = { type: "review", disposition: "watching", summary: "Research continued from screening to testing; the synthetic test did not justify an entry.",
        nextTask: "Refresh funding evidence in the next daily review, then assess whether a candidate merits independent validation.",
        question: null, candidate: null, evidenceIds: ["read-1-0", "read-2-0"] };
    }
    return { output, usage: { inputTokens: 1, outputTokens: 1, costMicros: 1 }, finishReason: "stop" };
  },
};
function worker() {
  const gateway = new ToolGateway({ tools, ledger, now: () => time });
  return new ProactiveAgent({ store, ledger, gateway, model, now: () => time,
    limits: { modelCallMaxCostMicros: 5, runBudgetMicros: 100 } });
}
try {
  ledger.configureTenant(tenant, 10_000);
  store.create(goalId, await loadContext(), time);
  const first = await worker().tick(tenant, goalId, loadContext);
  const callsBeforeIdle = modelExecutions;
  await worker().tick(tenant, goalId, loadContext);
  const noModelCallsWhileWaiting = modelExecutions === callsBeforeIdle;
  store.close(); ledger.close();
  store = new AgentStore(resolve(directory, "agent-demo.sqlite"));
  ledger = new UsageLedger(resolve(directory, "agent-demo-usage.sqlite"));
  time += 86_400_001;
  const second = await worker().tick(tenant, goalId, loadContext);
  console.log(JSON.stringify({ mode: "OFFLINE SYNTHETIC FLOW: no LLM, accounts, trades or background service",
    firstCycle: { status: first.status, summary: first.summary, nextTask: first.nextTask },
    noModelCallsWhileWaiting,
    afterDatabaseReopenAndSimulatedDailyWake: { status: second.status, summary: second.summary, nextTask: second.nextTask },
    modelExecutions, toolExecutions, syntheticUsage: ledger.budget(tenant), savedUpdates: store.updates(tenant, goalId),
  }, null, 2));
} finally { store.close(); ledger.close(); }
