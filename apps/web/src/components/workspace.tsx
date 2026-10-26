"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleHelp, Clock3, CloudCheck, Compass, FileCheck2, History, Leaf, LoaderCircle, LockKeyhole, MessageCircle, Pause, PieChart, Play, Plus, RefreshCw, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { currentStep, DemoStateSchema, equityCents, questions, steps, type Command, type DemoState, type Mandate, type Proposal } from "@pip/domain";

type Tab = "conversation" | "portfolio" | "mandate" | "activity";
type Action = Command extends infer C ? C extends Command ? Omit<C, "expectedRevision"> : never : never;
const money = (cents: number, exact = false) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: exact ? 2 : 0 }).format(cents / 100);
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);
const riskLabels = { careful: "Careful", balanced: "Balanced", growth: "Growth focused" };
const tabs = [
  { id: "conversation" as const, label: "Conversation", icon: MessageCircle },
  { id: "portfolio" as const, label: "Paper portfolio", icon: PieChart },
  { id: "mandate" as const, label: "Your mandate", icon: ShieldCheck },
  { id: "activity" as const, label: "Activity", icon: History },
];
const headings: Record<Tab, { title: string; description: string }> = {
  conversation: { title: "What are your investing goals?", description: "Start with your goals. Build a mandate, then explore a paper plan." },
  portfolio: { title: "Paper portfolio", description: "Your allocation, proposals, and simulated decisions." },
  mandate: { title: "Your mandate", description: "Review the goals and limits your agent will work within." },
  activity: { title: "Activity", description: "Your approvals, reviews, and paper decisions." },
};

