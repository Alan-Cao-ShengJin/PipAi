import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { deny, hash, type Mandate, type Proposal } from "./contracts.ts";

export type Intent = { id: string; proposal: Proposal; fingerprint: string; status: "pending" | "uncertain" | "settled"; result: unknown; notional: string; createdAt: number };
export class ExecutionStore {
  #db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.#db = new DatabaseSync(path);
    this.#db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, value TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, value TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS intents (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY, at INTEGER NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL);`);
  }
  get<T>(key: string): T | undefined { const r = this.#db.prepare("SELECT value FROM state WHERE key=?").get(key); return r ? JSON.parse(String(r.value)) as T : undefined; }
  set(key: string, value: unknown) { this.#db.prepare("INSERT INTO state VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, JSON.stringify(value)); }
  event(kind: string, detail: unknown, at = Date.now()) { this.#db.prepare("INSERT INTO audit(at,kind,detail) VALUES (?,?,?)").run(at, kind, JSON.stringify(detail)); }
  events() { return this.#db.prepare("SELECT at,kind,detail FROM audit ORDER BY seq").all().map(r => ({ at: Number(r.at), kind: String(r.kind), detail: JSON.parse(String(r.detail)) })); }
  challenge(kind: string, address: string, payload: unknown, origin: string, now: number) {
    this.#db.prepare("DELETE FROM challenges WHERE used=1 OR json_extract(value,'$.expiresAt') < ?").run(now);
    if (Number(this.#db.prepare("SELECT count(*) n FROM challenges").get()!.n) >= 20) deny("RATE_LIMIT", "Too many pending wallet challenges.");
    const id = randomBytes(24).toString("hex"), expiresAt = now + 120_000;
    const message = kind === "link-primary" || kind === "sign-in"
      ? `Sign in to Pip\n\nWallet: ${address}\nWebsite: ${origin}\n\nThis confirms you own this wallet. It does not enable trading or authorize transfers or withdrawals.\n\nRequest: ${id}\nExpires: ${new Date(expiresAt).toISOString()}`
      : `Pip wallet authorization\nOrigin: ${origin}\nNetwork: Hyperliquid Testnet\nAction: ${kind}\nWallet: ${address}\nNonce: ${id}\nExpires: ${new Date(expiresAt).toISOString()}\nPayload SHA256: ${hash(payload)}\nPayload: ${JSON.stringify(payload)}\nThis signature does not authorize withdrawals.`;
    const value = { id, kind, address, payload, message, expiresAt };
    this.#db.prepare("INSERT INTO challenges(id,value) VALUES (?,?)").run(id, JSON.stringify(value));
    return value;
  }
  readChallenge(id: string) {
    const r = this.#db.prepare("SELECT value FROM challenges WHERE id=? AND used=0").get(id);
    if (!r) deny("INVALID_CHALLENGE", "Challenge missing or already consumed.");
    return JSON.parse(String(r.value)) as { id: string; kind: string; address: `0x${string}`; payload: unknown; message: string; expiresAt: number };
  }
  consumeChallenge(id: string) { if (Number(this.#db.prepare("UPDATE challenges SET used=1 WHERE id=? AND used=0").run(id).changes) !== 1) deny("REPLAY", "Challenge was already consumed."); }
  saveProposal(p: Proposal) { this.#db.prepare("INSERT INTO proposals(id,value) VALUES (?,?)").run(p.id, JSON.stringify(p)); this.event("proposal.created", { id: p.id, hash: hash(p) }); }
  proposal(id: string): { value: Proposal; approved: boolean } {
    const r = this.#db.prepare("SELECT value,approved FROM proposals WHERE id=?").get(id);
    if (!r) deny("UNKNOWN_PROPOSAL", "Unknown proposal.");
    return { value: JSON.parse(String(r.value)), approved: !!r.approved };
  }
  proposals(now: number) {
    return this.#db.prepare("SELECT p.value,p.approved FROM proposals p LEFT JOIN intents i ON p.id=i.id WHERE i.id IS NULL").all()
      .map(r => ({ ...JSON.parse(String(r.value)) as Proposal, approved: !!r.approved })).filter(p => p.expiresAt > now);
  }
  approve(id: string) { this.#db.prepare("UPDATE proposals SET approved=1 WHERE id=?").run(id); }
  intents(): Intent[] { return this.#db.prepare("SELECT value FROM intents").all().map(r => JSON.parse(String(r.value))); }
  intent(id: string): Intent | undefined { const r = this.#db.prepare("SELECT value FROM intents WHERE id=?").get(id); return r ? JSON.parse(String(r.value)) : undefined; }
  saveIntent(value: Intent) { this.#db.prepare("INSERT INTO intents VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(value.id, JSON.stringify(value)); }
  nextNonce(now: number) { return this.transaction(() => { const value = Math.max(now, (this.get<number>("nonce") ?? 0) + 1); this.set("nonce", value); return value; }); }
  transaction<T>(work: () => T): T {
    this.#db.exec("BEGIN IMMEDIATE");
    try { const r = work(); this.#db.exec("COMMIT"); return r; } catch (e) { this.#db.exec("ROLLBACK"); throw e; }
  }
  mandate() { return this.get<Mandate>("mandate"); }
  close() { this.#db.close(); }
}
