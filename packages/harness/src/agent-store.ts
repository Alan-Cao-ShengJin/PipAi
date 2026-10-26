import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { HarnessError, Identifier, type Json, type ResearchContext, type ToolCall } from "./contracts.ts";

export type AgentStatus = "queued" | "running" | "watching" | "needs-input" | "proposal-ready" | "infeasible" | "paused" | "budget-blocked" | "reconciliation-required" | "blocked";
export interface Cycle {
  context: ResearchContext;
  phase: "model" | "tools" | "done";
  modelCalls: number;
  toolCalls: number;
  messages: Json[];
  evidenceIds: string[];
  seenReads: string[];
  pending: ToolCall[];
  cursor: number;
}
export interface AgentGoal {
  tenantId: string; id: string; binding: string;
  status: AgentStatus; dueAt: number | null;
  summary: string; nextTask: string;
  cycle: Cycle | null;
  leaseToken: string | null; leaseUntil: number;
}
export interface Lease { tenantId: string; goalId: string; token: string }

// Public entry points are for authenticated backend/CLI code, not model tools.
export function goalBinding(context: ResearchContext): string {
  return JSON.stringify({ tenantId: context.scope.tenantId, accountId: context.scope.accountId,
    conversationId: context.scope.conversationId, allowedReadTools: [...context.scope.allowedReadTools].sort(),
    goal: context.goal, mandate: context.mandate });
}