function PipMark({ small = false }: { small?: boolean }) {
  return <span className={`pip-mark ${small ? "small" : ""}`} aria-hidden="true"><Compass size={small ? 17 : 23} strokeWidth={1.6} /></span>;
}
function Pill({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "neutral" | "amber" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
function EmptyPanel({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-panel"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{children}</p>{action}</div>;
}

export function Workspace() {
  const [state, setState] = useState<DemoState | null>(null);
  const [tab, setTab] = useState<Tab>("conversation");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const cancelReset = useRef<HTMLButtonElement>(null);

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/v1/workspace", { cache: "no-store", signal });
    if (!response.ok) throw new Error("The workspace could not be opened. Please try again.");
    setState(DemoStateSchema.parse(await response.json()));
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (end.current) end.current.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [state?.messages.length, tab]);
  useEffect(() => {
    if (!resetOpen) return;
    cancelReset.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setResetOpen(false); resetButton.current?.focus(); }
      if (event.key === "Tab") {
        event.preventDefault();
        const buttons = document.querySelectorAll<HTMLButtonElement>("[role=dialog] button");
        const index = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [resetOpen]);

  async function run(command: Action): Promise<boolean> {
    if (!state || busy) return false;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/v1/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...command, expectedRevision: state.revision }) });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status === 401) await load();
        throw new Error(payload.error ?? "Could not save this change.");
      }
      setState(DemoStateSchema.parse(payload));
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); return false; }
    finally { setBusy(false); }
  }
  const step = state ? currentStep(state.profile) : null;
  const complete = state ? steps.filter((s) => state.profile[s] !== undefined).length : 0;
  async function answer(value: string) {
    if (step && await run({ type: "answer", step, value })) setDraft("");
  }
  function submit(event: FormEvent) { event.preventDefault(); if (draft.trim()) void answer(draft); }
  const profile = state?.profile;
  const mandate = state?.mandate;
  const approved = mandate?.status === "approved";
  const heading = headings[tab];

  return <div className="app-shell">
    <a href="#workspace" className="skip-link">Skip to workspace</a>
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Pip home"><PipMark /><span>Pip</span></a>
      <div className="workspace-label">Workspace</div>
      <nav aria-label="Main navigation">{tabs.map(({ id, icon: Icon, label }) => <button key={id} onClick={() => { setTab(id); setError(null); }} className={`nav-item ${tab === id ? "active" : ""}`} aria-current={tab === id ? "page" : undefined}>
        <Icon size={18} strokeWidth={1.7} /><span>{label}</span>{id === "mandate" && mandate?.status === "draft" && <span className="nav-dot" aria-label="Draft ready" />}
      </button>)}</nav>
      <div className="sidebar-bottom">
        <button ref={resetButton} className="new-demo" onClick={() => setResetOpen(true)} disabled={!state || busy}><Plus size={17} /> New demo</button>
        <div className="sidebar-profile"><span className="avatar">Y</span><div><strong>Your private demo</strong><small>Local prototype · working name</small></div><LockKeyhole size={14} /></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><strong>{tabs.find((t) => t.id === tab)?.label}</strong></div><div className="topbar-right"><span className="saved"><CloudCheck size={15} />{state ? "Saved locally" : "Opening workspace"}</span><Pill tone="neutral"><span className="status-dot" /> Paper demo</Pill></div></header>
      <main id="workspace" className="main-content">
        <div className={`page-heading ${tab === "conversation" ? "conversation-heading" : ""}`}><h1>{heading.title}</h1><p>{heading.description}</p></div>
        <div className="demo-notice"><LockKeyhole size={14} /><p>Paper demo. Scripted responses and sample prices. No real trades.</p></div>
        {error && <div className="error-banner" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button>{!state && <button onClick={() => void load().then(() => setError(null)).catch((e: Error) => setError(e.message))}>Try again</button>}</div>}
        {!state ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={25} /><p>Opening your workspace…</p></div> : <>
          {tab === "conversation" && <div className="workspace-grid">
            <section className="card conversation-card" aria-label="Conversation with Pip">
              <div className="card-top"><div className="agent-identity"><PipMark small /><div><h2>Pip</h2><p>Scripted demo</p></div></div><span className="conversation-status">{approved ? "Mandate approved" : `${complete} of 6 questions`}</span></div>
              <div className="message-list" role="log" aria-label="Conversation history" aria-live="polite">{state.messages.map((message) => <div key={message.id} className={`message ${message.role}`}>
                {message.role === "assistant" && <span className="message-mark"><PipMark small /></span>}
                <div><span className="message-label">{message.role === "assistant" ? "Pip" : "You"}</span><p>{message.content}</p></div>
              </div>)}<div ref={end} /></div>
              {step ? <div className="composer-area"><div className="quick-choices">{questions[step].choices.map((choice) => <button key={choice.value} disabled={busy} onClick={() => void answer(choice.value)}>{choice.label}<ArrowUpRight size={13} /></button>)}</div><form className="composer" onSubmit={submit}><label htmlFor="message" className="sr-only">{questions[step].title}</label><input id="message" name="message" autoComplete="off" maxLength={1200} inputMode={step === "capitalCents" || step === "lossReviewPct" ? "decimal" : "text"} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={questions[step].placeholder} disabled={busy} /><button className="send-button" aria-label="Send answer" disabled={busy || !draft.trim()}>{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={19} />}</button></form><p className="composer-note"><LockKeyhole size={11} /> Your answers stay in this local demo. No model receives them.</p></div> : <div className="conversation-next"><div><FileCheck2 size={20} /><p>{approved ? "Your mandate is approved. Explore your paper proposal." : "Your draft mandate is ready."}</p></div><button className="primary-button" onClick={() => setTab(approved ? "portfolio" : "mandate")}>{approved ? "Explore paper portfolio" : "Review your mandate"}<ArrowRight size={16} /></button></div>}
            </section>
            <div className="side-stack"><section className="card profile-card"><h2>Your profile</h2><div className="progress-track" aria-label={`${complete} of 6 profile questions answered`}>{steps.map((s) => <span key={s} className={profile?.[s] !== undefined ? "filled" : ""} />)}</div><dl className="profile-facts"><div><dt>Paper capital</dt><dd>{profile?.capitalCents ? money(profile.capitalCents) : "Not set"}</dd></div><div><dt>Time horizon</dt><dd>{profile?.horizon ? titleCase(profile.horizon) : "Not set"}</dd></div><div><dt>Risk preference</dt><dd>{profile?.risk ? riskLabels[profile.risk] : "Not set"}</dd></div><div><dt>Mandate</dt><dd><span className={`fact-status ${mandate ? "ready" : ""}`}>{mandate ? titleCase(mandate.status) : "Not set"}</span></dd></div></dl>{mandate && <button className="text-button" onClick={() => setTab("mandate")}>View mandate <ArrowRight size={14} /></button>}</section>
            </div>
          </div>}
          {tab === "mandate" && (mandate ? <MandateView mandate={mandate} busy={busy} onApprove={async () => { if (await run({ type: "approve-mandate", mandateId: mandate.id })) setTab("portfolio"); }} /> : <section className="card"><EmptyPanel icon={<ShieldCheck size={30} />} title="Complete your profile first." action={<button className="primary-button" onClick={() => setTab("conversation")}>Continue the conversation<ArrowRight size={16} /></button>}>Your answers become a draft mandate with clear limits. Nothing is approved automatically.</EmptyPanel></section>)}
          {tab === "portfolio" && (state.portfolio && mandate ? <PortfolioView state={state} busy={busy} onApply={() => void run({ type: "apply-paper", proposalId: state.proposal!.id })} onReview={() => void run({ type: "review" })} onPause={() => void run({ type: "pause", paused: !state.paused })} /> : <section className="card"><EmptyPanel icon={<Wallet size={30} />} title="Create your paper portfolio" action={<button className="primary-button" onClick={() => setTab(mandate ? "mandate" : "conversation")}>{mandate ? "Review your mandate" : "Build your paper plan"}<ArrowRight size={16} /></button>}>Approve your mandate to open a separate paper portfolio. Your real Hyperliquid account is not connected.</EmptyPanel></section>)}
          {tab === "activity" && <div className="workspace-grid"><section className="card activity-card"><div className="card-top"><h2>Recent activity</h2><Pill tone="neutral">{state.activity.length} events</Pill></div><ol className="activity-list">{state.activity.map((item, index) => <li key={item.id}><span className={`activity-marker ${index === 0 ? "latest" : ""}`}><Check size={13} /></span><div><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("en-SG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Singapore" }).format(new Date(item.createdAt))} SGT</time><h3>{item.title}</h3><p>{item.detail}</p></div></li>)}</ol></section><div className="side-stack"><section className="card profile-card"><div className="section-label"><span>Usage</span><Sparkles size={17} /></div><div className="usage-number">$0<span>.00</span></div><p className="muted">Actual model cost in this demo</p><dl className="profile-facts"><div><dt>Model calls</dt><dd>0</dd></div><div><dt>Scripted reviews</dt><dd>{state.usage.researchRuns} / 20</dd></div><div><dt>Daily schedule</dt><dd>Not active yet</dd></div><div><dt>Paper decisions</dt><dd>{state.orders.length} fills</dd></div></dl><p className="fine-print">The daily review worker and paid research are later milestones. The demo only runs on your request.</p></section></div></div>}
        </>}
        <footer className="page-footer"><span>Demo data saved locally</span><span>USD · Paper only</span></footer>
      </main>
    </div>
    {resetOpen && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><span className="empty-icon"><RefreshCw size={25} /></span><h2 id="reset-title">Start a new demo?</h2><p>This replaces your current demo conversation, mandate, paper portfolio, and activity. Other browser sessions are unaffected.</p><div className="modal-actions"><button ref={cancelReset} className="secondary-button" disabled={busy} onClick={() => { setResetOpen(false); resetButton.current?.focus(); }}>Cancel</button><button className="primary-button" disabled={busy} onClick={async () => { if (await run({ type: "reset" })) { setResetOpen(false); setTab("conversation"); setDraft(""); resetButton.current?.focus(); } }}>Start fresh<ArrowRight size={15} /></button></div></section></div>}
  </div>;
}

