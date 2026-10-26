import { HttpTransport, ExchangeClient } from "@nktkas/hyperliquid";
import type { PrivateKeyAccount } from "viem";
import { z } from "zod";
import { Decimal } from "decimal.js";
import { Address, DecimalString, PositiveDecimal, cloid, deny, type Market, type Proposal, type Snapshot } from "./contracts.ts";
import { readAccountStreams } from "./account-stream.ts";
import { ApiRequestError } from "@nktkas/hyperliquid/api/exchange";

export class VenueOrderRejected extends Error {
  constructor() { super("Hyperliquid explicitly rejected this single order; no fill was reported."); this.name = "VenueOrderRejected"; }
}

export interface TradingVenue {
  readonly agentAddress: `0x${string}`;
  snapshot(account: `0x${string}`): Promise<Snapshot>;
  market(symbol: string, account: `0x${string}`): Promise<Market>;
  markets(): Promise<{ symbol: string; asset: number; szDecimals: number; maxLeverage: number }[]>;
  order(proposal: Proposal, market: Market, expiresAfter: number): Promise<unknown>;
  cancel(proposal: Proposal, expiresAfter: number): Promise<unknown>;
  orderStatus(account: `0x${string}`, orderId: `0x${string}`): Promise<unknown>;
}
const SignedDecimal = z.string().max(45).regex(/^-?(0|[1-9]\d*)(\.\d+)?$/);
const StateSchema = z.object({
  time: z.number().int().positive(),
  marginSummary: z.object({ accountValue: SignedDecimal }), withdrawable: DecimalString,
  assetPositions: z.array(z.object({ position: z.object({ coin: z.string(), szi: SignedDecimal, positionValue: DecimalString,
    leverage: z.object({ type: z.string(), value: z.number().int().positive() }) }) })),
});
const OrdersSchema = z.array(z.object({ oid: z.number().int().nonnegative(), cloid: z.string().nullable().optional(), coin: z.string(),
  sz: DecimalString, limitPx: PositiveDecimal, side: z.enum(["B", "A"]), reduceOnly: z.boolean() }));
const MetaSchema = z.object({ universe: z.array(z.object({ name: z.string(), szDecimals: z.number().int().min(0).max(6),
  maxLeverage: z.number().int().positive(), isDelisted: z.boolean().optional() })) });

