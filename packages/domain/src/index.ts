import { z } from "zod";

export const CONTRACT_VERSION = "0.1.0";
export const FIXTURE_AS_OF = "2026-10-26T00:00:00.000Z";
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const cents = z.number().int().nonnegative().max(1_000_000_000);
export const ProfileSchema = z.object({
  goal: z.string().min(3).max(1200).optional(),
  capitalCents: cents.positive().optional(),
  horizon: z.enum(["weeks", "months", "years"]).optional(),
  risk: z.enum(["careful", "balanced", "growth"]).optional(),
  liquidity: z.enum(["soon", "flexible"]).optional(),
  lossReviewPct: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional(),
}).strict();
export type Profile = z.infer<typeof ProfileSchema>;
export const steps = ["goal", "capitalCents", "horizon", "risk", "liquidity", "lossReviewPct"] as const;
export type Step = (typeof steps)[number];
export const questions: Record<Step, { title: string; prompt: string; placeholder: string; choices: { label: string; value: string }[] }> = {
  goal: { title: "Your goal", prompt: "What would you like your money to do? We’ll explore it with a paper plan.", placeholder: "I’d like to grow my savings over time…", choices: [
    { label: "Grow my savings", value: "I want to grow my savings over time while understanding the risks." },
    { label: "Explore a strategy", value: "I want to explore a trading strategy in a paper portfolio before using real money." },
  ] },
  capitalCents: { title: "Paper capital", prompt: "How much pretend money should we start with? Choose an amount from $100 to $1,000,000.", placeholder: "Amount in USD", choices: [
    { label: "$5,000", value: "5000" }, { label: "$10,000", value: "10000" }, { label: "$25,000", value: "25000" },
  ] },
  horizon: { title: "Time horizon", prompt: "How long are you thinking?", placeholder: "Choose weeks, months, or years", choices: [
    { label: "Weeks", value: "weeks" }, { label: "Months", value: "months" }, { label: "Years", value: "years" },
  ] },
  risk: { title: "Risk preference", prompt: "How much risk feels comfortable for this paper plan?", placeholder: "Choose careful, balanced, or growth", choices: [
    { label: "Careful", value: "careful" }, { label: "Balanced", value: "balanced" }, { label: "Growth focused", value: "growth" },
  ] },
  liquidity: { title: "Access to capital", prompt: "Might you need this money in the next three months?", placeholder: "Choose soon or flexible", choices: [
    { label: "Yes, I may need it", value: "soon" }, { label: "No, I have flexibility", value: "flexible" },
  ] },
  lossReviewPct: { title: "Review trigger", prompt: "What decline should prompt a pause and review? This is a review trigger, not a guaranteed loss limit.", placeholder: "Choose 5, 10, or 20", choices: [
    { label: "5% decline", value: "5" }, { label: "10% decline", value: "10" }, { label: "20% decline", value: "20" },
  ] },
};

