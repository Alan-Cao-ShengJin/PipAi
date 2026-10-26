import { z } from "zod";

export const MainnetAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(value => value.toLowerCase());
export const AccountDecimal = z.string().max(80).regex(/^-?\d+(?:\.\d+)?$/);
export const MainnetAccount = z.object({
  account: MainnetAddress, network: z.literal("mainnet"), access: z.literal("read-only"),
  startedAt: z.number().finite(), observedAt: z.number().finite(), sourceTime: z.number().finite(),
  corePerpsEquityUsd: AccountDecimal, corePerpsPositions: z.number().int().nonnegative(),
  coreAndSpotOpenOrders: z.number().int().nonnegative(),
  spotBalances: z.array(z.object({ coin: z.string().max(80), total: AccountDecimal })).max(10_000),
});
export type MainnetAccount = z.infer<typeof MainnetAccount>;
