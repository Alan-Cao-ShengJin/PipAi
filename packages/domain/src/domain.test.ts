import { describe, expect, it } from "vitest";
import { applyCommand, CommandSchema, createDemo, currentStep, checkProposal, DemoStateSchema, equityCents, type DemoState } from "./index";

function onboard(horizon = "years", liquidity = "flexible"): DemoState {
  let state = createDemo();
  for (const value of ["Explore my long-term savings", "10000", horizon, "balanced", liquidity, "10"]) {
    state = applyCommand(state, { type: "answer", step: currentStep(state.profile)!, value, expectedRevision: state.revision });
  }
  return state;
}
function approved() {
  const state = onboard();
  return applyCommand(state, { type: "approve-mandate", mandateId: state.mandate!.id, expectedRevision: state.revision });
}
describe("approval and authority", () => {
  it("loads an existing demo session without carrying forward retired connection capabilities", () => {
    const existing = approved();
    const saved = {
      ...existing,
      capabilities: { liveExecution: false, walletConnected: false, liveMarketData: false, scriptedAgent: true },
    };
    const restored = DemoStateSchema.parse(saved);
    expect(restored.capabilities).toEqual({ liveExecution: false, brokerConnected: false, liveMarketData: false, scriptedAgent: true });
    expect(restored.profile).toEqual(existing.profile);
    expect(restored.mandate).toEqual(existing.mandate);
    expect(restored.portfolio).toEqual(existing.portfolio);
    expect(restored.messages).toEqual(existing.messages);
  });
  it("requires explicit approval before creating a portfolio", () => {
    const draft = onboard();
    expect(draft.mandate?.status).toBe("draft");
    expect(draft.portfolio).toBeNull();
    expect(draft.capabilities.liveExecution).toBe(false);
    expect(() => applyCommand(draft, { type: "review", expectedRevision: draft.revision })).toThrow(/Approve/);
  });
  it("rejects injected authority, unknown commands, and skipped questions", () => {
    expect(CommandSchema.safeParse({ type: "live-order", expectedRevision: 0 }).success).toBe(false);
    expect(CommandSchema.safeParse({ type: "approve-mandate", expectedRevision: 0, mandateId: crypto.randomUUID(), leverage: 20 }).success).toBe(false);
    expect(() => applyCommand(createDemo(), { type: "answer", step: "risk", value: "growth", expectedRevision: 0 })).toThrow(/current onboarding/);
  });
  it("requires the exact draft id and cannot edit an approved mandate through chat", () => {
    const state = approved();
    expect(() => applyCommand(state, { type: "approve-mandate", mandateId: crypto.randomUUID(), expectedRevision: state.revision })).toThrow();
    expect(() => applyCommand(state, { type: "answer", step: "risk", value: "growth", expectedRevision: state.revision })).toThrow();
    expect(state.mandate?.leverage).toBe(1);
  });
  it("rejects malformed or excessive capital", () => {
    const state = applyCommand(createDemo(), { type: "answer", step: "goal", value: "My savings", expectedRevision: 0 });
    for (const value of ["10k", "-100", "Infinity", "0", "1000001", "12.345"]) {
      expect(() => applyCommand(state, { type: "answer", step: "capitalCents", value, expectedRevision: state.revision })).toThrow();
    }
  });
});
describe("paper accounting and independent checks", () => {
  it("includes fees, conserves equity less fees, and never calls a venue", () => {
    const state = approved();
    expect(state.proposal!.checks.every((check) => check.passed)).toBe(true);
    const result = applyCommand(state, { type: "apply-paper", proposalId: state.proposal!.id, expectedRevision: state.revision });
    expect(result.orders).toHaveLength(2);
    expect(equityCents(result.portfolio!)).toBe(1_000_000 - result.portfolio!.feesCents);
    expect(result.portfolio!.cashCents).toBeGreaterThanOrEqual(0);
    expect(result.orders.every((order) => order.mode === "paper")).toBe(true);
    expect(result.usage.modelCostCents).toBe(0);
  });
  it("blocks paused proposals even if their stored checks previously passed", () => {
    const state = approved();
    state.paused = true;
    expect(() => applyCommand(state, { type: "apply-paper", proposalId: state.proposal!.id, expectedRevision: state.revision })).toThrow(/paused/);
  });
  it("rejects stale, wrong-snapshot, and oversized proposals", () => {
    const state = approved();
    expect(checkProposal(state, state.proposal!, Date.parse(state.proposal!.createdAt) + 3_600_001).some((c) => !c.passed)).toBe(true);
    state.proposal!.snapshotId = "different";
    expect(checkProposal(state, state.proposal!).find((c) => c.name === "Current paper snapshot")?.passed).toBe(false);
    state.proposal!.allocations[0].amountCents = 2_000_000;
    expect(() => applyCommand(state, { type: "apply-paper", proposalId: state.proposal!.id, expectedRevision: state.revision })).toThrow(/exposure|cash/);
  });
  it("does not duplicate simulated fills after a retry", () => {
    const state = approved();
    const result = applyCommand(state, { type: "apply-paper", proposalId: state.proposal!.id, expectedRevision: state.revision });
    expect(() => applyCommand(result, { type: "apply-paper", proposalId: state.proposal!.id, expectedRevision: state.revision })).toThrow(/another tab/);
    const retried = applyCommand(result, { type: "apply-paper", proposalId: state.proposal!.id, expectedRevision: result.revision });
    expect(retried.orders).toHaveLength(2);
    expect(retried.portfolio!.cashCents).toBe(result.portfolio!.cashCents);
  });
  it("can hold all capital in cash when liquidity is needed", () => {
    const draft = onboard("months", "soon");
    const state = applyCommand(draft, { type: "approve-mandate", mandateId: draft.mandate!.id, expectedRevision: draft.revision });
    expect(state.proposal!.allocations).toEqual([]);
    expect(state.proposal!.checks.every((check) => check.passed)).toBe(true);
  });
  it("keeps pause controls available when the review allowance is exhausted", () => {
    const state = approved();
    state.usage.researchRuns = 20;
    expect(() => applyCommand(state, { type: "review", expectedRevision: state.revision })).toThrow(/allowance/);
    expect(applyCommand(state, { type: "pause", paused: true, expectedRevision: state.revision }).paused).toBe(true);
  });
});
