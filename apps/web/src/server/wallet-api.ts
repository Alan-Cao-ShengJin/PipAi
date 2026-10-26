import { z } from "zod";
import { join } from "node:path";
import { WalletSessions, WALLET_SESSION_SECONDS } from "./wallet-sessions";
import { readMainnetAccount } from "./mainnet-account";
import type { MainnetAccount } from "../components/mainnet-account";

const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform(s => s.toLowerCase());
const Proof = z.object({ challengeId: z.string().regex(/^[0-9a-f]{48}$/), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) }).strict();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("challenge"), address: Address }).strict(),
  z.object({ action: z.literal("connect"), ...Proof.shape }).strict(),
  z.object({ action: z.literal("disconnect") }).strict(),
  z.object({ action: z.literal("status") }).strict(),
  z.object({ action: z.literal("account.read") }).strict(),
  z.object({ action: z.literal("mainnet.account.read") }).strict(),
  z.object({ action: z.literal("pause") }).strict(),
  z.object({ action: z.literal("authorize"), input: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("link-trading"), address: Address }).strict(),
    z.object({ kind: z.literal("mandate"), mandate: z.record(z.string(), z.unknown()) }).strict(),
    z.object({ kind: z.literal("approve-proposal"), proposalId: z.string().max(80) }).strict(),
  ]) }).strict(),
  z.object({ action: z.literal("prove"), ...Proof.shape }).strict(),
]);
type Status = { primary: string | null; trading: string | null; [key: string]: unknown };
type Challenge = { id: string; address: string; message: string; [key: string]: unknown };
export type SignerControl = (action: string, input?: unknown) => Promise<unknown>;
const SESSION = "pip_wallet_session", PENDING = "pip_wallet_pending";
class WalletApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function cookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith(name + "="))?.slice(name.length + 1) ?? "";
}

