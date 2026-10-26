import { createWalletClient, custom, type EIP1193Provider } from "viem";

export type WalletStatus = {
  network: string; armed: boolean; paused: boolean; retired: boolean; agentRegistered: boolean; authorityExpired: boolean;
  primary: string | null; trading: string | null; agent: `0x${string}`;
  mandate: { version: number; expiresAt: number } | null;
  proposals: { id: string; expiresAt: number; approved: boolean; order: { symbol: string; side: string; size: string; limitPrice: string } }[];
  intents: { id: string; status: string }[];
};
export type WalletState = { connected: false } | { connected: true; address: string; status: WalletStatus };
export type WalletChallenge = { id: string; address: `0x${string}`; message: string; payload?: unknown };
type Injected = EIP1193Provider & { isMetaMask?: boolean; providers?: Injected[] };
type Announcement = { info: { uuid: string; name: string; rdns: string }; provider: EIP1193Provider };
const discovered = new Map<string, Announcement>();

export function discoverBrowserWallets() {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<Announcement>).detail;
    if (detail?.info && typeof detail.info.uuid === "string" && typeof detail.info.rdns === "string" && typeof detail.provider?.request === "function") discovered.set(detail.info.uuid, detail);
  };
  window.addEventListener("eip6963:announceProvider", listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", listener);
}
export function browserWallet(): EIP1193Provider {
  const announced = [...discovered.values()];
  const injected = (window as unknown as { ethereum?: Injected }).ethereum;
  const provider = announced.find(a => a.info.rdns === "io.metamask")?.provider ?? announced[0]?.provider
    ?? injected?.providers?.find(p => p.isMetaMask) ?? injected?.providers?.[0] ?? injected;
  if (!provider) throw new Error("Install or unlock MetaMask or another browser wallet, then try again.");
  return provider;
}
export async function walletRequest<T>(body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/v1/wallet", { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
    signal, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Wallet connection could not be completed.");
  return data as T;
}
export async function selectedWallet(provider = browserWallet()): Promise<`0x${string}`> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts[0]) throw new Error("Choose an account in your wallet.");
  return accounts[0].toLowerCase() as `0x${string}`;
}
export async function signWalletChallenge(challenge: WalletChallenge, provider = browserWallet()) {
  const accounts = await provider.request({ method: "eth_accounts" });
  if (accounts[0]?.toLowerCase() !== challenge.address.toLowerCase()) throw new Error("Select the requested account in your wallet, then try again.");
  return createWalletClient({ transport: custom(provider) }).signMessage({ account: challenge.address, message: challenge.message });
}
export function walletError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === 4001 || (error instanceof Error && /User rejected|User denied/i.test(error.message))) return "Connection cancelled. You can try again whenever you’re ready.";
  if (code === -32002) return "A request is already open in your wallet. Open the extension to continue.";
  // viem errors can include complete RPC parameters. Do not surface those details.
  if (error instanceof Error && error.name !== "Error") return "Confirm the request in your wallet, or try connecting again.";
  return error instanceof Error ? error.message : "Wallet connection could not be completed.";
}
export async function connectBrowserWallet(): Promise<WalletState> {
  const provider = browserWallet(), address = await selectedWallet(provider);
  const { result } = await walletRequest<{ result: WalletChallenge }>({ action: "challenge", address });
  const signature = await signWalletChallenge(result, provider);
  return walletRequest<WalletState>({ action: "connect", challengeId: result.id, signature });
}

export async function linkHyperliquidAccount(): Promise<WalletStatus> {
  const provider = browserWallet(), address = await selectedWallet(provider);
  const { result } = await walletRequest<{ result: WalletChallenge }>({ action: "authorize", input: { kind: "link-trading", address } });
  const signature = await signWalletChallenge(result, provider);
  return (await walletRequest<{ result: WalletStatus }>({ action: "prove", challengeId: result.id, signature })).result;
}
