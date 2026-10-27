import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { resolve, join, sep } from "node:path";
import type { AddressInfo } from "node:net";
import { request as httpRequest } from "node:http";
import { Address, MandateSchema, OrderSchema, cloid, type Market, type Mandate, type Proposal, type Snapshot } from "./contracts.ts";
import { ExecutionStore } from "./store.ts";
import { ExecutionEngine } from "./engine.ts";
import { checkTrade } from "./risk.ts";
import { ExecutionToolClient } from "./client.ts";
import { loadAgent } from "./keystore.ts";
import { HyperliquidTestnet, VenueOrderRejected, type TradingVenue } from "./venue.ts";
import { createSignerServer } from "./server.ts";
import { readAccountStreams } from "./account-stream.ts";

const now = Date.parse("2026-10-26T08:00:00.000Z");
const primary = privateKeyToAccount(generatePrivateKey()), trading = privateKeyToAccount(generatePrivateKey()), agent = privateKeyToAccount(generatePrivateKey());
const account = Address.parse(trading.address), agentAddress = Address.parse(agent.address);
const order = { symbol: "BTC", side: "buy" as const, size: "0.001", limitPrice: "50010", reduceOnly: false };
const market: Market = { symbol: "BTC", asset: 0, szDecimals: 5, maxLeverage: 50, accountLeverage: 1, quotedAt: now, mark: "50000", bid: "49990", ask: "50010" };
function mandate(overrides: Partial<Mandate> = {}): Mandate { return { id: "mandate", version: 1, network: "testnet", account, agent: agentAddress,
  expiresAt: now + 3_600_000, execution: "per-order", allowedSymbols: ["BTC", "ETH"], maxOrderUsd: "100", maxPositionUsd: "200", maxGrossUsd: "300", minEquityUsd: "80", maxLeverage: 1, maxSlippageBps: 30, maxDailyTurnoverUsd: "1000", dedicatedAccount: true, ...overrides }; }
function snapshot(): Snapshot { return { account, network: "testnet", observedAt: now, startedAt: now, sourceTime: now, accountMode: "disabled", role: "user", equityUsd: "1000", withdrawableUsd: "1000",
  positions: [], openOrders: [], agents: [{ address: agentAddress, name: "Pip", validUntil: now + 7_200_000 }], unsupportedExposure: false }; }
function proposal(): Proposal { return { id: "proposal", mandateId: "mandate", mandateVersion: 1, account, agent: agentAddress, network: "testnet", order, expiresAt: now + 120_000 }; }
const stores: ExecutionStore[] = [], directories: string[] = [];
afterEach(() => { vi.unstubAllGlobals(); for (const s of stores.splice(0)) s.close(); for (const d of directories.splice(0)) {
  if (!resolve(d).startsWith(resolve(tmpdir()) + sep)) throw new Error("Unexpected test cleanup path");
  rmSync(d, { recursive: true, force: true });
} });
function store(path = ":memory:") { const s = new ExecutionStore(path); stores.push(s); return s; }
function temp() { const d = mkdtempSync(join(tmpdir(), "pip-connectivity-")); directories.push(d); return d; }
function venue(): TradingVenue & { state: Snapshot } {
  const state = snapshot();
  return { agentAddress, state, snapshot: vi.fn(async () => structuredClone(state)), market: vi.fn(async () => ({ ...market })), markets: vi.fn(async () => [{ ...market }]),
    order: vi.fn(async () => ({ status: "ok", response: { type: "order", data: { statuses: [{ filled: { oid: 1 } }] } } })),
    cancel: vi.fn(async () => ({ status: "ok" })), orderStatus: vi.fn(async () => ({ status: "unknownOid" })) };
}
async function authorize(engine: ExecutionEngine, input: unknown, wallet = trading) {
  const c = engine.challenge(input);
  const signature = await wallet.signMessage({ message: c.message });
  return engine.prove({ challengeId: c.id, signature });
}
async function setup(options: { armed?: boolean; execution?: "autonomous" | "per-order"; db?: ExecutionStore; clock?: () => number; v?: ReturnType<typeof venue> } = {}) {
  const db = options.db ?? store(), v = options.v ?? venue();
  const e = new ExecutionEngine({ store: db, venue: v, origin: "http://127.0.0.1:3000", armed: options.armed ?? true, now: options.clock ?? (() => now) });
  if (!db.get("primary")) {
    await authorize(e, { kind: "link-primary", address: primary.address }, primary);
    await authorize(e, { kind: "link-trading", address: trading.address });
    await authorize(e, { kind: "mandate", mandate: mandate({ execution: options.execution ?? "per-order" }) });
  }
  return { db, v, e };
}
async function propose(e: ExecutionEngine) { return (await e.worker("trade.propose", order) as { proposal: Proposal }).proposal; }

