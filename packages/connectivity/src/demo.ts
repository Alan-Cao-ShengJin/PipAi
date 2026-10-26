import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";
import { ExecutionEngine } from "./engine.ts";
import { ExecutionStore } from "./store.ts";
import { ExecutionToolClient } from "./client.ts";
import { createSignerServer } from "./server.ts";
import { Address, cloid, type Mandate, type Proposal, type Snapshot } from "./contracts.ts";
import type { TradingVenue } from "./venue.ts";

// All wallets, balances, proposals and fills below are disposable offline fixtures.
// No provider, wallet extension or Hyperliquid network request is made.
const primary = privateKeyToAccount(generatePrivateKey()), trading = privateKeyToAccount(generatePrivateKey());
const account = Address.parse(trading.address), agentAddress = Address.parse(privateKeyToAccount(generatePrivateKey()).address);
const store = new ExecutionStore(":memory:");
let sent = 0, last: Proposal | undefined;
const fixtureAgentExpiry = Date.now() + 86_400_000;
const venue: TradingVenue = {
  agentAddress,
  async snapshot(): Promise<Snapshot> { const now = Date.now(); return { account, network: "testnet", startedAt: now, observedAt: now, sourceTime: now, role: "user", accountMode: "disabled",
    equityUsd: "1000", withdrawableUsd: "900", positions: sent ? [{ symbol: "BTC", size: "0.001", notionalUsd: "50", leverage: 1, marginMode: "cross" }] : [], openOrders: [],
    agents: [{ address: agentAddress, name: "Pip", validUntil: fixtureAgentExpiry }], unsupportedExposure: false }; },
  async markets() { return [{ symbol: "BTC", asset: 0, szDecimals: 5, maxLeverage: 50 }]; },
  async market() { return { symbol: "BTC", asset: 0, szDecimals: 5, maxLeverage: 50, accountLeverage: 1, quotedAt: Date.now(), mark: "50000", bid: "49990", ask: "50010" }; },
  async order(p) { sent++; last = p; return { status: "ok", simulated: true }; },
  async cancel() { return { simulated: true }; },
  async orderStatus() { return last ? { status: "order", order: { status: "filled", statusTimestamp: Date.now(), order: { cloid: cloid(last.id), coin: "BTC" } } } : { status: "unknownOid" }; },
};
const engine = new ExecutionEngine({ store, venue, origin: "http://127.0.0.1:3000", armed: true });
async function authorize(input: unknown, wallet = trading) {
  const c = engine.challenge(input); await engine.prove({ challengeId: c.id, signature: await wallet.signMessage({ message: c.message }) });
}
const controlToken = randomBytes(32).toString("hex"), workerToken = randomBytes(32).toString("hex"), port = 48788;
const server = createSignerServer({ engine, controlToken, workerToken, port, webOrigin: "http://127.0.0.1:3000" });
try {
  await authorize({ kind: "link-primary", address: primary.address }, primary);
  await authorize({ kind: "link-trading", address: trading.address });
  const mandate: Mandate = { id: "offline-demo", version: 1, network: "testnet", account, agent: agentAddress, expiresAt: Date.now() + 3_600_000,
    execution: "per-order", allowedSymbols: ["BTC"], maxOrderUsd: "100", maxPositionUsd: "200", maxGrossUsd: "200", minEquityUsd: "800",
    maxLeverage: 1, maxSlippageBps: 30, maxDailyTurnoverUsd: "200", dedicatedAccount: true };
  await authorize({ kind: "mandate", mandate });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const client = new ExecutionToolClient({ token: workerToken, url: `http://127.0.0.1:${port}` });
  await client.invoke("account.read", {});
  const { proposal } = await client.invoke("trade.propose", { symbol: "BTC", side: "buy", size: "0.001", limitPrice: "50010", reduceOnly: false }) as { proposal: Proposal };
  try { await client.invoke("trade.execute", { proposalId: proposal.id }); throw new Error("Missing approval was accepted"); }
  catch (e) { if (!(e instanceof Error) || !e.message.includes("approve")) throw e; }
  await authorize({ kind: "approve-proposal", proposalId: proposal.id });
  await client.invoke("trade.execute", { proposalId: proposal.id });
  await client.invoke("trade.execute", { proposalId: proposal.id });
  const result = await client.invoke("execution.reconcile", { proposalId: proposal.id }) as { blocked: boolean };
  let withdrawalDenied = false;
  try { await client.invoke("withdraw3", {}); } catch { withdrawalDenied = true; }
  if (sent !== 1 || result.blocked || !withdrawalDenied) throw new Error("Offline permission demonstration failed.");
  console.log(JSON.stringify({ mode: "offline-fixtures-only", separateWalletProofs: true, exactWalletApproval: true, orderSubmissions: sent,
    duplicateDidNotResubmit: true, reconciled: true, withdrawalToolDenied: withdrawalDenied, auditEvents: store.events().length }, null, 2));
} finally { await new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }); store.close(); }