function MandateView({ mandate, busy, onApprove }: { mandate: Mandate; busy: boolean; onApprove: () => void }) {
  const approved = mandate.status === "approved";
  return <div className="workspace-grid"><section className="card mandate-card"><div className="card-top"><div><span className="eyebrow">MANDATE · VERSION {mandate.version}</span><h2>Paper mandate</h2></div><Pill tone={approved ? "green" : "amber"}>{approved ? <CheckCheck size={13} /> : <Clock3 size={13} />}{approved ? "Approved" : "Awaiting approval"}</Pill></div><div className="mandate-body"><div className="goal-quote"><span className="eyebrow">IN YOUR WORDS</span><p>“{mandate.goal}”</p></div><div className="mandate-metrics"><div><span>Allocated paper capital</span><strong>{money(mandate.capitalCents)}</strong></div><div><span>Time horizon</span><strong>{titleCase(mandate.horizon)}</strong></div><div><span>Risk preference</span><strong>{riskLabels[mandate.risk]}</strong></div></div><h3>Limits</h3><dl className="limits-list"><div><dt>Maximum gross exposure</dt><dd>{mandate.maxExposurePct}% of paper equity</dd></div><div><dt>Maximum single position</dt><dd>{mandate.maxPositionPct}% of paper equity</dd></div><div><dt>Permitted examples</dt><dd>BTC & ETH spot · Long only</dd></div><div><dt>Borrowed exposure</dt><dd>None · 1× maximum</dd></div><div><dt>Pause and review trigger</dt><dd>{mandate.lossReviewPct}% decline</dd></div><div><dt>Capital needed within 3 months</dt><dd>{mandate.liquidity === "soon" ? "Yes" : "No"}</dd></div><div><dt>Planned review cadence</dt><dd>Daily + on request</dd></div><div><dt>Authority granted</dt><dd className="green-text">Paper decisions only</dd></div></dl><p className="fine-print">Exposure includes positions and proposed purchases. Review triggers do not cap losses. The scripted prototype does not automatically monitor prices or run daily reviews. Approval does not create a wallet connection or grant trading authority.</p>{!approved ? <div className="approval-box"><ShieldCheck size={21} /><div><strong>Review these limits before approving.</strong><p>These are proposed demo settings. Start a fresh demo if you want different answers before approving.</p></div><button className="primary-button" disabled={busy} onClick={onApprove}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Approve paper mandate</button></div> : <div className="approved-note"><ShieldCheck size={18} /> Approved {new Date(mandate.approvedAt!).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" })}. This version is read-only.</div>}</div></section><div className="side-stack"><section className="card profile-card"><span className="round-icon"><ShieldCheck size={23} /></span><h2>Mandate controls</h2><p className="muted">Pip proposes a plan. Your approved mandate sets its limits.</p><ul className="check-list"><li><Check size={15} /> Explicit approval first</li><li><Check size={15} /> Independent proposal checks</li><li><Check size={15} /> No live signing capability</li><li><Check size={15} /> Decisions saved to your history</li></ul></section></div></div>;
}

function PortfolioView({ state, busy, onApply, onReview, onPause }: { state: DemoState; busy: boolean; onApply: () => void; onReview: () => void; onPause: () => void }) {
  const portfolio = state.portfolio!;
  const equity = equityCents(portfolio);
  const invested = portfolio.positions.reduce((sum, p) => sum + p.marketValueCents, 0);
  const proposal = state.proposal;
  const canApply = proposal?.status === "proposed" && proposal.checks.every((c) => c.passed) && !state.paused;
  const cashPercent = equity ? Math.round(portfolio.cashCents / equity * 100) : 100;
  return <>
    <div className="portfolio-metrics"><div className="card metric-card"><span>Total paper equity <Wallet size={16} /></span><strong>{money(equity, true)}</strong><small>Starting capital {money(portfolio.startingCapitalCents)}</small></div><div className="card metric-card"><span>Available paper cash <Leaf size={16} /></span><strong>{money(portfolio.cashCents, true)}</strong><small>{cashPercent}% of paper equity</small></div><div className="card metric-card"><span>Paper P&L <ArrowDownRight size={16} /></span><strong>{portfolio.feesCents ? "−" : ""}{money(portfolio.feesCents, true)}</strong><small>Fixed marks · hypothetical fees only</small></div></div>
    <div className="workspace-grid portfolio-grid"><div className="side-stack"><section className="card holdings-card"><div className="card-top"><h2>Allocation</h2><Pill tone="neutral">Synthetic marks</Pill></div><div className="holdings-summary"><div className="allocation-ring" style={{ background: `conic-gradient(var(--green) 0% ${100 - cashPercent}%, var(--chart-track) ${100 - cashPercent}% 100%)` }} role="img" aria-label={`${100 - cashPercent}% invested, ${cashPercent}% cash`}><div><strong>{100 - cashPercent}%</strong><span>invested</span></div></div><div className="allocation-legend"><div><span><i className="legend-dot green" />Spot positions</span><strong>{money(invested)}</strong></div><div><span><i className="legend-dot cash" />Paper cash</span><strong>{money(portfolio.cashCents)}</strong></div></div></div>{portfolio.positions.length ? <div className="position-list">{portfolio.positions.map((p) => <div key={p.symbol}><span className={`coin ${p.symbol.toLowerCase()}`}>{p.symbol === "BTC" ? "₿" : "Ξ"}</span><div><strong>{p.symbol}</strong><small>{p.quantity.toFixed(6)} units · Spot</small></div><strong>{money(p.marketValueCents, true)}</strong></div>)}</div> : <p className="cash-note"><Leaf size={16} /> All paper capital is currently in cash. A proposal is not a position until you record the decision.</p>}</section>
      {proposal && <ProposalCard proposal={proposal} state={state} busy={busy} canApply={!!canApply} onApply={onApply} />}
    </div><div className="side-stack"><section className="card profile-card"><div className="section-label"><span>Controls</span><ShieldCheck size={18} /></div><h2>{state.paused ? "Paper decisions paused" : "Paper controls"}</h2><p className="muted">Pause new paper decisions at any time. Existing paper positions remain in place.</p><button className="secondary-button full-width" disabled={busy} onClick={onPause}>{state.paused ? <Play size={15} /> : <Pause size={15} />}{state.paused ? "Resume paper decisions" : "Pause new paper risk"}</button><button className="text-button" disabled={busy || proposal?.status === "proposed" || state.usage.researchRuns >= 20} onClick={onReview}><RefreshCw size={14} /> Request a scripted review</button><div className="mini-divider" /><dl className="profile-facts"><div><dt>Authority</dt><dd>Paper only</dd></div><div><dt>Review allowance</dt><dd>{state.usage.researchRuns} / 20</dd></div><div><dt>Model cost</dt><dd>$0.00</dd></div></dl></section><div className="connection-note"><LockKeyhole size={19} /><div><strong>Connections</strong><p>MetaMask and Hyperliquid are not connected in this prototype. These balances are simulated.</p></div></div></div></div>
  </>;
}

function ProposalCard({ proposal, state, busy, canApply, onApply }: { proposal: Proposal; state: DemoState; busy: boolean; canApply: boolean; onApply: () => void }) {
  const notional = proposal.allocations.reduce((sum, row) => sum + row.amountCents, 0);
  return <section className="card proposal-card"><div className="card-top"><div className="proposal-label"><Sparkles size={16} /><span>Sample proposal</span></div><Pill tone={proposal.status === "applied" ? "green" : "amber"}>{proposal.status === "applied" ? "Recorded in paper" : "For your review"}</Pill></div><div className="proposal-body"><h2>{proposal.title}</h2><p>{proposal.rationale}</p>{proposal.allocations.length > 0 && <div className="proposal-allocations">{proposal.allocations.map((row) => <div key={row.symbol}><span className={`coin ${row.symbol.toLowerCase()}`}>{row.symbol === "BTC" ? "₿" : "Ξ"}</span><div><strong>Buy {row.symbol} spot</strong><small>Hypothetical market fill · No leverage</small></div><strong>{money(row.amountCents)}</strong></div>)}</div>}<div className="proposal-facts"><div><span>Gross proposed notional</span><strong>{money(notional)}</strong></div><div><span>Estimated example fees</span><strong>{money(proposal.estimatedFeesCents, true)}</strong></div><div><span>Funding</span><strong>None · Spot examples</strong></div></div><details className="evidence-details"><summary><CircleHelp size={15} /> Evidence, trade-offs & assumptions <ChevronRight size={15} /></summary><div><p><strong>Counterargument:</strong> {proposal.opposingCase}</p><p><strong>Illustrative stress:</strong> A simultaneous 20% price decline would reduce these proposed positions by {money(notional * 0.2)}, before further costs. This is one hypothetical scenario, not a maximum loss.</p><p><strong>Source:</strong> {proposal.source}. Fixture date: 26 October 2026. BTC $100,000; ETH $3,000. These are invented testing marks, not observed prices.</p><p><strong>Execution assumptions:</strong> Immediate full fills at the fixture mark and 0.05% hypothetical fees. No spreads, slippage, depth, funding or live order behaviour is modelled. No live research or return forecast was performed.</p><p><strong>Mandate:</strong> Version {proposal.mandateVersion}. Proposal expires one hour after creation. Recorded checks are an audit snapshot.</p></div></details><div className="risk-checks"><div className="risk-checks-heading"><ShieldCheck size={16} /><strong>Independent mandate checks</strong><span>{proposal.checks.filter((c) => c.passed).length}/{proposal.checks.length}</span></div>{proposal.checks.map((check) => <div className={`risk-check ${!check.passed ? "failed" : ""}`} key={check.name}><span>{check.passed ? <Check size={13} /> : <X size={13} />}{check.name}</span><small>{check.passed ? "Passed" : "Blocked"}</small></div>)}</div>{proposal.status === "proposed" ? <button className="primary-button full-width" disabled={busy || !canApply} onClick={onApply}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{state.paused ? "Paper decisions paused" : proposal.allocations.length ? "Record this paper decision" : "Record no-action decision"}</button> : <div className="approved-note"><CheckCheck size={17} /> Saved to your paper portfolio and activity.</div>}<p className="button-caption">A paper record only. No real order or wallet signature.</p></div></section>;
}
