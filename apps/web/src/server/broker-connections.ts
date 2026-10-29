import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const BROKER_COOKIE = "pip_broker_session";
export const BROKER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const key = (token: string) => createHash("sha256").update(token).digest("hex");
const validToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
export type BrokerAccount = { id: string; label: string; type: string };
export type BrokerMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
export type ConnectionView = {
  broker: "tiger";
  phase: "disconnected" | "starting" | "authorizing" | "choosing-account" | "connected" | "reconnect" | "error";
  accounts: BrokerAccount[];
  selectedAccount?: BrokerAccount;
  authorizeUrl?: string;
  expiresAtMs?: number;
  message?: string;
  messages?: BrokerMessage[];
};
type RecordState = ConnectionView & { attemptId?: string };
const empty = (): RecordState => ({ broker: "tiger", phase: "disconnected", accounts: [] });
function say(state: RecordState, ...messages: ["user" | "assistant", string][]): RecordState {
  // Only server-authored text enters this journal; never credentials, OAuth URLs
  // or arbitrary composer text. The local preview keeps a bounded transcript.
  return { ...state, messages: [...(state.messages ?? []), ...messages.map(([role, content]) => ({
    id: randomUUID(), role, content, createdAt: new Date().toISOString(),
  }))].slice(-100) };
}
const accountText = (account: BrokerAccount) => `account ending ${account.label.slice(-4)}`;
const connectedText = (account: BrokerAccount) => `Tiger ${accountText(account)} is connected with read-only access. Your money stays with Tiger. Portfolio sync and monitoring are not active yet. We can carry on with your conversation.`;
export class BrokerError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

// Local preview persistence. Hosted product identity must replace the browser bearer
// session, and credentials must move to encrypted managed storage before deployment.
export class BrokerStore {
  private db: DatabaseSync;
  constructor(path: string, readonly homes: string) {
    mkdirSync(homes, { recursive: true, mode: 0o700 }); chmodSync(homes, 0o700);
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.exec("PRAGMA journal_mode = DELETE; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS connections (key TEXT PRIMARY KEY, state TEXT NOT NULL, expires_at INTEGER NOT NULL)");
  }
  create() {
    // Remove expired private homes as well as session records.
    const expired = this.db.prepare("SELECT key FROM connections WHERE expires_at <= ?").all(Date.now());
    for (const row of expired) rmSync(join(this.homes, String(row.key)), { recursive: true, force: true });
    this.db.prepare("DELETE FROM connections WHERE expires_at <= ?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    this.db.prepare("INSERT INTO connections VALUES (?, ?, ?)").run(key(token), JSON.stringify(empty()), Date.now() + BROKER_SESSION_SECONDS * 1000);
    return token;
  }
  read(token: string): RecordState | null {
    if (!validToken(token)) return null;
    const row = this.db.prepare("SELECT state FROM connections WHERE key = ? AND expires_at > ?").get(key(token), Date.now());
    return row ? JSON.parse(String(row.state)) : null;
  }
  write(token: string, state: RecordState) {
    if (!this.read(token)) throw new BrokerError("Open broker connections again to start a fresh session.", 401);
    this.db.prepare("UPDATE connections SET state = ? WHERE key = ?").run(JSON.stringify(state), key(token));
  }
  home(token: string, attemptId: string) {
    if (!this.read(token) || !validToken(attemptId)) throw new BrokerError("Connection not found.", 404);
    return join(this.homes, key(token), attemptId);
  }
  close() { this.db.close(); }
}

export type Launch = (home: string, event: (value: unknown) => void, done: (ok: boolean) => void) => () => void;
function projectRoot() {
  let path = process.cwd();
  while (!existsSync(join(path, "integrations/tiger/pip_tiger"))) {
    const parent = dirname(path);
    if (parent === path) throw new BrokerError("The local broker integration is not installed.", 503);
    path = parent;
  }
  return path;
}
const launchTiger: Launch = (home, event, done) => {
  const root = projectRoot();
  const python = join(root, ".venv-tiger", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  if (!existsSync(python)) throw new BrokerError("Tiger connection setup is not available on this computer.", 503);
  const child: ChildProcess = spawn(python, ["-m", "pip_tiger.web", "login", home], {
    cwd: root, stdio: ["ignore", "pipe", "ignore"],
    env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, NODE_ENV: process.env.NODE_ENV,
      PYTHONPATH: join(root, "integrations/tiger"), PYTHONDONTWRITEBYTECODE: "1" },
  });
  let buffer = "", finished = false;
  const timer = setTimeout(() => { child.kill("SIGKILL"); }, 150_000);
  function finish(ok: boolean) {
    if (finished) return;
    finished = true; clearTimeout(timer); done(ok);
  }
  child.stdout!.on("data", chunk => {
    buffer += chunk.toString();
    if (buffer.length > 65_536) { child.kill("SIGKILL"); return; }
    let end: number;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      try { event(JSON.parse(line)); } catch { child.kill("SIGKILL"); return; }
    }
  });
  child.once("error", () => finish(false));
  child.once("close", code => finish(code === 0));
  return () => { child.kill(); };
};

function authorizationUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 8192) throw new BrokerError("Tiger did not return a valid sign-in link.");
  const url = new URL(value);
  const scopes = new Set((url.searchParams.get("scope") ?? "").split(" "));
  const required = ["api.basic:read", "api.quote:read", "api.account:read", "api.trade:read"];
  const redirect = new URL(url.searchParams.get("redirect_uri") ?? "");
  if (url.origin !== "https://openapi-oauth2.tigerfintech.com" || url.pathname !== "/oauth2/authorize"
    || url.username || url.password || url.hash || redirect.protocol !== "http:" || redirect.hostname !== "127.0.0.1"
    || !redirect.port || redirect.pathname !== "/callback" || redirect.username || redirect.password || redirect.search || redirect.hash
    || scopes.size !== required.length || required.some(scope => !scopes.has(scope))
    || url.searchParams.get("response_type") !== "code" || url.searchParams.get("code_challenge_method") !== "S256"
    || !url.searchParams.get("code_challenge") || !url.searchParams.get("state") || !url.searchParams.get("client_id")) {
    throw new BrokerError("Tiger did not return the expected read-only sign-in flow.");
  }
  return url.href;
}
function accountsFrom(value: unknown): BrokerAccount[] {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw new BrokerError("Tiger returned no supported accounts.");
  const ids = new Set<string>();
  return value.map(row => {
    if (!row || typeof row !== "object" || !/^[a-f0-9]{32}$/.test(row.id) || ids.has(row.id)
      || typeof row.label !== "string" || !/^account-[A-Za-z0-9]{4}$/.test(row.label)
      || !["STANDARD", "GLOBAL"].includes(row.type)) throw new BrokerError("Tiger returned an unsupported account response.");
    ids.add(row.id);
    return { id: row.id, label: row.label, type: row.type };
  });
}