describe("wallet ownership and exact authorization", () => {
  it("accepts the existing owner account, keeps the API key separate and refuses identity replacement", async () => {
    const e = new ExecutionEngine({ store: store(), venue: venue(), origin: "http://127.0.0.1:3000", now: () => now });
    expect(() => e.challenge({ kind: "link-trading", address: trading.address })).toThrow(/primary/);
    await authorize(e, { kind: "link-primary", address: primary.address }, primary);
    expect(() => e.challenge({ kind: "link-trading", address: agent.address })).toThrow(/distinct/);
    expect(() => e.challenge({ kind: "link-primary", address: trading.address })).toThrow(/bound/);
    const linked = await authorize(e, { kind: "link-trading", address: primary.address }, primary);
    expect(linked).toMatchObject({ primary: primary.address.toLowerCase(), trading: primary.address.toLowerCase(), paused: true, mandate: null });
    expect(() => e.challenge({ kind: "link-trading", address: trading.address })).toThrow(/overwritten/);
  });
  it("rejects the wrong wallet, changed messages, expiry and replay", async () => {
    let time = now;
    const e = new ExecutionEngine({ store: store(), venue: venue(), origin: "http://127.0.0.1:3000", now: () => time });
    const c = e.challenge({ kind: "link-primary", address: primary.address });
    await expect(e.prove({ challengeId: c.id, signature: await trading.signMessage({ message: c.message }) })).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
    await expect(e.prove({ challengeId: c.id, signature: await primary.signMessage({ message: c.message + " changed" }) })).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
    const signature = await primary.signMessage({ message: c.message });
    await e.prove({ challengeId: c.id, signature });
    await expect(e.prove({ challengeId: c.id, signature })).rejects.toMatchObject({ code: "INVALID_CHALLENGE" });
    const t = e.challenge({ kind: "link-trading", address: trading.address });
    time += 120_001;
    await expect(e.prove({ challengeId: t.id, signature: await trading.signMessage({ message: t.message }) })).rejects.toMatchObject({ code: "EXPIRED" });
  });
  it("binds mandate signatures to account, API key, version and expiry", async () => {
    const { e } = await setup();
    expect(() => e.challenge({ kind: "mandate", mandate: mandate() })).toThrow(/increase/);
    expect(() => e.challenge({ kind: "mandate", mandate: mandate({ version: 2, account: Address.parse(primary.address) }) })).toThrow(/linked trading/);
    expect(() => e.challenge({ kind: "mandate", mandate: mandate({ version: 2, agent: Address.parse(primary.address) }) })).toThrow(/linked trading/);
    expect(() => e.challenge({ kind: "mandate", mandate: mandate({ version: 2, expiresAt: now + 86_400_001 }) })).toThrow(/24 hours/);
    expect(MandateSchema.safeParse({ ...mandate(), network: "mainnet" }).success).toBe(false);
    expect(() => e.challenge({ kind: "mandate", mandate: mandate({ version: 2, dedicatedAccount: false }) })).toThrow(/separation/);
    expect(MandateSchema.safeParse({ ...mandate(), dedicatedAccount: false }).success).toBe(true);
  });
  it("preserves signed mandates, per-order approval, limits and denied transfers on a shared owner account", async () => {
    const v = venue(); v.state.account = Address.parse(primary.address);
    const e = new ExecutionEngine({ store: store(), venue: v, origin: "http://127.0.0.1:3000", armed: true, now: () => now });
    await authorize(e, { kind: "link-primary", address: primary.address }, primary);
    await authorize(e, { kind: "link-trading", address: primary.address }, primary);
    const shared = mandate({ account: Address.parse(primary.address), dedicatedAccount: false });
    expect(() => e.challenge({ kind: "mandate", mandate: { ...shared, dedicatedAccount: true } })).toThrow(/separation/);
    await authorize(e, { kind: "mandate", mandate: shared }, primary);
    const p = await propose(e);
    expect(p.account).toBe(primary.address.toLowerCase());
    await expect(e.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
    await authorize(e, { kind: "approve-proposal", proposalId: p.id }, primary);
    await e.worker("trade.execute", { proposalId: p.id });
    expect(v.order).toHaveBeenCalledOnce();
    for (const name of ["withdraw", "transfer", "sign"]) await expect(e.worker(name, {})).rejects.toMatchObject({ code: "TOOL_DENIED" });
  });
});

describe("independent pretrade checks", () => {
  it("accepts a bounded order using decimal arithmetic", () => {
    expect(checkTrade(proposal(), mandate(), snapshot(), market, now, "0")).toEqual({ notional: "50.01", projectedGrossUsd: "50.01" });
  });
  it.each([
    ["account substitution", (p: Proposal, m: Mandate, s: Snapshot, k: Market) => { p.account = Address.parse(primary.address); }, "AUTHORITY_MISMATCH"],
    ["mandate change", (p: Proposal) => { p.mandateVersion = 2; }, "AUTHORITY_MISMATCH"],
    ["expired proposal", (p: Proposal) => { p.expiresAt = now; }, "EXPIRED"],
    ["expired mandate", (_: Proposal, m: Mandate) => { m.expiresAt = now; }, "EXPIRED"],
    ["stale account", (_: Proposal, _m: Mandate, s: Snapshot) => { s.startedAt -= 10001; }, "STALE_STATE"],
    ["future account", (_: Proposal, _m: Mandate, s: Snapshot) => { s.observedAt += 1; }, "STALE_STATE"],
    ["stale quote", (_: Proposal, _m: Mandate, _s: Snapshot, k: Market) => { k.quotedAt -= 5001; }, "STALE_QUOTE"],
    ["unified account", (_: Proposal, _m: Mandate, s: Snapshot) => { s.accountMode = "unifiedAccount"; }, "UNSUPPORTED_ACCOUNT"],
    ["subaccount", (_: Proposal, _m: Mandate, s: Snapshot) => { s.role = "subAccount"; }, "UNSUPPORTED_ACCOUNT"],
    ["other collateral", (_: Proposal, _m: Mandate, s: Snapshot) => { s.unsupportedExposure = true; }, "UNSUPPORTED_ACCOUNT"],
    ["revoked agent", (_: Proposal, _m: Mandate, s: Snapshot) => { s.agents = []; }, "AGENT_NOT_APPROVED"],
    ["short agent expiry", (_: Proposal, _m: Mandate, s: Snapshot) => { s.agents[0].validUntil = now + 100; }, "AGENT_NOT_APPROVED"],
    ["market outside mandate", (_: Proposal, m: Mandate) => { m.allowedSymbols = ["ETH"]; }, "MARKET_DENIED"],
    ["bad size increment", (p: Proposal) => { p.order.size = "0.001001"; }, "SIZE_INCREMENT"],
    ["bad price increment", (p: Proposal) => { p.order.limitPrice = "50010.01"; }, "PRICE_INCREMENT"],
    ["adverse price", (p: Proposal) => { p.order.limitPrice = "55000"; }, "PRICE_LIMIT"],
    ["oversized order", (p: Proposal) => { p.order.size = "1"; }, "ORDER_LIMIT"],
    ["venue minimum", (p: Proposal) => { p.order.size = "0.00001"; }, "ORDER_LIMIT"],
    ["resting order", (_: Proposal, _m: Mandate, s: Snapshot) => { s.openOrders.push({ oid: 1, cloid: null, symbol: "BTC", size: "1", limitPrice: "50000", side: "buy", reduceOnly: false }); }, "OPEN_ORDERS"],
    ["leverage configured too high", (_: Proposal, _m: Mandate, _s: Snapshot, k: Market) => { k.accountLeverage = 20; }, "VENUE_LEVERAGE"],
    ["equity threshold", (_: Proposal, _m: Mandate, s: Snapshot) => { s.equityUsd = "79"; }, "EQUITY_PAUSE"],
    ["insufficient collateral", (_: Proposal, _m: Mandate, s: Snapshot) => { s.withdrawableUsd = "1"; }, "COLLATERAL_LIMIT"],
    ["false reduce only", (p: Proposal) => { p.order.reduceOnly = true; }, "REDUCE_ONLY"],
  ] as const)("rejects %s", (_name, mutate, code) => {
    const p = structuredClone(proposal()), m = mandate(), s = snapshot(), k = { ...market };
    mutate(p, m, s, k);
    expect(() => checkTrade(p, m, s, k, now, "0")).toThrow(expect.objectContaining({ code }));
  });
  it("includes existing positions and turnover and allows genuine risk reduction below equity pause", () => {
    const s = snapshot(); s.positions = [{ symbol: "ETH", size: "1", notionalUsd: "299", leverage: 1, marginMode: "cross" }];
    expect(() => checkTrade(proposal(), mandate(), s, market, now, "0")).toThrow(expect.objectContaining({ code: "EXPOSURE_LIMIT" }));
    expect(() => checkTrade(proposal(), mandate(), snapshot(), market, now, "999")).toThrow(expect.objectContaining({ code: "TURNOVER_LIMIT" }));
    s.positions = [{ symbol: "BTC", size: "0.002", notionalUsd: "100", leverage: 1, marginMode: "cross" }]; s.equityUsd = "79";
    const p = proposal(); p.order = { ...order, side: "sell", reduceOnly: true, limitPrice: "49990" };
    expect(checkTrade(p, mandate(), s, market, now, "0").projectedGrossUsd).toBe("50");
    p.order.size = "0.003";
    expect(() => checkTrade(p, mandate(), s, market, now, "0")).toThrow(expect.objectContaining({ code: "ORDER_LIMIT" }));
  });
});

describe("execution authority, reservations and recovery", () => {
  it.each(["withdraw3", "sendAsset", "agentSendAsset", "agentSetAbstraction", "updateLeverage", "approveAgent", "sign", "fetch"])("denies %s", async name => {
    const { e, v } = await setup(); await expect(e.worker(name, {})).rejects.toMatchObject({ code: "TOOL_DENIED" }); expect(v.order).not.toHaveBeenCalled();
  });
  it("rejects extra model arguments and requires exact per-order approval", async () => {
    const { e, v } = await setup();
    expect(OrderSchema.safeParse({ ...order, builder: { b: primary.address, f: 100 } }).success).toBe(false);
    for (const input of [{ ...order, account: primary.address }, { ...order, vaultAddress: primary.address }, { ...order, type: "withdraw3" }, { ...order, tif: "Gtc" }, { ...order, approved: true }]) {
      await expect(e.worker("trade.propose", input)).rejects.toThrow();
    }
    const p = await propose(e);
    await expect(e.worker("trade.execute", { proposalId: p.id, approved: true })).rejects.toThrow();
    await expect(e.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
    await authorize(e, { kind: "approve-proposal", proposalId: p.id });
    await e.worker("trade.execute", { proposalId: p.id });
    expect(v.order).toHaveBeenCalledExactlyOnceWith(p, market, now + 5000);
  });
  it("disarms by default and preserves the pause across restart", async () => {
    const { e, db, v } = await setup({ armed: false, execution: "autonomous" }); const p = await propose(e);
    await expect(e.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "NOT_ARMED" });
    e.pause();
    const restarted = new ExecutionEngine({ store: db, venue: v, origin: "http://127.0.0.1:3000", armed: true, now: () => now });
    await expect(restarted.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "PAUSED_OR_CHANGED" });
    expect(v.order).not.toHaveBeenCalled();
  });
  it("rechecks risk and mandate at dispatch, not only proposal creation", async () => {
    const { e, v } = await setup({ execution: "autonomous" }); const p = await propose(e);
    v.state.equityUsd = "10";
    await expect(e.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "EQUITY_PAUSE" });
    v.state.equityUsd = "1000";
    await authorize(e, { kind: "mandate", mandate: mandate({ version: 2, execution: "autonomous" }) });
    await expect(e.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "AUTHORITY_MISMATCH" });
    expect(v.order).not.toHaveBeenCalled();
  });
  it("holds uncertain execution durably, never retries and blocks different proposals", async () => {
    const path = join(temp(), "execution.sqlite"), db = store(path), v = venue();
    vi.mocked(v.order).mockRejectedValue(new Error("timeout with secret signed envelope"));
    const { e } = await setup({ db, v, execution: "autonomous" });
    const p = await propose(e), second = await propose(e);
    const result = await e.worker("trade.execute", { proposalId: p.id });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(db.intent(p.id)?.status).toBe("uncertain");
    const reopened = store(path), restarted = new ExecutionEngine({ store: reopened, venue: v, origin: "http://127.0.0.1:3000", armed: true, now: () => now });
    expect(await restarted.worker("trade.execute", { proposalId: p.id })).toMatchObject({ replay: true });
    await expect(restarted.worker("trade.execute", { proposalId: second.id })).rejects.toMatchObject({ code: "RECONCILIATION_REQUIRED" });
    expect(await restarted.worker("execution.reconcile", { proposalId: p.id })).toMatchObject({ blocked: true });
    expect(v.order).toHaveBeenCalledTimes(1);
  });
  it("records a definitive single-order rejection without leaving an unknown-outcome hold", async () => {
    const { e, v, db } = await setup({ execution: "autonomous" });
    vi.mocked(v.order).mockRejectedValueOnce(new VenueOrderRejected());
    const p = await propose(e); await e.worker("trade.execute", { proposalId: p.id });
    expect(db.intent(p.id)).toMatchObject({ status: "settled", result: { outcome: "rejected" } });
    const next = await propose(e); await e.worker("trade.execute", { proposalId: next.id });
    expect(v.order).toHaveBeenCalledTimes(2);
  });
  it("unblocks only after the exact terminal order and fresh account are reconciled", async () => {
    const { e, db, v } = await setup({ execution: "autonomous" }); const p = await propose(e);
    await e.worker("trade.execute", { proposalId: p.id });
    vi.mocked(v.orderStatus).mockResolvedValue({ status: "order", order: { status: "filled", statusTimestamp: now, order: { cloid: cloid(p.id), coin: "BTC" } } });
    expect(await e.worker("execution.reconcile", { proposalId: p.id })).toMatchObject({ blocked: false });
    expect(db.intent(p.id)?.status).toBe("settled");
    const next = await propose(e); await e.worker("trade.execute", { proposalId: next.id }); expect(v.order).toHaveBeenCalledTimes(2);
  });
  it("serializes racing submissions and honors a pause during asynchronous validation", async () => {
    const { e, v } = await setup({ execution: "autonomous" }); const p = await propose(e);
    let release!: (value: Snapshot) => void;
    vi.mocked(v.snapshot).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = e.worker("trade.execute", { proposalId: p.id });
    await expect(e.worker("trade.execute", { proposalId: p.id })).rejects.toMatchObject({ code: "BUSY" });
    e.pause(); release(snapshot());
    await expect(pending).rejects.toMatchObject({ code: "PAUSED_OR_CHANGED" });
    expect(v.order).not.toHaveBeenCalled();
  });
  it("retires revoked keys and permits only cancellation of recorded orders while paused", async () => {
    const { e, v } = await setup({ execution: "autonomous" }); const p = await propose(e);
    await e.worker("trade.execute", { proposalId: p.id }); e.pause();
    await e.worker("orders.cancel", { proposalId: p.id }); expect(v.cancel).toHaveBeenCalledOnce();
    await expect(e.worker("orders.cancel", { proposalId: "not-ours" })).rejects.toMatchObject({ code: "UNKNOWN_INTENT" });
    v.state.agents = []; await e.worker("account.read", {});
    expect(e.status().retired).toBe(true);
    expect(() => e.challenge({ kind: "mandate", mandate: mandate({ version: 2 }) })).toThrow(/fresh API key/);
    await expect(e.worker("orders.cancel", { proposalId: p.id })).rejects.toMatchObject({ code: "RETIRED_AGENT" });
  });
  it("retires an API key whose observed registration expiry changes", async () => {
    const { e, v } = await setup({ execution: "autonomous" });
    await e.worker("account.read", {}); v.state.agents[0].validUntil++;
    await e.worker("account.read", {}); expect(e.status()).toMatchObject({ retired: true, paused: true });
  });
  it("does not release reservations for another cloid, nonterminal order or stale account source", async () => {
    const { e, v, db } = await setup({ execution: "autonomous" }); const p = await propose(e);
    await e.worker("trade.execute", { proposalId: p.id });
    vi.mocked(v.orderStatus).mockResolvedValue({ status: "order", order: { status: "filled", statusTimestamp: now, order: { cloid: cloid("another"), coin: "BTC" } } });
    await expect(e.worker("execution.reconcile", { proposalId: p.id })).rejects.toMatchObject({ code: "RECONCILIATION_MISMATCH" });
    vi.mocked(v.orderStatus).mockResolvedValue({ status: "order", order: { status: "open", statusTimestamp: now, order: { cloid: cloid(p.id), coin: "BTC" } } });
    expect(await e.worker("execution.reconcile", { proposalId: p.id })).toMatchObject({ blocked: true });
    vi.mocked(v.orderStatus).mockResolvedValue({ status: "order", order: { status: "filled", statusTimestamp: now + 1, order: { cloid: cloid(p.id), coin: "BTC" } } });
    expect(await e.worker("execution.reconcile", { proposalId: p.id })).toMatchObject({ blocked: true });
    expect(db.intent(p.id)?.status).toBe("pending");
  });
});

