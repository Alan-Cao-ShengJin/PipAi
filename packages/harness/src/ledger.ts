import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CostMicros, HarnessError, Identifier, ScopeSchema, type Json, type Scope } from "./contracts.ts";

type Budget = { limitMicros: number; spentMicros: number; reservedMicros: number; blocked: boolean };
type CallRow = { fingerprint: string; status: string; reservation: number; result: string | null; run_id: string; operation_kind: string };

// Local research foundation only. Production workers need a reviewed multi-process job store.
export class UsageLedger {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS budgets (
        tenant_id TEXT NOT NULL, scope_key TEXT NOT NULL,
        limit_micros INTEGER NOT NULL, spent INTEGER NOT NULL DEFAULT 0,
        reserved INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, scope_key)
      );
      CREATE TABLE IF NOT EXISTS calls (
        tenant_id TEXT NOT NULL, call_key TEXT NOT NULL, run_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL, status TEXT NOT NULL, reservation INTEGER NOT NULL,
        result TEXT, PRIMARY KEY (tenant_id, call_key)
      );
      CREATE TABLE IF NOT EXISTS run_scopes (
        tenant_id TEXT NOT NULL, run_id TEXT NOT NULL, scope_json TEXT NOT NULL,
        PRIMARY KEY (tenant_id, run_id)
      );
      CREATE TABLE IF NOT EXISTS journal (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL, run_id TEXT NOT NULL,
        kind TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
      );
    `);
    const columns = this.db.prepare("PRAGMA table_info(calls)").all();
    if (!columns.some(row => row.name === "operation_kind")) this.db.exec("ALTER TABLE calls ADD COLUMN operation_kind TEXT NOT NULL DEFAULT 'tool'");
  }
  configureTenant(tenantId: string, limitMicros: number) { this.configure(tenantId, "tenant", limitMicros); }
  configureRun(scope: Scope, limitMicros: number) {
    const parsed = ScopeSchema.parse(scope);
    this.transaction(() => {
      this.db.prepare("INSERT OR IGNORE INTO run_scopes (tenant_id, run_id, scope_json) VALUES (?, ?, ?)").run(parsed.tenantId, parsed.runId, JSON.stringify(parsed));
      this.assertScope(parsed);
      this.configure(parsed.tenantId, `run:${parsed.runId}`, limitMicros);
    });
  }
  private assertScope(scope: Scope) {
    const row = this.db.prepare("SELECT scope_json FROM run_scopes WHERE tenant_id = ? AND run_id = ?").get(scope.tenantId, scope.runId);
    if (!row || row.scope_json !== JSON.stringify(ScopeSchema.parse(scope))) throw new HarnessError("SCOPE_MISMATCH", "The run is not bound to this account, conversation and capability scope.");
  }
  private configure(tenant: string, key: string, limit: number) {
    Identifier.parse(tenant); CostMicros.parse(limit);
    this.db.prepare("INSERT OR IGNORE INTO budgets (tenant_id, scope_key, limit_micros) VALUES (?, ?, ?)").run(tenant, key, limit);
    const existing = this.budget(tenant, key);
    if (existing.limitMicros !== limit) throw new HarnessError("BUDGET_ALREADY_SET", "Existing budgets cannot be changed through run setup.");
  }
  budget(tenant: string, key = "tenant"): Budget {
    const row = this.db.prepare("SELECT * FROM budgets WHERE tenant_id = ? AND scope_key = ?").get(tenant, key);
    if (!row) throw new HarnessError("NO_BUDGET", "Configure tenant and run allowances before dispatch.");
    return { limitMicros: Number(row.limit_micros), spentMicros: Number(row.spent), reservedMicros: Number(row.reserved), blocked: !!row.blocked };
  }
  claim(scope: Scope, callId: string, fingerprint: string, maxCostMicros: number, metadata: Json, operationKind: "tool" | "model" = "tool"): { cached: false } | { cached: true; result: Json } {
    CostMicros.parse(maxCostMicros);
    return this.transaction(() => {
      this.assertScope(scope);
      const key = JSON.stringify([scope.runId, callId]);
      const row = this.db.prepare("SELECT * FROM calls WHERE tenant_id = ? AND call_key = ?").get(scope.tenantId, key) as CallRow | undefined;
      if (row) {
        if (row.fingerprint !== fingerprint || row.operation_kind !== operationKind) throw new HarnessError("CALL_CONFLICT", "The call identity is already bound to a different request.");
        if (row.status === "succeeded" && row.result) return { cached: true, result: JSON.parse(row.result) as Json };
        throw new HarnessError("UNRESOLVED_CALL", "This call is pending, failed or uncertain. It will not be dispatched again automatically.");
      }
      for (const budgetKey of ["tenant", `run:${scope.runId}`]) {
        const budget = this.budget(scope.tenantId, budgetKey);
        if (budget.blocked || budget.spentMicros + budget.reservedMicros + maxCostMicros > budget.limitMicros) {
          throw new HarnessError("BUDGET_EXHAUSTED", "The tenant or run allowance cannot cover this call.");
        }
      }
      this.db.prepare("INSERT INTO calls (tenant_id, call_key, run_id, fingerprint, status, reservation, operation_kind) VALUES (?, ?, ?, ?, 'reserved', ?, ?)").run(scope.tenantId, key, scope.runId, fingerprint, maxCostMicros, operationKind);
      this.adjust(scope, "reserved = reserved + ?", [maxCostMicros]);
      this.append(scope, `${operationKind}.started`, metadata);
      return { cached: false };
    });
  }
  settle(scope: Scope, callId: string, actualCostMicros: number, result: Json | null, failureCode?: string) {
    CostMicros.parse(actualCostMicros);
    const overrun = this.transaction(() => {
      this.assertScope(scope);
      const key = JSON.stringify([scope.runId, callId]);
      const row = this.db.prepare("SELECT * FROM calls WHERE tenant_id = ? AND call_key = ?").get(scope.tenantId, key) as CallRow | undefined;
      if (!row || row.status !== "reserved") throw new HarnessError("INVALID_SETTLEMENT", "Only an outstanding reservation can be settled once.");
      const exceeded = actualCostMicros > row.reservation;
      this.adjust(scope, "reserved = reserved - ?, spent = spent + ?, blocked = MAX(blocked, ?)", [row.reservation, actualCostMicros, exceeded ? 1 : 0]);
      const status = exceeded ? "overrun" : failureCode ? "failed" : "succeeded";
      this.db.prepare("UPDATE calls SET status = ?, result = ? WHERE tenant_id = ? AND call_key = ?").run(status, result === null ? null : JSON.stringify(result), scope.tenantId, key);
      this.append(scope, `${row.operation_kind}.${status}`, { callId, actualCostMicros, code: exceeded ? "COST_OVERRUN" : failureCode ?? null });
      return exceeded;
    });
    if (overrun) throw new HarnessError("COST_OVERRUN", "Reported cost exceeded its bound. Further calls are blocked pending reconciliation.");
  }
  uncertain(scope: Scope, callId: string, code: string) {
    this.transaction(() => {
      this.assertScope(scope);
      const key = JSON.stringify([scope.runId, callId]);
      const row = this.db.prepare("SELECT operation_kind FROM calls WHERE tenant_id = ? AND call_key = ?").get(scope.tenantId, key);
      const updated = this.db.prepare("UPDATE calls SET status = 'uncertain' WHERE tenant_id = ? AND call_key = ? AND status = 'reserved'").run(scope.tenantId, key);
      if (Number(updated.changes)) this.append(scope, `${row?.operation_kind ?? "tool"}.uncertain`, { callId, code, reservationRetained: true });
    });
  }
  events(scope: Scope): { kind: string; detail: Json; createdAt: string }[] {
    this.assertScope(scope);
    return this.db.prepare("SELECT kind, detail, created_at FROM journal WHERE tenant_id = ? AND run_id = ? ORDER BY seq").all(scope.tenantId, scope.runId)
      .map((row) => ({ kind: String(row.kind), detail: JSON.parse(String(row.detail)) as Json, createdAt: String(row.created_at) }));
  }
  hasUnresolved(scope: Scope): boolean {
    this.assertScope(scope);
    return !!this.db.prepare("SELECT 1 FROM calls WHERE tenant_id = ? AND run_id = ? AND status IN ('reserved', 'uncertain') LIMIT 1")
      .get(scope.tenantId, scope.runId);
  }
  private adjust(scope: Scope, sql: string, values: number[]) {
    // SQL fragments above are fixed server code; identifiers and values are bound.
    for (const key of ["tenant", `run:${scope.runId}`]) this.db.prepare(`UPDATE budgets SET ${sql} WHERE tenant_id = ? AND scope_key = ?`).run(...values, scope.tenantId, key);
  }
  private append(scope: Scope, kind: string, detail: Json) {
    this.db.prepare("INSERT INTO journal (tenant_id, run_id, kind, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(scope.tenantId, scope.runId, kind, JSON.stringify(detail), new Date().toISOString());
  }
  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const value = work(); this.db.exec("COMMIT"); return value; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  close() { this.db.close(); }
}
