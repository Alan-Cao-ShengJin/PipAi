import { describe, expect, it, vi } from "vitest";
import { readMainnetAccount } from "./mainnet-account";

const now = 1_800_000_000_000, account = "0x1111111111111111111111111111111111111111";
function fixture() {
  const data: Record<string, unknown> = {
    clearinghouseState: { marginSummary: { accountValue: "128.45" }, assetPositions: [{ position: { szi: "0.01" } }], time: now - 100 },
    spotClearinghouseState: { balances: [{ coin: "USDC", total: "10" }, { coin: "HYPE", total: "0.0" }] },
    openOrders: [{ oid: 123, coin: "BTC" }],
  };
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => Response.json(data[JSON.parse(String(init?.body)).type]));
  return { data, fetcher, read: () => readMainnetAccount(account, fetcher, () => now) };
}
describe("fixed mainnet public info reader", () => {
  it("reads only public mainnet info for the owner and labels the summary scope", async () => {
    const f = fixture();
    expect(await f.read()).toMatchObject({ network: "mainnet", access: "read-only", account, corePerpsEquityUsd: "128.45", corePerpsPositions: 1,
      coreAndSpotOpenOrders: 1, spotBalances: [{ coin: "USDC", total: "10" }] });
    expect(f.fetcher).toHaveBeenCalledTimes(3);
    for (const [url, init] of f.fetcher.mock.calls) {
      expect(url).toBe("https://api.hyperliquid.xyz/info");
      expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store", headers: { "Content-Type": "application/json" } });
      expect(JSON.parse(String(init?.body))).toMatchObject({ user: account });
      expect(Object.keys(JSON.parse(String(init?.body))).sort()).toEqual(["type", "user"]);
    }
    expect(f.fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).type).sort()).toEqual(["clearinghouseState", "openOrders", "spotClearinghouseState"]);
  });
  it.each(["stale", "future", "malformed", "missing", "upstream", "oversize"])("rejects %s data", async kind => {
    const f = fixture();
    if (kind === "stale") (f.data.clearinghouseState as { time: number }).time = now - 20_000;
    if (kind === "future") (f.data.clearinghouseState as { time: number }).time = now + 20_000;
    if (kind === "malformed") f.data.spotClearinghouseState = { balances: [{ coin: "USDC", total: "NaN" }] };
    if (kind === "missing") f.data.clearinghouseState = {};
    if (kind === "upstream") f.fetcher.mockResolvedValue(new Response("unavailable", { status: 503 }));
    if (kind === "oversize") f.fetcher.mockImplementation(async () => new Response("x".repeat(2_000_001)));
    await expect(f.read()).rejects.toThrow();
  });
  it("rejects invalid identities before making requests", async () => {
    const f = fixture();
    await expect(readMainnetAccount("https://evil.example", f.fetcher)).rejects.toThrow();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
});
