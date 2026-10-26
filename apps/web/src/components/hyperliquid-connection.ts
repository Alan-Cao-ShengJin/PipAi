import { z } from "zod";
import { MainnetAccount, MainnetAddress } from "./mainnet-account";

const Session = z.discriminatedUnion("connected", [z.object({ connected: z.literal(false) }),
  z.object({ connected: z.literal(true), address: MainnetAddress })]);

export type HyperliquidConnection = {
  state: "checking" | "needs-wallet" | "connected" | "unavailable";
  label: string; detail: string; validUntil?: number; account?: MainnetAccount;
};
export const checkingHyperliquid: HyperliquidConnection = { state: "checking", label: "Checking Hyperliquid", detail: "Checking your Hyperliquid mainnet account. Read only." };
export const unavailableHyperliquid: HyperliquidConnection = { state: "unavailable", label: "Check Hyperliquid", detail: "Mainnet account data could not be verified. Try checking again." };

// A successful owner-account read verifies data access, not trading authority.
// No trading-account link, API agent approval, chain switch or signature is needed.
export async function readHyperliquidConnection(request: (body?: object) => Promise<unknown>, now = Date.now): Promise<HyperliquidConnection> {
  try {
    const session = Session.parse(await request());
    if (!session.connected) return { state: "needs-wallet", label: "Connect Hyperliquid", detail: "Connect your wallet to read its Hyperliquid mainnet account." };
    const account = z.object({ result: MainnetAccount }).parse(await request({ action: "mainnet.account.read" })).result;
    const current = Session.parse(await request()), checkedAt = now();
    if (!current.connected || current.address !== session.address || account.account !== session.address
      || account.startedAt > account.observedAt || account.observedAt > checkedAt + 1000 || checkedAt - account.startedAt > 10_000
      || account.sourceTime > checkedAt + 1000 || checkedAt - account.sourceTime > 10_000) return unavailableHyperliquid;
    return { state: "connected", label: "Hyperliquid connected", detail: "Mainnet account data verified. Read only: trading and withdrawals are unavailable.", validUntil: checkedAt + 30_000, account };
  } catch { return unavailableHyperliquid; }
}
