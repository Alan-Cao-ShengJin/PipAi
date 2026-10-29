import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { applyCommand, createDemo, DemoStateSchema, DomainError, type Command, type DemoState } from "@pip/domain";

export const SESSION_COOKIE = "pip_demo_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const validToken = (token: string) => /^[a-f0-9]{64}$/.test(token);

// One local process only. Shared Postgres storage and production authentication are planned.
export class DemoStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS sessions (key TEXT PRIMARY KEY, state TEXT NOT NULL, expires_at INTEGER NOT NULL)");
  }
  create() {
    const token = randomBytes(32).toString("hex");
    const state = createDemo();
    this.db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    this.db.prepare("INSERT INTO sessions (key, state, expires_at) VALUES (?, ?, ?)").run(hash(token), JSON.stringify(state), Date.now() + SESSION_SECONDS * 1000);
    return { token, state };
  }
  read(token: string): DemoState | null {
    if (!validToken(token)) return null;
    const row = this.db.prepare("SELECT state FROM sessions WHERE key = ? AND expires_at > ?").get(hash(token), Date.now());
    return row ? DemoStateSchema.parse(JSON.parse(row.state as string)) : null;
  }
  mutate(token: string, command: Command): DemoState {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const state = this.read(token);
      if (!state) throw new DomainError("Your demo session expired. Reload to start a fresh workspace.", 401);
      const result = applyCommand(state, command);
      this.db.prepare("UPDATE sessions SET state = ? WHERE key = ?").run(JSON.stringify(result), hash(token));
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() { this.db.close(); }
}
const globals = globalThis as typeof globalThis & { pipStore?: DemoStore };
export function getStore(): DemoStore {
  return globals.pipStore ??= new DemoStore(join(process.env.PIP_DATA_DIR ?? join(process.cwd(), ".data"), "pip-demo.sqlite"));
}
