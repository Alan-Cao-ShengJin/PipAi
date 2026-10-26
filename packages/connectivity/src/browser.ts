import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { arbitrumSepolia } from "viem/chains";

// Browser-only owner operations. No key material is requested or exported.
export async function approvePipAgent(provider: EIP1193Provider, account: `0x${string}`, agent: `0x${string}`, validUntil: number) {
  if (account.toLowerCase() === agent.toLowerCase()) throw new Error("Owner and API wallet must differ.");
  if (validUntil <= Date.now() || validUntil > Date.now() + 86_400_000) throw new Error("Choose an approval expiry within 24 hours.");
  await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x66eee" }] });
  const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: custom(provider) });
  const client = new ExchangeClient({ wallet, transport: new HttpTransport({ isTestnet: true, timeout: 8000, fetchOptions: { redirect: "error" } }), signatureChainId: "0x66eee" });
  return client.approveAgent({ agentAddress: agent, agentName: `Pip valid_until ${validUntil}` });
}

export async function revokePipAgent(provider: EIP1193Provider, account: `0x${string}`) {
  await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x66eee" }] });
  const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: custom(provider) });
  const client = new ExchangeClient({ wallet, transport: new HttpTransport({ isTestnet: true, timeout: 8000, fetchOptions: { redirect: "error" } }), signatureChainId: "0x66eee" });
  // The matching named agent is deregistered; the retired key must never be reused.
  return client.approveAgent({ agentAddress: "0x0000000000000000000000000000000000000000", agentName: "Pip" });
}
