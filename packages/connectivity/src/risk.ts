import { Decimal } from "decimal.js";
import { deny, type Market, type Mandate, type Proposal, type Snapshot } from "./contracts.ts";

const D = (s: string) => new Decimal(s);
export function checkTrade(p: Proposal, m: Mandate, s: Snapshot, market: Market, now: number, dailyTurnover: string) {
  if (p.network !== "testnet" || m.network !== "testnet" || s.network !== "testnet") deny("NETWORK_DENIED", "Only testnet execution is supported.");
  if (m.account === m.agent || p.account !== m.account || s.account !== m.account || p.agent !== m.agent || p.mandateId !== m.id || p.mandateVersion !== m.version) deny("AUTHORITY_MISMATCH", "Proposal, mandate, account and separate agent must match exactly.");
  if (p.expiresAt <= now || m.expiresAt <= now) deny("EXPIRED", "Proposal or mandate expired.");
  if (s.startedAt > s.observedAt || s.observedAt > now || now - s.startedAt > 10_000) deny("STALE_STATE", "Refresh account state immediately before execution.");
  if (s.sourceTime > now + 1000 || now - s.sourceTime > 10_000) deny("STALE_STATE", "Venue account state is stale.");
  if (market.quotedAt > now + 1000 || now - market.quotedAt > 5000) deny("STALE_QUOTE", "Refresh market quotes immediately before execution.");
  if (!["disabled", "default"].includes(s.accountMode) || s.role !== "user" || s.unsupportedExposure) deny("UNSUPPORTED_ACCOUNT", "Execution requires a standalone standard account without unsupported exposure.");
  const agent = s.agents.find(a => a.address.toLowerCase() === m.agent);
  if (!agent || agent.validUntil <= now || agent.validUntil < m.expiresAt) deny("AGENT_NOT_APPROVED", "Approve this agent through the mandate expiry in the trading wallet.");
  if (!m.allowedSymbols.includes(p.order.symbol) || market.symbol !== p.order.symbol) deny("MARKET_DENIED", "Market is outside the signed mandate.");
  const { order: o } = p;
  const size = D(o.size), price = D(o.limitPrice), mark = D(market.mark);
  if (size.decimalPlaces() > market.szDecimals) deny("SIZE_INCREMENT", "Size does not match venue increments.");
  if (price.decimalPlaces() > Math.max(0, 6 - market.szDecimals) || (!price.isInteger() && price.sd() > 5)) deny("PRICE_INCREMENT", "Price does not match venue increments.");
  const reference = D(o.side === "buy" ? market.ask : market.bid);
  const deviation = Decimal.max(price.div(reference).minus(1).abs(), price.div(mark).minus(1).abs()).mul(10_000);
  if (deviation.gt(m.maxSlippageBps)) deny("PRICE_LIMIT", "Limit price is too far from the current book or mark.");
  const notional = size.mul(Decimal.max(price, mark));
  if (notional.lt(10) || notional.gt(m.maxOrderUsd)) deny("ORDER_LIMIT", "Order is below venue minimum or above mandate size.");
  if (D(dailyTurnover).add(notional).gt(m.maxDailyTurnoverUsd)) deny("TURNOVER_LIMIT", "Daily order allowance is exhausted.");
  if (s.positions.some(pos => pos.leverage > m.maxLeverage || !m.allowedSymbols.includes(pos.symbol))) deny("EXISTING_RISK", "Existing positions violate this mandate.");
  // IOC only. Existing resting orders must be cleared before increasing or reducing risk;
  // do not guess at remaining quantity, collateral holds or netting across orders.
  if (s.openOrders.length) deny("OPEN_ORDERS", "Cancel and reconcile existing orders before submitting another trade.");
  const current = s.positions.find(pos => pos.symbol === o.symbol);
  const signedSize = o.side === "buy" ? size : size.neg();
  const currentSize = D(current?.size ?? "0"), projected = currentSize.add(signedSize);
  if (o.reduceOnly && (currentSize.isZero() || currentSize.mul(signedSize).gte(0) || size.gt(currentSize.abs()))) deny("REDUCE_ONLY", "A reduce-only order must strictly reduce the existing position without crossing zero.");
  if (market.accountLeverage > m.maxLeverage || market.accountLeverage > market.maxLeverage) deny("VENUE_LEVERAGE", "Use the trading wallet to lower this market's leverage before authorizing a trade.");
  const projectedPosition = projected.abs().mul(Decimal.max(price, mark));
  const otherGross = s.positions.filter(pos => pos.symbol !== o.symbol).reduce((sum, pos) => sum.add(pos.notionalUsd), D("0"));
  const gross = otherGross.add(projectedPosition);
  if (!o.reduceOnly) {
    if (D(s.equityUsd).lt(m.minEquityUsd)) deny("EQUITY_PAUSE", "Equity is below the user-approved pause threshold.");
    if (projectedPosition.gt(m.maxPositionUsd) || gross.gt(m.maxGrossUsd) || gross.gt(D(s.equityUsd).mul(m.maxLeverage))) deny("EXPOSURE_LIMIT", "Projected exposure exceeds the signed mandate.");
    // Conservative availability check, including a 1% execution/fee cushion.
    if (notional.div(m.maxLeverage).mul("1.01").gt(s.withdrawableUsd)) deny("COLLATERAL_LIMIT", "Insufficient uncommitted collateral for this order.");
  }
  return { notional: notional.toFixed(), projectedGrossUsd: gross.toFixed() };
}
