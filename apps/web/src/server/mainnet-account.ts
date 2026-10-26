import { z } from "zod";
import { AccountDecimal, MainnetAccount, MainnetAddress } from "../components/mainnet-account";

const Core = z.object({ marginSummary: z.object({ accountValue: AccountDecimal }),
  assetPositions: z.array(z.object({ position: z.object({ szi: AccountDecimal }) })).max(10_000), time: z.number().finite() });
const Spot = z.object({ balances: z.array(z.object({ coin: z.string().max(80), total: AccountDecimal })).max(10_000) });
const Orders = z.array(z.object({ oid: z.number().int().nonnegative(), coin: z.string().max(80) })).max(10_000);

// Public information only. There is deliberately no exchange client, signer,
// private key, approval or caller-selected URL/action in this mainnet adapter.
export async function readMainnetAccount(address: string, fetcher: typeof fetch = fetch, now = Date.now): Promise<MainnetAccount> {
  const user = MainnetAddress.parse(address), startedAt = now();
  async function info(type: "clearinghouseState" | "spotClearinghouseState" | "openOrders") {
    const response = await fetcher("https://api.hyperliquid.xyz/info", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, user }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || !response.body) throw new Error("Mainnet account read failed");
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2_000_000) throw new Error("Mainnet response too large");
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  }
  const [coreRaw, spotRaw, ordersRaw] = await Promise.all([
    info("clearinghouseState"), info("spotClearinghouseState"), info("openOrders"),
  ]);
  const core = Core.parse(coreRaw), spot = Spot.parse(spotRaw), orders = Orders.parse(ordersRaw), observedAt = now();
  if (startedAt > observedAt || observedAt - startedAt > 10_000 || core.time > observedAt + 1000 || observedAt - core.time > 10_000) throw new Error("Stale mainnet data");
  return MainnetAccount.parse({ account: user, network: "mainnet", access: "read-only", startedAt, observedAt, sourceTime: core.time,
    corePerpsEquityUsd: core.marginSummary.accountValue,
    corePerpsPositions: core.assetPositions.filter(p => !/^-?0(?:\.0+)?$/.test(p.position.szi)).length,
    coreAndSpotOpenOrders: orders.length,
    spotBalances: spot.balances.filter(b => !/^-?0(?:\.0+)?$/.test(b.total)).map(({ coin, total }) => ({ coin, total })),
  });
}