export class AgentStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS agent_goals (
        tenant_id TEXT NOT NULL, goal_id TEXT NOT NULL, binding TEXT NOT NULL,
        status TEXT NOT NULL, due_at INTEGER, summary TEXT NOT NULL, next_task TEXT NOT NULL,
        cycle_json TEXT, lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, goal_id)
      );
      CREATE TABLE IF NOT EXISTS agent_requests (
        tenant_id TEXT NOT NULL, run_id TEXT NOT NULL, step INTEGER NOT NULL,
        request_json TEXT NOT NULL, PRIMARY KEY (tenant_id, run_id, step)
      );
      CREATE TABLE IF NOT EXISTS agent_updates (
        tenant_id TEXT NOT NULL, goal_id TEXT NOT NULL, run_id TEXT NOT NULL,
        status TEXT NOT NULL, detail_json TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY (tenant_id, goal_id, run_id)
      );
      CREATE TABLE IF NOT EXISTS agent_inputs (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, goal_id TEXT NOT NULL,
        message TEXT NOT NULL, created_at INTEGER NOT NULL
      );
    `);
  }
  create(id: string, context: ResearchContext, now: number) {
    Identifier.parse(id);
    this.db.prepare(`INSERT OR IGNORE INTO agent_goals
      (tenant_id, goal_id, binding, status, due_at, summary, next_task)
      VALUES (?, ?, ?, 'queued', ?, '', 'Assess the goal, discover eligible opportunities and test the strongest hypothesis.')`)
      .run(context.scope.tenantId, id, goalBinding(context), now);
    const goal = this.get(context.scope.tenantId, id);
    if (goal.binding !== goalBinding(context)) throw new HarnessError("GOAL_CONFLICT", "This goal is bound to a different mandate or account.");
    return goal;
  }
  get(tenant: string, id: string): AgentGoal {
    const row = this.db.prepare("SELECT * FROM agent_goals WHERE tenant_id = ? AND goal_id = ?").get(tenant, id);
    if (!row) throw new HarnessError("GOAL_NOT_FOUND", "No goal exists in this tenant scope.");
    return { tenantId: tenant, id, binding: String(row.binding), status: String(row.status) as AgentStatus,
      dueAt: row.due_at === null ? null : Number(row.due_at), summary: String(row.summary), nextTask: String(row.next_task),
      cycle: row.cycle_json ? JSON.parse(String(row.cycle_json)) as Cycle : null,
      leaseToken: row.lease_token ? String(row.lease_token) : null, leaseUntil: Number(row.lease_until) };
  }
  claim(tenant: string, id: string, now: number): Lease | null {
    return this.transaction(() => {
      const goal = this.get(tenant, id);
      if (!["queued", "running", "watching"].includes(goal.status) || goal.dueAt === null || goal.dueAt > now) return null;
      if (goal.leaseToken && goal.leaseUntil > now) return null;
      const token = randomUUID();
      this.db.prepare("UPDATE agent_goals SET status = 'running', lease_token = ?, lease_until = ? WHERE tenant_id = ? AND goal_id = ?")
        .run(token, now + 180_000, tenant, id);
      return { tenantId: tenant, goalId: id, token };
    });
  }
  assertLease(lease: Lease, now: number) {
    const goal = this.get(lease.tenantId, lease.goalId);
    if (goal.status !== "running" || goal.leaseToken !== lease.token || goal.leaseUntil <= now) {
      throw new HarnessError("LEASE_LOST", "The goal was paused or another worker owns it.");
    }
  }
  save(lease: Lease, cycle: Cycle, now: number) {
    const json = JSON.stringify(cycle);
    if (json.length > 500_000) throw new HarnessError("CHECKPOINT_LIMIT", "The research checkpoint is too large.");
    const update = this.db.prepare(`UPDATE agent_goals SET cycle_json = ?, lease_until = ?
      WHERE tenant_id = ? AND goal_id = ? AND status = 'running' AND lease_token = ? AND lease_until > ?`)
      .run(json, now + 180_000, lease.tenantId, lease.goalId, lease.token, now);
    if (!Number(update.changes)) throw new HarnessError("LEASE_LOST", "The research checkpoint lost its lease.");
  }
  recordRequest(lease: Lease, cycle: Cycle, request: Json, now: number) {
    this.transaction(() => {
      this.assertLease(lease, now);
      const json = JSON.stringify(request), runId = cycle.context.scope.runId;
      this.db.prepare("INSERT OR IGNORE INTO agent_requests (tenant_id, run_id, step, request_json) VALUES (?, ?, ?, ?)")
        .run(lease.tenantId, runId, cycle.modelCalls, json);
      const row = this.db.prepare("SELECT request_json FROM agent_requests WHERE tenant_id = ? AND run_id = ? AND step = ?")
        .get(lease.tenantId, runId, cycle.modelCalls);
      if (row?.request_json !== json) throw new HarnessError("REQUEST_CONFLICT", "A persisted model request cannot change during replay.");
    });
  }
  finish(lease: Lease, cycle: Cycle | null, status: AgentStatus, summary: string, nextTask: string, detail: Json, dueAt: number | null, now: number) {
    this.transaction(() => {
      this.assertLease(lease, now);
      if (cycle && status !== "paused") cycle.phase = "done";
      this.db.prepare(`UPDATE agent_goals SET status = ?, summary = ?, next_task = ?, due_at = ?, cycle_json = ?, lease_token = NULL, lease_until = 0
        WHERE tenant_id = ? AND goal_id = ?`)
        .run(status, summary, nextTask, dueAt, cycle ? JSON.stringify(cycle) : null, lease.tenantId, lease.goalId);
      if (cycle) this.db.prepare("INSERT OR IGNORE INTO agent_updates (tenant_id, goal_id, run_id, status, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(lease.tenantId, lease.goalId, cycle.context.scope.runId, status, JSON.stringify(detail), now);
    });
  }
  pause(tenant: string, id: string) {
    this.get(tenant, id);
    this.db.prepare("UPDATE agent_goals SET status = 'paused', due_at = NULL, lease_token = NULL, lease_until = 0 WHERE tenant_id = ? AND goal_id = ?").run(tenant, id);
  }
  // A user message may request fresh work; budget/uncertain states require reconciliation instead.
  requestReview(tenant: string, id: string, now: number, message?: string) {
    if (message !== undefined && (typeof message !== "string" || !message.trim() || message.length > 4000)) throw new HarnessError("INVALID_MESSAGE", "Use a nonempty research message of at most 4000 characters.");
    this.transaction(() => {
      const goal = this.get(tenant, id);
      if (!["watching", "needs-input", "proposal-ready", "infeasible", "paused"].includes(goal.status)) throw new HarnessError("REVIEW_BLOCKED", "Resolve the active or blocked cycle first.");
      if (message !== undefined) this.db.prepare("INSERT INTO agent_inputs (tenant_id, goal_id, message, created_at) VALUES (?, ?, ?, ?)").run(tenant, id, message, now);
      this.db.prepare("UPDATE agent_goals SET status = 'queued', due_at = ?, lease_token = NULL, lease_until = 0 WHERE tenant_id = ? AND goal_id = ?").run(now, tenant, id);
    });
  }
  recentInputs(tenant: string, id: string) {
    this.get(tenant, id);
    return this.db.prepare("SELECT message, created_at FROM agent_inputs WHERE tenant_id = ? AND goal_id = ? ORDER BY seq DESC LIMIT 5").all(tenant, id).reverse()
      .map(row => ({ message: String(row.message), createdAt: Number(row.created_at), trust: "user-intent; not an authority update" }));
  }
  updates(tenant: string, id: string) {
    this.get(tenant, id);
    return this.db.prepare("SELECT status, detail_json, created_at FROM agent_updates WHERE tenant_id = ? AND goal_id = ? ORDER BY created_at").all(tenant, id)
      .map(row => ({ status: String(row.status), detail: JSON.parse(String(row.detail_json)) as Json, createdAt: Number(row.created_at) }));
  }
  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = work(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  close() { this.db.close(); }
}
