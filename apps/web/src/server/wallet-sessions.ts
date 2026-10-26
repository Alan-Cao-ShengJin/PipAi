import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export const WALLET_SESSION_SECONDS = 12 * 60 * 60;
export class WalletSessions {
  #db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.#db = new DatabaseSync(path);
    this.#db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS wallet_sessions (key TEXT PRIMARY KEY, address TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS wallet_challenges (key TEXT NOT NULL, id TEXT NOT NULL UNIQUE, address TEXT NOT NULL, purpose TEXT NOT NULL, expires INTEGER NOT NULL);`);
  }
  nonce() { return randomBytes(32).toString("hex"); }
  challenge(token: string, id: string, address: string, purpose: "login" | "control", now: number) {
    this.#db.prepare("DELETE FROM wallet_challenges WHERE expires<=?").run(now);
    this.#db.prepare("INSERT INTO wallet_challenges VALUES (?,?,?,?,?)").run(digest(token), id, address, purpose, now + 120_000);
  }
  consume(token: string, id: string, purpose: "login" | "control", now: number): string | null {
    // Delete-and-return makes concurrent/replayed proof attempts single use.
    const r = this.#db.prepare("DELETE FROM wallet_challenges WHERE key=? AND id=? AND purpose=? AND expires>? RETURNING address").get(digest(token), id, purpose, now);
    return r ? String(r.address) : null;
  }
  create(address: string, now: number) {
    const token = this.nonce();
    this.#db.prepare("DELETE FROM wallet_sessions WHERE expires<=?").run(now);
    this.#db.prepare("INSERT INTO wallet_sessions VALUES (?,?,?)").run(digest(token), address, now + WALLET_SESSION_SECONDS * 1000);
    return token;
  }
  read(token: string, now: number): string | null {
    if (!/^[0-9a-f]{64}$/.test(token)) return null;
    const r = this.#db.prepare("SELECT address FROM wallet_sessions WHERE key=? AND expires>?").get(digest(token), now);
    return r ? String(r.address) : null;
  }
  disconnect(token: string) { this.#db.prepare("DELETE FROM wallet_sessions WHERE key=?").run(digest(token)); }
  close() { this.#db.close(); }
}
