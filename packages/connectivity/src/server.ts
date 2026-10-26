import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { openSync, closeSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { ConnectivityError } from "./contracts.ts";
import { ExecutionStore } from "./store.ts";
import { loadAgent } from "./keystore.ts";
import { HyperliquidTestnet } from "./venue.ts";
import { ExecutionEngine } from "./engine.ts";

export function createSignerServer(options: { engine: ExecutionEngine; controlToken: string; workerToken: string; webOrigin: string; port: number }) {
  if (![options.controlToken, options.workerToken].every(t => /^[0-9a-f]{64}$/.test(t)) || options.controlToken === options.workerToken) throw new Error("Distinct random control and worker credentials are required.");
  const match = (actual: string | undefined, expected: string) => {
    const bytes = Buffer.from(actual ?? ""); const target = Buffer.from(`Bearer ${expected}`);
    return bytes.length === target.length && timingSafeEqual(bytes, target);
  };
  let active = 0;
  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const reply = (status: number, value: unknown) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(value)); };
    if (req.headers.host !== `127.0.0.1:${options.port}`) return reply(403, { error: "Unexpected signer host." });
    const origin = req.headers.origin;
    if (origin && origin !== options.webOrigin) return reply(403, { error: "Unexpected browser origin." });
    if (origin) { res.setHeader("Access-Control-Allow-Origin", options.webOrigin); res.setHeader("Vary", "Origin"); }
    if (req.method === "OPTIONS" && origin && req.url === "/control") {
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type"); res.setHeader("Access-Control-Allow-Methods", "POST"); return reply(204, null);
    }
    if (req.method !== "POST" || !["/worker", "/control"].includes(req.url ?? "")) return reply(404, { error: "Unknown signer route." });
    const control = req.url === "/control";
    if (!control && origin) return reply(403, { error: "Worker tools are server-only." });
    if (!match(req.headers.authorization, control ? options.controlToken : options.workerToken)) return reply(401, { error: "Invalid signer credential." });
    if (!req.headers["content-type"]?.startsWith("application/json")) return reply(415, { error: "JSON required." });
    if (active >= 8) return reply(429, { error: "Signer request limit reached." });
    active++;
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) { const b = Buffer.from(chunk); size += b.length; if (size > 16_384) return reply(413, { error: "Request too large." }); chunks.push(b); }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      let result: unknown;
      if (!control) {
        const call = z.object({ name: z.string().max(50), input: z.unknown() }).strict().parse(body);
        result = await options.engine.worker(call.name, call.input);
      } else {
        const call = z.object({ action: z.enum(["status", "challenge", "prove", "pause", "account.read"]), input: z.unknown().optional() }).strict().parse(body);
        if (call.action === "challenge") result = options.engine.challenge(call.input);
        else if (call.action === "prove") result = await options.engine.prove(call.input);
        else {
          if (call.input !== undefined) z.object({}).strict().parse(call.input);
          if (call.action === "pause") result = options.engine.pause();
          else if (call.action === "account.read") result = await options.engine.worker("account.read", {});
          else result = options.engine.status();
        }
      }
      reply(200, { result });
    } catch (e) {
      if (e instanceof ConnectivityError) reply(409, { error: e.message, code: e.code });
      else if (e instanceof z.ZodError || e instanceof SyntaxError) reply(400, { error: "Invalid request or unsupported venue response." });
      else reply(503, { error: "Signer operation failed. Check status and reconcile before another execution." });
    } finally { active--; }
  };
  const server = createServer((req, res) => { void handle(req, res); });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000; server.keepAliveTimeout = 2000;
  return server;
}

function main() {
  const env = z.object({ PIP_SIGNER_DATA_DIR: z.string().min(3), PIP_SIGNER_ENCRYPTION_KEY: z.string(), PIP_CONTROL_TOKEN: z.string(), PIP_WORKER_TOKEN: z.string(),
    PIP_SIGNER_PORT: z.coerce.number().int().min(1024).max(65535).default(8788), PIP_WEB_ORIGIN: z.literal("http://127.0.0.1:3000").default("http://127.0.0.1:3000"),
    PIP_TESTNET_EXECUTION: z.enum(["disabled", "enabled"]).default("disabled") }).parse(process.env);
  const directory = resolve(env.PIP_SIGNER_DATA_DIR), store = new ExecutionStore(join(directory, "execution.sqlite"));
  const lockPath = join(directory, "signer.lock");
  let lock: number;
  try { lock = openSync(lockPath, "wx", 0o600); writeFileSync(lock, String(process.pid)); }
  catch { store.close(); throw new Error("Signer lock exists. Stop the other signer; after a crash verify the old process is stopped before removing its lock."); }
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; store.close(); closeSync(lock); unlinkSync(lockPath); };
  process.once("exit", cleanup);
  const agent = loadAgent(join(directory, "agent.encrypted.json"), env.PIP_SIGNER_ENCRYPTION_KEY);
  const venue = new HyperliquidTestnet(agent, () => store.nextNonce(Date.now()));
  const engine = new ExecutionEngine({ store, venue, origin: env.PIP_WEB_ORIGIN, armed: env.PIP_TESTNET_EXECUTION === "enabled" });
  const server = createSignerServer({ engine, controlToken: env.PIP_CONTROL_TOKEN, workerToken: env.PIP_WORKER_TOKEN, webOrigin: env.PIP_WEB_ORIGIN, port: env.PIP_SIGNER_PORT });
  server.listen(env.PIP_SIGNER_PORT, "127.0.0.1", () => console.log(`Pip signer: testnet, ${env.PIP_TESTNET_EXECUTION}; wallet controls at ${env.PIP_WEB_ORIGIN}/connect`));
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { engine.pause(); server.close(() => { cleanup(); process.exit(0); }); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { console.error("Signer startup failed. Check local configuration, storage and the exclusive-process lock. No credentials were printed."); process.exitCode = 1; }
}
