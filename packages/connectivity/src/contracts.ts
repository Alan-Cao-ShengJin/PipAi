import { z } from "zod";
import { createHash } from "node:crypto";

export const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(v => v.toLowerCase() as `0x${string}`);
export const DecimalString = z.string().max(40).regex(/^(0|[1-9]\d*)(\.\d+)?$/);
export const PositiveDecimal = DecimalString.refine(v => /[1-9]/.test(v), "Must be positive");
export const Id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const MandateSchema = z.object({
  id: Id, version: z.number().int().positive(), network: z.literal("testnet"),
  account: Address, agent: Address, expiresAt: z.number().int().positive(),
  execution: z.enum(["per-order", "autonomous"]),
  allowedSymbols: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,30}$/)).min(1).max(20),
  maxOrderUsd: PositiveDecimal, maxGrossUsd: PositiveDecimal, maxPositionUsd: PositiveDecimal,
  minEquityUsd: PositiveDecimal, maxLeverage: z.number().int().min(1).max(3),
  maxSlippageBps: z.number().int().min(1).max(100), maxDailyTurnoverUsd: PositiveDecimal,
  // Signed disclosure of account separation; an existing owner account may be used.
  dedicatedAccount: z.boolean(),
}).strict();
export type Mandate = z.infer<typeof MandateSchema>;
export const OrderSchema = z.object({
  symbol: z.string().regex(/^[A-Za-z0-9_-]{1,30}$/), side: z.enum(["buy", "sell"]),
  size: PositiveDecimal, limitPrice: PositiveDecimal, reduceOnly: z.boolean(),
}).strict();
export type TradeOrder = z.infer<typeof OrderSchema>;
export const ProposalSchema = z.object({
  id: Id, mandateId: Id, mandateVersion: z.number().int().positive(),
  account: Address, agent: Address, network: z.literal("testnet"),
  order: OrderSchema, expiresAt: z.number().int().positive(),
}).strict();
export type Proposal = z.infer<typeof ProposalSchema>;
export type Market = { symbol: string; asset: number; szDecimals: number; maxLeverage: number; accountLeverage: number; quotedAt: number; mark: string; bid: string; ask: string };
export type Snapshot = {
  account: `0x${string}`; network: "testnet"; observedAt: number; startedAt: number; sourceTime: number;
  accountMode: string; role: string; equityUsd: string; withdrawableUsd: string;
  positions: { symbol: string; size: string; notionalUsd: string; leverage: number; marginMode: string }[];
  openOrders: { oid: number; cloid: string | null; symbol: string; size: string; limitPrice: string; side: "buy" | "sell"; reduceOnly: boolean }[];
  agents: { address: string; name: string; validUntil: number }[];
  unsupportedExposure: boolean;
};
export class ConnectivityError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = "ConnectivityError"; }
}
export function deny(code: string, message: string): never { throw new ConnectivityError(code, message); }
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function hash(value: unknown) { return createHash("sha256").update(canonical(value)).digest("hex"); }
export function cloid(id: string) { return `0x${hash(id).slice(0, 32)}` as `0x${string}`; }
