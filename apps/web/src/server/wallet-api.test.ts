import { afterEach, describe, expect, it, vi } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { EIP1193Provider } from "viem";
import { createWalletApi, type SignerControl } from "./wallet-api";
import { WalletSessions } from "./wallet-sessions";
import { ExecutionStore } from "../../../../packages/connectivity/src/store.ts";
import { ExecutionEngine } from "../../../../packages/connectivity/src/engine.ts";
import { Address } from "../../../../packages/connectivity/src/contracts.ts";
import type { TradingVenue } from "../../../../packages/connectivity/src/venue.ts";
import { connectBrowserWallet, discoverBrowserWallets, linkHyperliquidAccount, walletError } from "../components/browser-wallet";

const origin = "http://127.0.0.1:3000", url = origin + "/api/v1/wallet";
const primary = privateKeyToAccount(generatePrivateKey()), trading = privateKeyToAccount(generatePrivateKey()), outsider = privateKeyToAccount(generatePrivateKey());
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); vi.unstubAllGlobals(); });
function fixture() {
  const sessions = new WalletSessions(":memory:"), executions = new ExecutionStore(":memory:");
  cleanups.push(() => sessions.close(), () => executions.close());
  const engine = new ExecutionEngine({ store: executions, venue: { agentAddress: Address.parse(outsider.address) } as TradingVenue, origin });
  const signer = vi.fn<SignerControl>(async (action, input) => {
    if (action === "status") return engine.status();
    if (action === "challenge") return engine.challenge(input);
    if (action === "prove") return engine.prove(input);
    if (action === "pause") return engine.pause();
    throw new Error("Unexpected signer action");
  });
  const mainnetRead = vi.fn(async (address: string) => ({ account: address, network: "mainnet" as const, access: "read-only" as const,
    startedAt: Date.now(), observedAt: Date.now(), sourceTime: Date.now(), corePerpsEquityUsd: "0", corePerpsPositions: 0, coreAndSpotOpenOrders: 0, spotBalances: [] }));
  const handle = createWalletApi({ store: sessions, signer, origin, mainnetRead });
  const jars = new Map<string, Map<string, string>>();
  async function request(body?: object, browser = "alice", extra: Record<string, string> = {}) {
    const jar = jars.get(browser) ?? new Map<string, string>(); jars.set(browser, jar);
    const req = new Request(url, { method: body ? "POST" : "GET", headers: { ...(body ? { Origin: origin, "Content-Type": "application/json" } : {}), Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const response = await handle(req);
    for (const c of response.headers.getSetCookie()) { const [key, value] = c.split(";")[0].split("="); if (value) jar.set(key, value); else jar.delete(key); }
    return response;
  }
  async function login(wallet = primary, browser = "alice") {
    const response = await request({ action: "challenge", address: wallet.address }, browser);
    expect(response.status).toBe(200);
    const { result } = await response.json();
    const signature = await wallet.signMessage({ message: result.message });
    return request({ action: "connect", challengeId: result.id, signature }, browser);
  }
  return { sessions, executions, engine, signer, mainnetRead, handle, request, login, jars };
}

describe("one-button wallet authentication boundary", () => {
  it("reads mainnet for the signed-in owner without linking or approving a trading key", async () => {
    const f = fixture();
    expect((await f.request({ action: "mainnet.account.read" })).status).toBe(401);
    expect(f.mainnetRead).not.toHaveBeenCalled();
    await f.login(); f.signer.mockClear();
    const response = await f.request({ action: "mainnet.account.read" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { network: "mainnet", access: "read-only", account: primary.address.toLowerCase() } });
    expect(f.mainnetRead).toHaveBeenCalledExactlyOnceWith(primary.address.toLowerCase());
    expect(f.signer.mock.calls.map(([action]) => action)).toEqual(["status"]);
    expect(f.engine.status()).toMatchObject({ trading: null, armed: false, paused: true, mandate: null, agentRegistered: false });
    for (const body of [
      { action: "mainnet.account.read", address: outsider.address },
      { action: "mainnet.account.read", url: "https://evil.example" },
      { action: "mainnet.trade.execute" }, { action: "mainnet.approveAgent" }, { action: "withdraw" }, { action: "transfer" },
    ]) expect((await f.request(body)).status).toBe(400);
    expect((await f.request({ action: "mainnet.account.read" }, "alice", { Origin: "https://evil.example" })).status).toBe(403);
    f.mainnetRead.mockRejectedValueOnce(new Error("private upstream details"));
    const failed = await f.request({ action: "mainnet.account.read" });
    expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("private upstream");
  });
  it("establishes a remembered session with a wallet signature and no browser credential", async () => {
    const f = fixture();
    expect(await (await f.request()).json()).toEqual({ connected: false }); expect(f.signer).not.toHaveBeenCalled();
    const response = await f.login(); const body = await response.json();
    expect(body).toMatchObject({ connected: true, address: primary.address.toLowerCase(), status: { primary: primary.address.toLowerCase(), trading: null, paused: true, mandate: null } });
    expect(response.headers.getSetCookie().join(";")).toContain("HttpOnly"); expect(response.headers.getSetCookie().join(";")).toContain("SameSite=Strict");
    expect(JSON.stringify(body)).not.toMatch(/controlToken|workerToken|encryptionKey|Bearer/);
    expect(await (await f.request()).json()).toMatchObject({ connected: true });
    expect(f.sessions.read("forged", Date.now())).toBeNull();
  });
  it("allows reconnection through the same button without relinking the wallet", async () => {
    const f = fixture(); await f.login();
    expect((await f.request({ action: "disconnect" })).status).toBe(200);
    expect(await (await f.request()).json()).toEqual({ connected: false });
    expect((await f.login()).status).toBe(200);
    expect(f.signer.mock.calls.some(([action, input]) => action === "challenge" && (input as { kind: string }).kind === "sign-in")).toBe(true);
    expect(f.engine.status()).toMatchObject({ mandate: null, paused: true });
  });
  it("rejects anonymous control calls and arbitrary tool/proxy requests", async () => {
    const f = fixture();
    for (const body of [{ action: "status" }, { action: "pause" }, { action: "account.read" }, { action: "authorize", input: { kind: "link-trading", address: trading.address } }]) expect((await f.request(body)).status).toBe(401);
    for (const body of [{ action: "trade.execute", input: {} }, { action: "sign", privateKey: "fake" }, { action: "challenge", address: primary.address, url: "https://evil.example" }]) expect((await f.request(body)).status).toBe(400);
    expect(f.signer).not.toHaveBeenCalled();
  });
  it("binds a login proof to the originating browser and rejects signature replay", async () => {
    const f = fixture(); const { result } = await (await f.request({ action: "challenge", address: primary.address })).json();
    const signature = await primary.signMessage({ message: result.message }); const body = { action: "connect", challengeId: result.id, signature };
    expect((await f.request(body, "attacker")).status).toBe(401);
    expect((await f.request(body)).status).toBe(200);
    expect((await f.request(body)).status).toBe(401);
  });
  it("rejects the wrong signer and prevents another wallet taking over a linked workspace", async () => {
    const f = fixture();
    const { result } = await (await f.request({ action: "challenge", address: primary.address })).json();
    expect((await f.request({ action: "connect", challengeId: result.id, signature: await trading.signMessage({ message: result.message }) })).status).not.toBe(200);
    await f.login();
    expect((await f.request({ action: "challenge", address: trading.address }, "other")).status).toBe(403);
    expect(f.engine.status().primary).toBe(primary.address.toLowerCase());
  });
  it("requires wallet signatures for trading changes and binds control proofs to the session", async () => {
    const f = fixture(); await f.login(); await f.login(primary, "second-tab");
    const { result } = await (await f.request({ action: "authorize", input: { kind: "link-trading", address: trading.address } })).json();
    const proof = { action: "prove", challengeId: result.id, signature: await trading.signMessage({ message: result.message }) };
    expect((await f.request(proof, "second-tab")).status).toBe(401);
    expect((await f.request(proof)).status).toBe(200);
    expect(f.engine.status().trading).toBe(trading.address.toLowerCase());
    expect(f.engine.status()).toMatchObject({ paused: true, mandate: null });
    expect((await f.request({ action: "authorize", input: { kind: "link-primary", address: outsider.address } })).status).toBe(400);
  });
  it("rejects foreign origins/hosts and sanitizes backend failures", async () => {
    const f = fixture();
    expect((await f.request({ action: "challenge", address: primary.address }, "alice", { Origin: "https://evil.example" })).status).toBe(403);
    expect((await f.handle(new Request("http://evil.example:3000/api/v1/wallet"))).status).toBe(403);
    expect((await f.handle(new Request(url, { headers: { Host: "evil.example:3000" } }))).status).toBe(403);
    expect((await f.handle(new Request("http://localhost:3000/api/v1/wallet", { headers: { Host: "127.0.0.1:3000" } }))).status).toBe(200);
    f.signer.mockRejectedValueOnce(new Error("secret backend credential"));
    const response = await f.request({ action: "challenge", address: primary.address });
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret");
  });
  it("logs out without depending on an available signer", async () => {
    const f = fixture(); await f.login(); f.signer.mockRejectedValue(new Error("offline"));
    expect(await (await f.request({ action: "disconnect" })).json()).toEqual({ connected: false });
    expect(await (await f.request()).json()).toEqual({ connected: false });
  });
  it("expires wallet sessions and login challenges", () => {
    const s = new WalletSessions(":memory:");
    try {
      const token = s.create(primary.address, 1000); expect(s.read(token, 1001)).toBe(primary.address); expect(s.read(token, 1000 + 12 * 60 * 60 * 1000)).toBeNull();
      const nonce = s.nonce(); s.challenge(nonce, "challenge", primary.address, "login", 1000); expect(s.consume(nonce, "challenge", "login", 121000)).toBeNull();
    } finally { s.close(); }
  });
});

describe("browser extension connect flow", () => {
  it("links the existing MetaMask account to Hyperliquid without requesting another account", async () => {
    const f = fixture(); await f.login();
    const provider = { request: vi.fn(async ({ method, params }: { method: string; params?: string[] }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [primary.address];
      if (method === "personal_sign") return primary.signMessage({ message: { raw: params![0] as `0x${string}` } });
      throw new Error("Unexpected wallet operation");
    }) };
    vi.stubGlobal("window", { ethereum: provider });
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => f.request(init?.body ? JSON.parse(String(init.body)) : undefined)));
    const linked = await linkHyperliquidAccount();
    expect(linked).toMatchObject({ primary: primary.address.toLowerCase(), trading: primary.address.toLowerCase(), paused: true, mandate: null });
    expect(provider.request.mock.calls.map(([call]) => call.method)).toEqual(["eth_requestAccounts", "eth_accounts", "personal_sign"]);
    expect((await f.request({ action: "authorize", input: { kind: "link-trading", address: trading.address } })).status).not.toBe(200);
  });
  it("connects through one operation with only account and sign-in requests to the extension", async () => {
    const f = fixture();
    const provider = { request: vi.fn(async ({ method, params }: { method: string; params?: string[] }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [primary.address];
      if (method === "personal_sign") return primary.signMessage({ message: { raw: params![0] as `0x${string}` } });
      throw new Error("Unexpected wallet operation");
    }) };
    vi.stubGlobal("window", { ethereum: provider });
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => f.request(init?.body ? JSON.parse(String(init.body)) : undefined)));
    const state = await connectBrowserWallet();
    expect(state).toMatchObject({ connected: true, address: primary.address.toLowerCase() });
    expect(provider.request.mock.calls.map(([call]) => call.method)).toEqual(["eth_requestAccounts", "eth_accounts", "personal_sign"]);
    expect(f.engine.status()).toMatchObject({ paused: true, mandate: null });
  });
  it("discovers an EIP-6963 browser wallet without window.ethereum", async () => {
    const f = fixture(); const browser = new EventTarget();
    const provider = { request: async ({ method, params }: { method: string; params?: string[] }) => ["eth_requestAccounts", "eth_accounts"].includes(method) ? [primary.address] : primary.signMessage({ message: { raw: params![0] as `0x${string}` } }) } as EIP1193Provider;
    browser.addEventListener("eip6963:requestProvider", () => browser.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "test-wallet", name: "Example browser wallet", rdns: "io.metamask" }, provider } })));
    vi.stubGlobal("window", browser); const stop = discoverBrowserWallets(); cleanups.push(stop);
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => f.request(init?.body ? JSON.parse(String(init.body)) : undefined)));
    expect(await connectBrowserWallet()).toMatchObject({ connected: true });
  });
  it("turns wallet cancellation and pending prompts into short messages", () => {
    expect(walletError({ code: 4001 })).toContain("cancelled");
    expect(walletError({ code: -32002 })).toContain("already open");
  });
});