export class BrokerConnections {
  private active = new Map<string, { attemptId: string; cancel: () => void }>();
  private closed = false;
  constructor(readonly store: BrokerStore, private launch: Launch = launchTiger) {}
  view(token: string): ConnectionView {
    let state = this.store.read(token);
    if (!state) throw new BrokerError("Open broker connections again to start a fresh session.", 401);
    if (["starting", "authorizing"].includes(state.phase) && !this.active.has(key(token))) {
      state.phase = "error"; state.message = "The connection was interrupted. Try connecting again.";
      delete state.authorizeUrl; state = say(state, ["assistant", state.message]); this.store.write(token, state);
    }
    if (["connected", "choosing-account"].includes(state.phase) && (state.expiresAtMs ?? 0) <= Date.now()) {
      state.phase = "reconnect"; state.message = "Your Tiger access expired. Reconnect to continue.";
      state.accounts = []; delete state.selectedAccount; state = say(state, ["assistant", state.message]); this.store.write(token, state);
    }
    const { attemptId: _private, ...publicState } = state;
    return publicState;
  }
  show(token: string) {
    const state = this.view(token), row = this.store.read(token)!;
    const content = state.phase === "connected" && state.selectedAccount ? connectedText(state.selectedAccount)
      : state.phase === "choosing-account" ? "Which Tiger account should I use? Choose below or type its last four characters."
      : state.phase === "starting" || state.phase === "authorizing" ? "I’m waiting for Tiger’s read-only approval. Finish signing in with Tiger, then I’ll pick up here."
      : "I can connect Tiger Brokers with read-only access. Sign in and approve access on Tiger’s site; keep your password there. I’ll continue here when you’re done.";
    this.store.write(token, say(row, ["user", "Show my broker connection."], ["assistant", content]));
    return this.view(token);
  }
  start(token: string) {
    const state = this.view(token);
    if (this.active.has(key(token))) return state;
    if (["connected", "choosing-account"].includes(state.phase)) return this.show(token);
    if (this.active.size >= 4) throw new BrokerError("Several connections are in progress. Try again shortly.", 429);
    const old = this.store.read(token)!;
    // Keep a completed connection's SDK refresh token/registration on expiry.
    // login_if_needed can renew it without requiring another broker sign-in.
    // Interrupted/cancelled attempts always get fresh isolated storage instead.
    const reusable = state.phase === "reconnect" ? old.attemptId : undefined;
    if (old.attemptId && !reusable) rmSync(this.store.home(token, old.attemptId), { recursive: true, force: true });
    const attemptId = reusable ?? randomBytes(32).toString("hex");
    const home = this.store.home(token, attemptId);
    mkdirSync(home, { recursive: true, mode: 0o700 });
    this.store.write(token, say({ ...empty(), messages: old.messages, phase: "starting", attemptId },
      ["user", state.phase === "reconnect" ? "Reconnect Tiger." : "Connect Tiger."],
      ["assistant", "I’ll open Tiger’s sign-in for read-only access. Your money stays with Tiger. We’ll continue in this conversation once you approve access."]));
    const current = () => { if (this.closed) return null; const row = this.store.read(token); return row?.attemptId === attemptId ? row : null; };
    const fail = () => {
      const row = current();
      if (!row || ["connected", "choosing-account"].includes(row.phase)) return;
      const message = "Tiger could not finish connecting. Try again; check Tiger access is enabled if it keeps failing.";
      this.store.write(token, say({ ...empty(), messages: row.messages, attemptId, phase: "error", message }, ["assistant", message]));
    };
    const active = { attemptId, cancel: () => {} };
    this.active.set(key(token), active);
    try {
      active.cancel = this.launch(home, value => {
        const row = current();
        if (!row) return;
        if (!value || typeof value !== "object") throw new BrokerError("Invalid connection response.");
        const event = value as Record<string, unknown>;
        if (event.event === "authorize") {
          const next = { ...row, phase: "authorizing" as const, authorizeUrl: authorizationUrl(event.url) };
          this.store.write(token, row.phase === "authorizing" ? next : say(next,
            ["assistant", "Finish signing in and approving the read permissions with Tiger. If the sign-in tab didn’t open, use Continue to Tiger below. I’m waiting here."]));
        } else if (event.event === "accounts") {
          const accounts = accountsFrom(event.accounts);
          if (event.authorized !== true || typeof event.expiresAtMs !== "number" || !Number.isSafeInteger(event.expiresAtMs) || event.expiresAtMs <= Date.now()) throw new BrokerError("Tiger authorization expired.");
          this.store.write(token, say({ ...empty(), messages: row.messages, attemptId, accounts, expiresAtMs: event.expiresAtMs,
            phase: accounts.length === 1 ? "connected" : "choosing-account",
            ...(accounts.length === 1 ? { selectedAccount: accounts[0] } : {}) }, ["assistant", accounts.length === 1 ? connectedText(accounts[0])
              : "Tiger approved read-only access. Which account should I use? Choose below or type its last four characters."]));
        } else if (event.event === "error") fail();
        else throw new BrokerError("Unexpected connection response.");
      }, ok => {
        if (this.closed) return;
        if (this.active.get(key(token))?.attemptId === attemptId) this.active.delete(key(token));
        // Wait for process exit before the final cleanup: a dying SDK process
        // must not recreate a token file after Disconnect has removed its home.
        if (!current()) { rmSync(home, { recursive: true, force: true }); return; }
        if (!ok || ["starting", "authorizing"].includes(current()?.phase ?? "")) fail();
      });
    } catch (error) {
      this.active.delete(key(token)); fail(); throw error;
    }
    return this.view(token);
  }
  select(token: string, id: string) {
    const state = this.view(token), row = this.store.read(token)!;
    if (state.phase !== "choosing-account") throw new BrokerError("Reconnect or finish Tiger sign-in before choosing an account.", 409);
    const selectedAccount = state.accounts.find(account => account.id === id);
    if (!selectedAccount) throw new BrokerError("Choose an account from your own Tiger connection.", 403);
    this.store.write(token, say({ ...row, phase: "connected", selectedAccount }, ["user", `Use ${accountText(selectedAccount)}.`], ["assistant", connectedText(selectedAccount)]));
    return this.view(token);
  }
  disconnect(token: string, cancelled = false) {
    const row = this.store.read(token);
    if (!row) throw new BrokerError("Connection not found.", 401);
    // Invalidate before cancellation so late worker events cannot restore access.
    this.store.write(token, say({ ...empty(), messages: row.messages }, ["user", cancelled ? "Cancel the Tiger connection." : "Disconnect Tiger."],
      ["assistant", cancelled ? "I’ve cancelled the connection attempt. We can come back to it later."
        : "I’ve removed this browser’s saved Tiger access. You can also revoke Pip in Tiger’s authorized applications. We can continue here."]));
    this.active.get(key(token))?.cancel(); this.active.delete(key(token));
    if (row.attemptId) rmSync(this.store.home(token, row.attemptId), { recursive: true, force: true });
    return this.view(token);
  }
  close() { this.closed = true; for (const job of this.active.values()) job.cancel(); this.active.clear(); this.store.close(); }
}

export function localBrokerRequest(request: Request) {
  const host = request.headers.get("host");
  if (!host || !/^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(host)) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}
const globals = globalThis as typeof globalThis & { pipBrokers?: BrokerConnections };
export function getBrokerConnections() {
  if (!globals.pipBrokers) {
    const root = resolve(homedir(), process.platform === "darwin" ? "Library/Application Support/Pip/web-brokers" : ".local/share/pip/web-brokers");
    globals.pipBrokers = new BrokerConnections(new BrokerStore(join(root, "connections.sqlite"), join(root, "connections")));
  }
  return globals.pipBrokers;
}