describe("process credentials and local key storage", () => {
  it("rotates only an offline retired key while preserving identities, mandates and audit history", () => {
    const directory = temp(), key = "55".repeat(32), keyPath = join(directory, "agent.encrypted.json");
    const old = loadAgent(keyPath, key), path = join(directory, "execution.sqlite"), s = new ExecutionStore(path);
    s.set("primary", Address.parse(primary.address)); s.set("trading", account); s.set("mandate", mandate()); s.event("fixture.history", { preserved: true }); s.set("retired", true); s.close();
    const child = spawnSync(process.execPath, ["scripts/rotate-connectivity-agent.mjs"], { encoding: "utf8", env: { ...process.env, PIP_SIGNER_DATA_DIR: directory, PIP_SIGNER_ENCRYPTION_KEY: key } });
    expect(child.status, child.stderr).toBe(0);
    expect(loadAgent(keyPath, key).address).not.toBe(old.address);
    expect(readdirSync(join(directory, "archive"))).toHaveLength(1);
    const reopened = store(path);
    expect(reopened.get("primary")).toBe(Address.parse(primary.address)); expect(reopened.get("trading")).toBe(account);
    expect(reopened.mandate()).toEqual(mandate()); expect(reopened.get("paused")).toBe(true); expect(reopened.get("retired")).toBe(false);
    expect(reopened.events().map(e => e.kind)).toEqual(["fixture.history", "agent.rotated"]);
  });
  it("encrypts the API key at rest and rejects tampering or the wrong encryption key", () => {
    const path = join(temp(), "agent.json"), key = "11".repeat(32);
    const a = loadAgent(path, key), b = loadAgent(path, key);
    expect(a.address).toBe(b.address);
    expect(readFileSync(path, "utf8")).not.toContain('privateKey');
    expect(() => loadAgent(path, "22".repeat(32))).toThrow();
    expect(() => loadAgent(path, "not-a-key")).toThrow();
  });
  it("keeps credentials out of model tools and rejects identity injection before network calls", async () => {
    const fetcher = vi.fn<typeof fetch>(); const client = new ExecutionToolClient({ token: "ab".repeat(32), fetcher });
    expect(JSON.stringify(client)).not.toContain("abababab");
    expect(JSON.stringify(client.tools)).not.toContain("token");
    await expect(client.invoke("withdraw3", {})).rejects.toThrow(/denied/);
    await expect(client.invoke("trade.propose", { ...order, account: primary.address })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(() => new ExecutionToolClient({ token: "ab".repeat(32), url: "https://attacker.example" })).toThrow(/loopback/);
  });
  it("separates worker/control credentials and rejects hostile origins, hosts and routes", async () => {
    const { e } = await setup();
    // Use a fixed, ephemeral-range local port and let the OS reject collisions.
    const port = 49152 + Math.floor(Math.random() * 10000), token = "ab".repeat(32), controlToken = "cd".repeat(32);
    const server = createSignerServer({ engine: e, workerToken: token, controlToken, webOrigin: "http://127.0.0.1:3000", port });
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const request = (path: string, credential: string, body: unknown, headers: Record<string, string> = {}) => fetch(url + path, { method: "POST", headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
    try {
      expect((await request("/control", token, { action: "pause" })).status).toBe(401);
      expect((await request("/worker", controlToken, { name: "execution.status", input: {} })).status).toBe(401);
      expect((await request("/control", controlToken, { action: "status" }, { Origin: "https://evil.example" })).status).toBe(403);
      expect((await request("/worker", token, { name: "execution.status", input: {} }, { Origin: "http://127.0.0.1:3000" })).status).toBe(403);
      const forgedHostStatus = await new Promise<number | undefined>((resolve, reject) => {
        const req = httpRequest(url + "/control", { method: "POST", headers: { Host: `evil.example:${port}`, Authorization: `Bearer ${controlToken}`, "Content-Type": "application/json" } }, res => { res.resume(); resolve(res.statusCode); });
        req.once("error", reject); req.end(JSON.stringify({ action: "status" }));
      });
      expect(forgedHostStatus).toBe(403);
      expect((await request("/worker", token, { name: "withdraw3", input: {} })).status).toBe(409);
      const client = new ExecutionToolClient({ token, url }); expect(await client.invoke("execution.status", {})).toMatchObject({ network: "testnet" });
    } finally { await new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }); }
  });
});

describe("real SDK wire contract with mock HTTP", () => {
  it("distinguishes a definitive rejection from ambiguous or mixed responses", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ status: "ok", response: { type: "order", data: { statuses: [{ error: "Order could not immediately match" }] } } }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const v = new HyperliquidTestnet(agent, () => now);
    await expect(v.order(proposal(), market, now + 5000)).rejects.toBeInstanceOf(VenueOrderRejected);
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ status: "err", response: "Invalid nonce" }), { headers: { "Content-Type": "application/json" } }));
    await expect(v.order(proposal(), market, now + 5000)).rejects.not.toBeInstanceOf(VenueOrderRejected);
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", response: { type: "order", data: { statuses: [{ error: "error" }, { filled: { totalSz: "0.001", avgPx: "50010", oid: 1 } }] } } }), { headers: { "Content-Type": "application/json" } }));
    await expect(v.order(proposal(), market, now + 5000)).rejects.not.toBeInstanceOf(VenueOrderRejected);
  });
  it("signs only an IOC order on testnet, with expiry and no builder or vault routing", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => new Response(JSON.stringify({ status: "ok", response: { type: "order", data: { statuses: [{ filled: { totalSz: "0.001", avgPx: "50010", oid: 1 } }] } } }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const v = new HyperliquidTestnet(agent, () => now);
    await v.order(proposal(), market, now + 5000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]; expect(String(url)).toBe("https://api.hyperliquid-testnet.xyz/exchange");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ action: { type: "order", grouping: "na", orders: [{ a: 0, b: true, p: "50010", s: "0.001", r: false, t: { limit: { tif: "Ioc" } }, c: cloid("proposal") }] }, nonce: now, expiresAfter: now + 5000 });
    expect(body.signature.r).toMatch(/^0x[0-9a-f]{64}$/); expect(body.vaultAddress).toBeUndefined(); expect(body.action.builder).toBeUndefined();
    expect(init?.redirect).toBe("error");
  });
  it("signs a recorded-order cancellation without adding account routing", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ status: "ok", response: { type: "cancel", data: { statuses: ["success"] } } }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const infoFetch = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ universe: [{ name: "BTC", szDecimals: 5, maxLeverage: 50 }] })));
    await new HyperliquidTestnet(agent, () => now, infoFetch).cancel(proposal(), now + 5000);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.action).toEqual({ type: "cancelByCloid", cancels: [{ asset: 0, cloid: cloid("proposal") }] });
    expect(body.vaultAddress).toBeUndefined();
  });
});