// This narrow same-origin gateway keeps backend credentials out of the browser.
// An unauthenticated visitor can only request/complete a wallet ownership proof.
export function createWalletApi(options: { store: WalletSessions; signer: SignerControl; origin: string; now?: () => number; mainnetRead?: (address: string) => Promise<MainnetAccount> }) {
  const now = options.now ?? Date.now;
  return async function handle(request: Request) {
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    const respond = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers });
    const setCookie = (name: string, token: string, seconds: number) => headers.append("Set-Cookie", `${name}=${token}; HttpOnly; SameSite=Strict; Path=/api/v1/wallet; Max-Age=${seconds}${options.origin.startsWith("https:") ? "; Secure" : ""}`);
    try {
      const url = new URL(request.url);
      // Next may normalize request.url to its internal localhost origin. Check the
      // actual HTTP Host, never a caller-provided forwarded host, against configuration.
      if ((request.headers.get("host") ?? url.host) !== new URL(options.origin).host) throw new WalletApiError("Unexpected application host.", 403);
      if (request.method === "POST" && request.headers.get("origin") !== options.origin) throw new WalletApiError("Open Pip in its own browser tab to connect.", 403);
      if (request.method !== "GET" && request.method !== "POST") return respond(405, { error: "Unsupported method." });
      const sessionToken = cookie(request, SESSION), address = options.store.read(sessionToken, now());
      if (request.method === "GET") {
        if (!address) return respond(200, { connected: false });
        const status = await options.signer("status") as Status;
        if (status.primary !== address && status.trading !== address) { options.store.disconnect(sessionToken); return respond(200, { connected: false }); }
        return respond(200, { connected: true, address, status });
      }
      if (!request.headers.get("content-type")?.startsWith("application/json")) return respond(415, { error: "JSON required." });
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 16_384) return respond(413, { error: "Request too large." });
      const body = Body.parse(JSON.parse(raw));
      if (body.action === "challenge") {
        const status = await options.signer("status") as Status;
        if (status.primary && status.primary !== body.address && status.trading !== body.address) throw new WalletApiError("Choose a wallet already connected to this workspace.", 403);
        const c = await options.signer("challenge", { kind: status.primary ? "sign-in" : "link-primary", address: body.address }) as Challenge;
        const nonce = options.store.nonce(); options.store.challenge(nonce, c.id, body.address, "login", now());
        setCookie(PENDING, nonce, 120);
        return respond(200, { result: { id: c.id, address: c.address, message: c.message } });
      }
      if (body.action === "connect") {
        const provedAddress = options.store.consume(cookie(request, PENDING), body.challengeId, "login", now());
        if (!provedAddress) throw new WalletApiError("Connection expired. Click Connect wallet again.", 401);
        const status = await options.signer("prove", { challengeId: body.challengeId, signature: body.signature }) as Status;
        if (status.primary !== provedAddress && status.trading !== provedAddress) throw new WalletApiError("Wallet ownership could not be verified.", 403);
        if (sessionToken) options.store.disconnect(sessionToken);
        setCookie(SESSION, options.store.create(provedAddress, now()), WALLET_SESSION_SECONDS); setCookie(PENDING, "", 0);
        return respond(200, { connected: true, address: provedAddress, status });
      }
      if (body.action === "disconnect") {
        if (sessionToken) options.store.disconnect(sessionToken);
        setCookie(SESSION, "", 0); return respond(200, { connected: false });
      }
      if (!address) throw new WalletApiError("Connect your wallet first.", 401);
      const status = await options.signer("status") as Status;
      if (address !== status.primary && address !== status.trading) throw new WalletApiError("Wallet session is no longer authorized.", 403);
      if (body.action === "mainnet.account.read") {
        // The verified browser session supplies the owner address. Neither an
        // API wallet nor a caller-provided account can replace it.
        return respond(200, { result: await (options.mainnetRead ?? readMainnetAccount)(address) });
      }
      if (body.action === "authorize") {
        const c = await options.signer("challenge", body.input) as Challenge;
        options.store.challenge(sessionToken, c.id, c.address, "control", now());
        return respond(200, { result: { id: c.id, address: c.address, message: c.message, payload: c.payload } });
      }
      if (body.action === "prove") {
        if (!options.store.consume(sessionToken, body.challengeId, "control", now())) throw new WalletApiError("Authorization expired. Review it again.", 401);
        return respond(200, { result: await options.signer("prove", { challengeId: body.challengeId, signature: body.signature }) });
      }
      return respond(200, { result: body.action === "status" ? status : await options.signer(body.action) });
    } catch (e) {
      if (e instanceof WalletApiError) return respond(e.status, { error: e.message });
      if (e instanceof z.ZodError || e instanceof SyntaxError) return respond(400, { error: "Invalid wallet request." });
      // Never serialize backend errors, credentials or signed exchange envelopes.
      return respond(503, { error: "Wallet connection is temporarily unavailable. Please try again." });
    }
  };
}

const globals = globalThis as typeof globalThis & { pipWalletSessions?: WalletSessions };
export function walletApi(request: Request) {
  const token = process.env.PIP_WEB_SIGNER_TOKEN;
  const endpoint = process.env.PIP_WEB_SIGNER_URL ?? "http://127.0.0.1:8788";
  const origin = process.env.PIP_WEB_ORIGIN ?? "http://127.0.0.1:3000";
  if (!token || !/^[0-9a-f]{64}$/.test(token) || !/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(endpoint)) {
    return Response.json({ error: "Wallet connection is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const store = globals.pipWalletSessions ??= new WalletSessions(join(process.env.PIP_DATA_DIR ?? join(process.cwd(), ".data"), "wallet-sessions.sqlite"));
  const signer: SignerControl = async (action, input) => {
    const response = await fetch(`${endpoint}/control`, { method: "POST", redirect: "error", cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(input === undefined ? {} : { input }) }), signal: AbortSignal.timeout(15_000) });
    const body = await response.json() as { result?: unknown; code?: string };
    if (!response.ok) {
      const messages: Record<string, string> = { SEPARATE_AGENT_REQUIRED: "Pip's signing key must remain separate from your wallet account.", EXPIRED: "The wallet request expired. Please try again.", INVALID_SIGNATURE: "The wallet signature could not be verified.", RETIRED_AGENT: "Trading access expired or was revoked. Reconnect trading access with a fresh agent.", RATE_LIMIT: "A wallet request is already pending. Please try again shortly." };
      throw new WalletApiError(messages[body.code ?? ""] ?? "The wallet request could not be completed. Please try again.", 409);
    }
    return body.result;
  };
  return createWalletApi({ store, signer, origin })(request);
}
