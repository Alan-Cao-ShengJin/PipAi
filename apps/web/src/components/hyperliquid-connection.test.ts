import { describe, expect, it, vi } from "vitest";
import { readHyperliquidConnection } from "./hyperliquid-connection";

const now = 1_800_000_000_000, owner = "0x1111111111111111111111111111111111111111";
function fixture() {
  const session = { connected: true, address: owner, status: { network: "testnet", trading: null, retired: true, armed: false, paused: true } };
  const account = { account: owner, network: "mainnet", access: "read-only", startedAt: now - 1000, observedAt: now - 100, sourceTime: now - 100,
    corePerpsEquityUsd: "0", corePerpsPositions: 0, coreAndSpotOpenOrders: 0, spotBalances: [] };
  const request = vi.fn(async (body?: object): Promise<unknown> => body ? { result: account } : structuredClone(session));
  return { session, account, request, read: () => readHyperliquidConnection(request, () => now) };
}
describe("mainnet read-only connection indicator", () => {
  it("requires wallet sign-in before reading the venue", async () => {
    const request = vi.fn(async () => ({ connected: false }));
    expect(await readHyperliquidConnection(request)).toMatchObject({ state: "needs-wallet" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("connects an empty owner account without a trading link, chain switch or API key approval", async () => {
    const f = fixture();
    expect(await f.read()).toMatchObject({ state: "connected", validUntil: now + 30_000, detail: expect.stringContaining("Read only"), account: { network: "mainnet", corePerpsEquityUsd: "0" } });
    expect(f.request.mock.calls.map(([body]) => body)).toEqual([undefined, { action: "mainnet.account.read" }, undefined]);
    expect(f.session.status).toMatchObject({ trading: null, armed: false, paused: true });
  });
  it.each(["stale-source", "stale-fetch", "future-source", "future-fetch", "reversed-times", "wrong-account", "wrong-network", "write-access", "malformed-balance"])("never shows connected for %s", async kind => {
    const f = fixture();
    if (kind === "stale-source") f.account.sourceTime = now - 20_000;
    if (kind === "stale-fetch") f.account.startedAt = now - 20_000;
    if (kind === "future-source") f.account.sourceTime = now + 20_000;
    if (kind === "future-fetch") f.account.observedAt = now + 20_000;
    if (kind === "reversed-times") f.account.startedAt = now;
    if (kind === "wrong-account") f.account.account = "0x2222222222222222222222222222222222222222";
    if (kind === "wrong-network") f.account.network = "testnet";
    if (kind === "write-access") f.account.access = "trading";
    if (kind === "malformed-balance") f.account.corePerpsEquityUsd = "NaN";
    expect(await f.read()).toMatchObject({ state: "unavailable" });
  });
  it("drops verification if the session changes or disconnects during the read", async () => {
    for (const disconnect of [false, true]) {
      const f = fixture();
      f.request.mockImplementation(async body => {
        if (body) { if (disconnect) f.session.connected = false; else f.session.address = "0x2222222222222222222222222222222222222222"; return { result: f.account }; }
        return structuredClone(f.session);
      });
      expect(await f.read()).toMatchObject({ state: "unavailable" });
    }
  });
  it("fails closed without exposing upstream errors", async () => {
    const result = await readHyperliquidConnection(async () => { throw new Error("secret credential"); });
    expect(result.state).toBe("unavailable"); expect(JSON.stringify(result)).not.toContain("secret");
    expect(await readHyperliquidConnection(async () => ({ connected: true }))).toMatchObject({ state: "unavailable" });
  });
});