describe("complete, fresh account discovery", () => {
  function fixtures(options: { missingDex?: boolean; otherBalance?: string; spot?: string; twaps?: unknown[]; abstraction?: boolean; stale?: boolean } = {}) {
    const time = Date.now();
    const state = { time: options.stale ? time - 10001 : time, marginSummary: { accountValue: "0" }, withdrawable: "0", assetPositions: [] };
    const names = Array.from({ length: 272 }, (_, i) => `dex${i}`);
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const responses: Record<string, unknown> = { frontendOpenOrders: [], extraAgents: [], userAbstraction: "default", userRole: { role: "missing" },
        perpDexs: [null, ...names.map(name => ({ name }))], spotClearinghouseState: { balances: options.spot ? [{ total: options.spot }] : [] }, subAccounts: null, userDexAbstraction: options.abstraction ?? null };
      if (!(request.type in responses)) throw new Error("Unexpected venue read");
      return new Response(JSON.stringify(responses[request.type]));
    });
    const streams = vi.fn(async (user: `0x${string}`) => ({ allDexs: { user, clearinghouseStates: [["", state], ...names.slice(options.missingDex ? 1 : 0).map((name, i) => [name, { ...state, marginSummary: { accountValue: i === 0 ? options.otherBalance ?? "0" : "0" } }])] },
      twaps: { user, dex: "", states: options.twaps ?? [] } }));
    return { fetcher, streams };
  }
  it("reads an empty account across hundreds of DEXs without pretending it is funded", async () => {
    const f = fixtures(), v = new HyperliquidTestnet(agent, () => now, f.fetcher, f.streams);
    expect(await v.snapshot(account)).toMatchObject({ account, equityUsd: "0", withdrawableUsd: "0", positions: [], openOrders: [], role: "missing", unsupportedExposure: false });
    expect(f.fetcher).toHaveBeenCalledTimes(8);
    for (const call of f.fetcher.mock.calls) {
      expect(String(call[0])).toBe("https://api.hyperliquid-testnet.xyz/info");
      expect(JSON.parse(String(call[1]?.body)).user ?? account).toBe(account);
    }
  });
  it.each([{ otherBalance: "1" }, { spot: "1" }, { twaps: [[1, {}]] }, { abstraction: true }])("flags unsupported capital or future orders: %j", async options => {
    const f = fixtures(options);
    expect((await new HyperliquidTestnet(agent, () => now, f.fetcher, f.streams).snapshot(account)).unsupportedExposure).toBe(true);
  });
  it("fails closed for incomplete registry coverage, stale source state or an unavailable read", async () => {
    for (const [options, code] of [[{ missingDex: true }, "INCOMPLETE_ACCOUNT"], [{ stale: true }, "STALE_STATE"]] as const) {
      const f = fixtures(options);
      await expect(new HyperliquidTestnet(agent, () => now, f.fetcher, f.streams).snapshot(account)).rejects.toMatchObject({ code });
    }
    const f = fixtures(); f.fetcher.mockRejectedValueOnce(new Error("offline"));
    await expect(new HyperliquidTestnet(agent, () => now, f.fetcher, f.streams).snapshot(account)).rejects.toThrow("offline");
  });
  it("waits for both socket snapshots, verifies account identity and fails on disconnect", async () => {
    class Socket extends EventTarget { send = vi.fn(); close = vi.fn(); }
    const socket = new Socket(), pending = readAccountStreams(account, () => socket as unknown as WebSocket);
    socket.dispatchEvent(new Event("open")); expect(socket.send).toHaveBeenCalledTimes(2);
    const emit = (target: Socket, channel: string, data: unknown) => target.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ channel, data }) }));
    emit(socket, "allDexsClearinghouseState", { user: account, clearinghouseStates: [] });
    expect(socket.close).not.toHaveBeenCalled();
    emit(socket, "twapStates", { user: account, states: [], dex: "" });
    await expect(pending).resolves.toHaveProperty("allDexs"); expect(socket.close).toHaveBeenCalledOnce();
    const wrong = new Socket(), wrongResult = readAccountStreams(account, () => wrong as unknown as WebSocket);
    emit(wrong, "allDexsClearinghouseState", { user: primary.address, clearinghouseStates: [] });
    await expect(wrongResult).rejects.toMatchObject({ code: "INVALID_ACCOUNT_STREAM" });
    const closed = new Socket(), closedResult = readAccountStreams(account, () => closed as unknown as WebSocket);
    closed.dispatchEvent(new Event("close")); await expect(closedResult).rejects.toMatchObject({ code: "ACCOUNT_STREAM_FAILED" });
  });
});
