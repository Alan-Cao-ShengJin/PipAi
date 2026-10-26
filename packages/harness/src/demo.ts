import { resolve } from "node:path";
import { z } from "zod";
import { buildModelContext, defineReadTool, ToolGateway, UsageLedger, type ResearchContext } from "./index.ts";

// All identities, balances and permissions in this example are fabricated test data.
const context: ResearchContext = {
  scope: {
    tenantId: "offline-demo", accountId: "paper-account", conversationId: "study-example",
    runId: crypto.randomUUID(), allowedReadTools: ["portfolio.read"],
  },
  goal: "Understand a simulated portfolio before considering a paper decision.",
  mandate: {
    id: "demo-mandate", version: 1, status: "approved", authority: "paper-only",
    maxExposurePct: 40, maxPositionPct: 25, allowedSymbols: ["BTC", "ETH"],
  },
  portfolio: { id: crypto.randomUUID(), asOf: new Date().toISOString(), dataMode: "synthetic", cashCents: 1_000_000, positions: [] },
};

let executions = 0;
const portfolioTool = defineReadTool({
  name: "portfolio.read", version: "fixture-v1", description: "Read this scoped account's synthetic paper cash.",
  dataMode: "synthetic", maxCostMicros: 0,
  inputSchema: z.object({}), outputSchema: z.object({ cashCents: z.number().int().nonnegative(), positionCount: z.number().int().nonnegative() }).strict(),
  async execute(_, environment) {
    executions++;
    return { data: { cashCents: environment.context.portfolio.cashCents, positionCount: environment.context.portfolio.positions.length }, actualCostMicros: 0 };
  },
});
const path = resolve("packages/harness/.data/offline-demo.sqlite");
let ledger = new UsageLedger(path);
try {
  ledger.configureTenant(context.scope.tenantId, 0);
  ledger.configureRun(context.scope, 0);
  const request = buildModelContext(context);
  const gateway = new ToolGateway({ ledger, tools: [portfolioTool] });
  const call = { id: "read-1", name: "portfolio.read", input: {} };
  const first = await gateway.invoke(context, call);
  ledger.close();
  ledger = new UsageLedger(path);
  const resumedGateway = new ToolGateway({ ledger, tools: [portfolioTool] });
  const repeated = await resumedGateway.invoke(context, call);
  let denied = false;
  try { await resumedGateway.invoke(context, { ...call, id: "forbidden-1", name: "orders.submit" }); }
  catch { denied = true; }
  console.log(JSON.stringify({
    mode: "offline synthetic example; no model calls or real accounts",
    protectedMandateVersion: request.facts.mandate.version,
    firstResult: first.result,
    replayedAfterDatabaseReopen: repeated.cached,
    toolBodyExecutions: executions,
    orderToolDenied: denied,
    usage: ledger.budget(context.scope.tenantId),
    journal: ledger.events(context.scope),
  }, null, 2));
} finally { ledger.close(); }