const MandateSchema = z.object({
  id: z.string(), version: z.number().int().positive(), status: z.enum(["draft", "approved"]),
  goal: z.string(), capitalCents: cents, horizon: z.enum(["weeks", "months", "years"]),
  risk: z.enum(["careful", "balanced", "growth"]), liquidity: z.enum(["soon", "flexible"]),
  lossReviewPct: z.number(), maxExposurePct: z.number(), maxPositionPct: z.number(),
  allowedSymbols: z.array(z.string()), productType: z.literal("spot"),
  leverage: z.literal(1), authority: z.literal("paper-only"), reviewCadence: z.literal("daily"),
  approvedAt: z.string().nullable(),
});
export type Mandate = z.infer<typeof MandateSchema>;
const CheckSchema = z.object({ name: z.string(), passed: z.boolean(), detail: z.string() });
export type RiskCheck = z.infer<typeof CheckSchema>;
const AllocationSchema = z.object({ symbol: z.string(), amountCents: cents, priceUsd: z.number().positive() });
export const ProposalSchema = z.object({
  id: z.string(), mandateId: z.string(), mandateVersion: z.number(), snapshotId: z.string(), createdAt: z.string(),
  title: z.string(), rationale: z.string(), opposingCase: z.string(), status: z.enum(["proposed", "applied"]),
  allocations: z.array(AllocationSchema), estimatedFeesCents: cents, checks: z.array(CheckSchema),
  source: z.literal("Internal synthetic fixture v1"), fixtureAsOf: z.string(),
});
export type Proposal = z.infer<typeof ProposalSchema>;
export const OrderSchema = z.object({
  id: z.string(), proposalId: z.string(), symbol: z.string(), direction: z.literal("buy"),
  mode: z.literal("paper"), status: z.literal("simulated-filled"), amountCents: cents,
  quantity: z.number().positive(), priceUsd: z.number().positive(), feeCents: cents, createdAt: z.string(),
});
export const PortfolioSchema = z.object({
  snapshotId: z.string(), updatedAt: z.string(), startingCapitalCents: cents, cashCents: cents,
  positions: z.array(z.object({ symbol: z.string(), quantity: z.number(), priceUsd: z.number(), marketValueCents: cents })),
  feesCents: cents,
});
export type Portfolio = z.infer<typeof PortfolioSchema>;
export const UsageSchema = z.object({ researchRuns: z.number().int().nonnegative(), modelCostCents: z.literal(0), modelCalls: z.literal(0) });
export const DemoStateSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION), user: z.object({ id: z.string(), displayName: z.literal("You") }),
  revision: z.number().int().nonnegative(), createdAt: z.string(), profile: ProfileSchema,
  messages: z.array(z.object({ id: z.string(), role: z.enum(["user", "assistant"]), content: z.string(), createdAt: z.string() })),
  mandate: MandateSchema.nullable(), portfolio: PortfolioSchema.nullable(), proposal: ProposalSchema.nullable(),
  orders: z.array(OrderSchema), usage: UsageSchema, paused: z.boolean(),
  activity: z.array(z.object({ id: z.string(), title: z.string(), detail: z.string(), createdAt: z.string() })),
  capabilities: z.object({ liveExecution: z.literal(false), walletConnected: z.literal(false), liveMarketData: z.literal(false), scriptedAgent: z.literal(true) }),
});
export type DemoState = z.infer<typeof DemoStateSchema>;
const revision = z.number().int().nonnegative();
export const CommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer"), expectedRevision: revision, step: z.enum(steps), value: z.string().trim().min(1).max(1200) }).strict(),
  z.object({ type: z.literal("approve-mandate"), expectedRevision: revision, mandateId: z.string().uuid() }).strict(),
  z.object({ type: z.literal("apply-paper"), expectedRevision: revision, proposalId: z.string().uuid() }).strict(),
  z.object({ type: z.literal("review"), expectedRevision: revision }).strict(),
  z.object({ type: z.literal("pause"), expectedRevision: revision, paused: z.boolean() }).strict(),
  z.object({ type: z.literal("reset"), expectedRevision: revision }).strict(),
]);
export type Command = z.infer<typeof CommandSchema>;
export class DomainError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function currentStep(profile: Profile): Step | null { return steps.find((step) => profile[step] === undefined) ?? null; }
function message(state: DemoState, role: "user" | "assistant", content: string) {
  state.messages.push({ id: id(), role, content, createdAt: now() });
}
function event(state: DemoState, title: string, detail: string) {
  state.activity.unshift({ id: id(), title, detail, createdAt: now() });
}
export function createDemo(): DemoState {
  const state: DemoState = {
    contractVersion: CONTRACT_VERSION, user: { id: id(), displayName: "You" }, revision: 0, createdAt: now(), profile: {},
    messages: [], mandate: null, portfolio: null, proposal: null, orders: [],
    usage: { researchRuns: 0, modelCostCents: 0, modelCalls: 0 }, paused: false, activity: [],
    capabilities: { liveExecution: false, walletConnected: false, liveMarketData: false, scriptedAgent: true },
  };
  message(state, "assistant", questions.goal.prompt);
  event(state, "Your workspace is ready", "A private browser demo with simulated money and a scripted guide.");
  return state;
}
export function equityCents(portfolio: Portfolio): number {
  return portfolio.cashCents + portfolio.positions.reduce((total, position) => total + position.marketValueCents, 0);
}
function draftMandate(profile: Profile): Mandate {
  if (currentStep(profile)) throw new DomainError("Complete your profile before creating a mandate.");
  const cautious = profile.horizon === "weeks" || profile.liquidity === "soon";
  const limits = { careful: [30, 25], balanced: [50, 35], growth: [70, 45] }[profile.risk!];
  return {
    id: id(), version: 1, status: "draft", goal: profile.goal!, capitalCents: profile.capitalCents!,
    horizon: profile.horizon!, risk: profile.risk!, liquidity: profile.liquidity!, lossReviewPct: profile.lossReviewPct!,
    maxExposurePct: cautious ? 0 : limits[0], maxPositionPct: limits[1], allowedSymbols: ["BTC", "ETH"],
    productType: "spot", leverage: 1, authority: "paper-only", reviewCadence: "daily", approvedAt: null,
  };
}
export function checkProposal(state: DemoState, proposal: Proposal, at = Date.now()): RiskCheck[] {
  const { mandate, portfolio } = state;
  const amount = proposal.allocations.reduce((total, row) => total + row.amountCents, 0);
  const existing = portfolio?.positions.reduce((total, p) => total + p.marketValueCents, 0) ?? 0;
  const equity = portfolio ? equityCents(portfolio) : 0;
  const afterEquity = equity - proposal.estimatedFeesCents;
  const fresh = at - Date.parse(proposal.createdAt);
  return [
    { name: "Approved mandate", passed: mandate?.status === "approved" && mandate.id === proposal.mandateId && mandate.version === proposal.mandateVersion, detail: "The proposal must match the approved mandate version." },
    { name: "Paper authority only", passed: mandate?.authority === "paper-only" && state.capabilities.liveExecution === false, detail: "This workspace has no live execution capability." },
    { name: "Monitoring controls", passed: !state.paused, detail: state.paused ? "New paper risk is paused." : "New paper decisions are enabled." },
    { name: "Current paper snapshot", passed: portfolio?.snapshotId === proposal.snapshotId && fresh >= 0 && fresh <= 60 * 60 * 1000, detail: "Uses the current synthetic portfolio; proposals expire after one hour." },
    { name: "Supported instruments", passed: proposal.allocations.every((a) => mandate?.allowedSymbols.includes(a.symbol) && a.priceUsd === (a.symbol === "BTC" ? 100_000 : 3_000)), detail: "BTC and ETH spot examples only. Derivatives and borrowed exposure are unsupported in this slice." },
    { name: "Gross exposure", passed: afterEquity > 0 && existing + amount <= Math.floor(afterEquity * (mandate?.maxExposurePct ?? 0) / 100), detail: "Includes existing positions and the estimated fees in the equity denominator." },
    { name: "Position concentration", passed: afterEquity > 0 && proposal.allocations.every((a) => {
      const current = portfolio?.positions.find((p) => p.symbol === a.symbol)?.marketValueCents ?? 0;
      return current + a.amountCents <= Math.floor(afterEquity * (mandate?.maxPositionPct ?? 0) / 100);
    }), detail: "Each resulting position must stay within the approved concentration limit." },
    { name: "Available paper cash", passed: !!portfolio && amount + proposal.estimatedFeesCents <= portfolio.cashCents, detail: "Fully funded simulated purchases, including a hypothetical 0.05% fee." },
  ];
}
function makeProposal(state: DemoState): Proposal {
  const mandate = state.mandate!;
  const portfolio = state.portfolio!;
  const empty = portfolio.positions.length === 0;
  const allocations = empty && mandate.maxExposurePct > 0
    ? [{ symbol: "BTC", pct: mandate.risk === "careful" ? 18 : mandate.risk === "balanced" ? 28 : 38, priceUsd: 100_000 },
       { symbol: "ETH", pct: mandate.risk === "careful" ? 8 : mandate.risk === "balanced" ? 14 : 18, priceUsd: 3_000 }]
      .map((row) => ({ symbol: row.symbol, amountCents: Math.floor(equityCents(portfolio) * row.pct / 100), priceUsd: row.priceUsd }))
    : [];
  const proposal: Proposal = {
    id: id(), mandateId: mandate.id, mandateVersion: mandate.version, snapshotId: portfolio.snapshotId, createdAt: now(),
    title: allocations.length ? "Explore a measured starting allocation" : "Hold steady. Keep room to decide.",
    rationale: allocations.length
      ? "This scripted example illustrates two spot positions with a substantial cash reserve. It demonstrates mandate checks and paper accounting; it does not assess your goal or establish that these assets are suitable investments."
      : empty ? "Your short horizon or near-term liquidity need leads this scripted example to hold all paper capital in cash. There is no need to create a position just to complete a plan."
      : "The example portfolio already has positions. This scripted review proposes no additional risk. Prices have not been updated and this is not a new market assessment.",
    opposingCase: "Crypto assets can decline together. Cash can be preferable; this example contains no researched investment edge or forecast.",
    status: "proposed", allocations,
    estimatedFeesCents: allocations.reduce((total, a) => total + Math.ceil(a.amountCents * 0.0005), 0), checks: [],
    source: "Internal synthetic fixture v1", fixtureAsOf: FIXTURE_AS_OF,
  };
  proposal.checks = checkProposal(state, proposal);
  return proposal;
}
function parseAnswer(profile: Profile, step: Step, raw: string): { value: string | number; label: string } {
  const value = raw.trim();
  if (step === "goal") {
    if (value.length < 3) throw new DomainError("Tell me a little more about your goal.");
    return { value, label: value };
  }
  if (step === "capitalCents") {
    const clean = value.replace(/^\$\s*/, "").replace(/,/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new DomainError("Enter a dollar amount, such as 10000 or 10,000. Please use full numbers rather than 10k.");
    const capital = Math.round(Number(clean) * 100);
    if (!Number.isSafeInteger(capital) || capital < 10_000 || capital > 100_000_000) throw new DomainError("Choose simulated capital between $100 and $1,000,000.");
    return { value: capital, label: `Start with $${(capital / 100).toLocaleString("en-US")} in paper capital.` };
  }
  const choice = questions[step].choices.find((c) => c.value === value.toLowerCase() || c.label.toLowerCase() === value.toLowerCase());
  if (!choice) throw new DomainError(`For this scripted demo, choose one of the ${questions[step].title.toLowerCase()} options shown above.`);
  return { value: step === "lossReviewPct" ? Number(choice.value) : choice.value, label: choice.label };
}
export function applyCommand(input: DemoState, command: Command): DemoState {
  if (input.revision !== command.expectedRevision) throw new DomainError("Your workspace changed in another tab. Refresh and try again.", 409);
  const state = structuredClone(input);
  if (command.type === "reset") {
    const fresh = createDemo();
    fresh.revision = input.revision + 1;
    return fresh;
  }
  if (command.type === "answer") {
    const step = currentStep(state.profile);
    if (!step || command.step !== step || state.mandate) throw new DomainError("That answer does not match the current onboarding step.", 409);
    const answer = parseAnswer(state.profile, step, command.value);
    (state.profile as Record<string, unknown>)[step] = answer.value;
    state.profile = ProfileSchema.parse(state.profile);
    message(state, "user", answer.label);
    const next = currentStep(state.profile);
    if (next) message(state, "assistant", questions[next].prompt);
    else {
      state.mandate = draftMandate(state.profile);
      message(state, "assistant", "Your paper plan is ready below. Review the limits before approving it.");
      event(state, "Mandate drafted", "Your preferences became a draft. No authority has been granted.");
    }
  } else if (command.type === "approve-mandate") {
    if (!state.mandate || state.mandate.id !== command.mandateId || state.mandate.status !== "draft") throw new DomainError("This draft is no longer available for approval.", 409);
    state.mandate.status = "approved";
    state.mandate.approvedAt = now();
    state.portfolio = { snapshotId: id(), updatedAt: now(), startingCapitalCents: state.mandate.capitalCents, cashCents: state.mandate.capitalCents, positions: [], feesCents: 0 };
    state.proposal = makeProposal(state);
    state.usage.researchRuns++;
    message(state, "user", "I approve this paper-only mandate and its stated limits.");
    message(state, "assistant", "Your paper plan is approved. Here’s an example allocation to review. It uses simulated money and fixed sample prices.");
    event(state, "Paper mandate approved", "Version 1 approved. Live execution remains unavailable.");
    event(state, "Illustrative proposal prepared", "Synthetic fixture, zero model calls, $0 compute cost.");
  } else if (command.type === "apply-paper") {
    const proposal = state.proposal;
    if (!proposal || proposal.id !== command.proposalId) throw new DomainError("This proposal is no longer current.", 409);
    if (proposal.status === "applied") return input;
    const checks = checkProposal(state, proposal);
    if (checks.some((check) => !check.passed)) throw new DomainError(checks.filter((check) => !check.passed).map((check) => `${check.name}: ${check.detail}`).join(" "), 409);
    const portfolio = state.portfolio!;
    for (const allocation of proposal.allocations) {
      const feeCents = Math.ceil(allocation.amountCents * 0.0005);
      portfolio.cashCents -= allocation.amountCents + feeCents;
      portfolio.feesCents += feeCents;
      portfolio.positions.push({ symbol: allocation.symbol, quantity: allocation.amountCents / 100 / allocation.priceUsd, priceUsd: allocation.priceUsd, marketValueCents: allocation.amountCents });
      state.orders.push({ id: id(), proposalId: proposal.id, symbol: allocation.symbol, direction: "buy", mode: "paper", status: "simulated-filled", amountCents: allocation.amountCents, quantity: allocation.amountCents / 100 / allocation.priceUsd, priceUsd: allocation.priceUsd, feeCents, createdAt: now() });
    }
    portfolio.snapshotId = id();
    portfolio.updatedAt = now();
    proposal.checks = checks;
    proposal.status = "applied";
    event(state, proposal.allocations.length ? "Paper decision recorded" : "No-action decision recorded", "Hypothetical immediate fills at fixed fixture marks. Fees included; no real orders sent.");
    message(state, "assistant", "Your simulated decision has been recorded. The paper portfolio reflects hypothetical fees. No wallet or exchange was contacted.");
  } else if (command.type === "review") {
    if (state.mandate?.status !== "approved" || !state.portfolio) throw new DomainError("Approve a paper mandate before requesting a review.");
    if (state.usage.researchRuns >= 20) throw new DomainError("This demo’s 20-review allowance is used. Your portfolio and pause controls remain available.", 429);
    if (state.proposal?.status === "proposed") throw new DomainError("Record the current proposal before requesting another review.", 409);
    state.proposal = makeProposal(state);
    state.usage.researchRuns++;
    message(state, "user", "Review my paper portfolio.");
    message(state, "assistant", "Here’s another paper review. It uses the same sample prices, not live research.");
    event(state, "Manual paper review", "Recorded a scripted review against the current portfolio snapshot.");
  } else if (command.type === "pause") {
    if (state.mandate?.status !== "approved") throw new DomainError("Approve a paper mandate before changing its review controls.");
    state.paused = command.paused;
    if (state.proposal?.status === "proposed") state.proposal.checks = checkProposal(state, state.proposal);
    event(state, command.paused ? "New paper risk paused" : "Paper decisions resumed", "Existing paper positions are unchanged. This is not a close-position or withdrawal operation.");
  }
  state.revision++;
  return DemoStateSchema.parse(state);
}

export function contractSchemas() {
  return { contractVersion: CONTRACT_VERSION, command: z.toJSONSchema(CommandSchema), state: z.toJSONSchema(DemoStateSchema) };
}