export class HyperliquidTestnet implements TradingVenue {
  readonly agentAddress: `0x${string}`;
  #exchange: ExchangeClient;
  #fetch: typeof fetch;
  #readStreams: typeof readAccountStreams;
  constructor(agent: PrivateKeyAccount, nextNonce: () => number, fetcher: typeof fetch = fetch, streams: typeof readAccountStreams = readAccountStreams) {
    this.agentAddress = Address.parse(agent.address);
    this.#fetch = fetcher;
    this.#readStreams = streams;
    // There is deliberately no configurable exchange URL or mainnet switch.
    this.#exchange = new ExchangeClient({ wallet: agent, transport: new HttpTransport({ isTestnet: true, timeout: 8000, fetchOptions: { redirect: "error" } }), nonceManager: nextNonce });
  }
  async #info(body: object): Promise<unknown> {
    const response = await this.#fetch("https://api.hyperliquid-testnet.xyz/info", { method: "POST", redirect: "error",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    if (!response.ok) deny("VENUE_UNAVAILABLE", "Hyperliquid account or market read failed.");
    const raw = await response.text();
    if (Buffer.byteLength(raw) > 2_000_000) deny("VENUE_RESPONSE_LIMIT", "Venue response exceeded the read limit.");
    return JSON.parse(raw);
  }
  async markets() {
    const meta = MetaSchema.parse(await this.#info({ type: "meta" }));
    return meta.universe.flatMap((m, asset) => m.isDelisted ? [] : [{ symbol: m.name, asset, szDecimals: m.szDecimals, maxLeverage: m.maxLeverage }]);
  }
  async market(symbol: string, account: `0x${string}`): Promise<Market> {
    const [raw, book, activeRaw] = await Promise.all([
      this.#info({ type: "metaAndAssetCtxs" }), this.#info({ type: "l2Book", coin: symbol }),
      this.#info({ type: "activeAssetData", coin: symbol, user: account }),
    ]);
    const [meta, contexts] = z.tuple([MetaSchema, z.array(z.object({ markPx: PositiveDecimal }))]).parse(raw);
    if (meta.universe.length !== contexts.length) deny("INVALID_MARKET", "Metadata and marks disagree.");
    const asset = meta.universe.findIndex(m => m.name === symbol && !m.isDelisted);
    if (asset < 0) deny("UNSUPPORTED_MARKET", "Only active core perpetual markets are supported in this version.");
    const parsed = z.object({ coin: z.string(), time: z.number().int(), levels: z.tuple([
      z.array(z.object({ px: PositiveDecimal })), z.array(z.object({ px: PositiveDecimal })),
    ]) }).parse(book);
    if (parsed.coin !== symbol || Date.now() - parsed.time > 5000 || parsed.time > Date.now() + 1000 || !parsed.levels[0][0] || !parsed.levels[1][0]) deny("STALE_BOOK", "Fresh bid and ask quotes are required.");
    const bid = parsed.levels[0][0].px, ask = parsed.levels[1][0].px;
    if (new Decimal(bid).gt(ask)) deny("INVALID_BOOK", "Crossed market book.");
    const active = z.object({ user: Address, coin: z.string(), leverage: z.object({ value: z.number().int().positive() }) }).parse(activeRaw);
    if (active.user !== account || active.coin !== symbol) deny("ACCOUNT_MISMATCH", "Venue leverage response does not match the trading account.");
    return { symbol, asset, szDecimals: meta.universe[asset].szDecimals, maxLeverage: meta.universe[asset].maxLeverage, accountLeverage: active.leverage.value, quotedAt: parsed.time, mark: contexts[asset].markPx, bid, ask };
  }
  async snapshot(account: `0x${string}`): Promise<Snapshot> {
    const user = Address.parse(account), startedAt = Date.now();
    const [stream, ordersRaw, agentsRaw, modeRaw, roleRaw, dexRaw, spotRaw, subsRaw, abstractionRaw] = await Promise.all([
      this.#readStreams(user), this.#info({ type: "frontendOpenOrders", user }),
      this.#info({ type: "extraAgents", user }), this.#info({ type: "userAbstraction", user }),
      this.#info({ type: "userRole", user }), this.#info({ type: "perpDexs" }),
      this.#info({ type: "spotClearinghouseState", user }), this.#info({ type: "subAccounts", user }),
      this.#info({ type: "userDexAbstraction", user }),
    ]);
    const allDexs = z.object({ user: Address, clearinghouseStates: z.array(z.tuple([z.string(), StateSchema])).max(1024) }).parse(stream.allDexs);
    const twaps = z.object({ user: Address, dex: z.literal(""), states: z.array(z.unknown()) }).parse(stream.twaps);
    if (allDexs.user !== user || twaps.user !== user) deny("ACCOUNT_MISMATCH", "Account streams do not match the trading wallet.");
    const state = allDexs.clearinghouseStates.find(([dex]) => dex === "")?.[1] ?? deny("INCOMPLETE_ACCOUNT", "Default account state is missing.");
    const orders = OrdersSchema.parse(ordersRaw);
    const dexes = z.array(z.object({ name: z.string() }).nullable()).parse(dexRaw).filter(d => d && d.name !== "");
    // Require full registry coverage. Never truncate undiscovered or stale collateral pools.
    const expected = new Set(["", ...dexes.map(d => d!.name)]), seen = new Set(allDexs.clearinghouseStates.map(([dex]) => dex));
    if (seen.size !== allDexs.clearinghouseStates.length || expected.size !== seen.size || [...expected].some(d => !seen.has(d))) deny("INCOMPLETE_ACCOUNT", "DEX discovery and account snapshot disagree; refresh before trading.");
    const subs = z.array(z.unknown()).nullable().parse(subsRaw);
    let unsupportedExposure = (subs?.length ?? 0) > 0 || twaps.states.length > 0 || z.boolean().nullable().parse(abstractionRaw) === true;
    const spot = z.object({ balances: z.array(z.object({ total: DecimalString })) }).parse(spotRaw);
    unsupportedExposure ||= spot.balances.some(b => !new Decimal(b.total).isZero());
    for (const [dex, other] of allDexs.clearinghouseStates) {
      if (Date.now() - other.time > 10_000 || other.time > Date.now() + 1000) deny("STALE_STATE", "Venue account state is stale.");
      if (dex !== "") unsupportedExposure ||= other.assetPositions.some(p => !new Decimal(p.position.szi).isZero()) || !new Decimal(other.marginSummary.accountValue).isZero();
    }
    return { account: user, network: "testnet", startedAt, observedAt: Date.now(), sourceTime: state.time,
      role: z.object({ role: z.string() }).parse(roleRaw).role,
      accountMode: z.enum(["disabled", "default", "unifiedAccount", "portfolioMargin"]).parse(modeRaw),
      equityUsd: state.marginSummary.accountValue, withdrawableUsd: state.withdrawable,
      positions: state.assetPositions.map(({ position: p }) => ({ symbol: p.coin, size: p.szi, notionalUsd: p.positionValue, leverage: p.leverage.value, marginMode: p.leverage.type })),
      openOrders: orders.map(o => ({ oid: o.oid, cloid: o.cloid ?? null, symbol: o.coin, size: o.sz, limitPrice: o.limitPx, side: o.side === "B" ? "buy" : "sell", reduceOnly: o.reduceOnly })),
      agents: z.array(z.object({ address: Address, name: z.string(), validUntil: z.number().int().nullable() })).parse(agentsRaw).map(a => ({ ...a, validUntil: a.validUntil ?? 0 })), unsupportedExposure };
  }
  async order(proposal: Proposal, market: Market, expiresAfter: number) {
    // Market/index comes only from the server's fresh metadata read, never tool arguments.
    try {
      return await this.#exchange.order({ orders: [{ a: market.asset, b: proposal.order.side === "buy", p: proposal.order.limitPrice, s: proposal.order.size,
        r: proposal.order.reduceOnly, t: { limit: { tif: "Ioc" } }, c: cloid(proposal.id) }], grouping: "na" }, { expiresAfter, signal: AbortSignal.timeout(8000) });
    } catch (e) {
      // Only this exact one-order, all-rejected response is definitive. Transport,
      // signature/nonce errors, malformed responses or mixed statuses stay uncertain.
      const rejection = z.object({ status: z.literal("ok"), response: z.object({ type: z.literal("order"), data: z.object({
        statuses: z.tuple([z.object({ error: z.string().max(1000) }).strict()]),
      }).strict() }).strict() }).strict();
      if (e instanceof ApiRequestError && rejection.safeParse(e.response).success) throw new VenueOrderRejected();
      throw e;
    }
  }
  async cancel(proposal: Proposal, expiresAfter: number) {
    const market = (await this.markets()).find(m => m.symbol === proposal.order.symbol);
    if (!market) deny("UNSUPPORTED_MARKET", "Market is unavailable.");
    return this.#exchange.cancelByCloid({ cancels: [{ asset: market.asset, cloid: cloid(proposal.id) }] }, { expiresAfter, signal: AbortSignal.timeout(8000) });
  }
  orderStatus(account: `0x${string}`, orderId: `0x${string}`) { return this.#info({ type: "orderStatus", user: account, oid: orderId }); }
}
