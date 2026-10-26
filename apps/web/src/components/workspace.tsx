"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, LoaderCircle, MoreHorizontal, X } from "lucide-react";
import { checkProposal, currentStep, DemoStateSchema, equityCents, questions, type Command, type DemoState, type Mandate } from "@pip/domain";
import { WalletButton } from "./wallet-button";
import type { WalletState } from "./browser-wallet";
import { HyperliquidStatus } from "./hyperliquid-status";

type Action = Command extends infer C ? C extends Command ? Omit<C, "expectedRevision"> : never : never;
const money = (cents: number, exact = false) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: exact ? 2 : 0 }).format(cents / 100);
const riskLabels = { careful: "Careful", balanced: "Balanced", growth: "Growth focused" };
function conversationTime(value: string) {
  const date = new Date(value);
  const day = date.toDateString() === new Date().toDateString() ? "Today" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  return `${day} ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

export function Workspace() {
  const [state, setState] = useState<DemoState | null>(null);
  const [draft, setDraft] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [summaryOpen, setSummaryOpen] = useState(false), [resetOpen, setResetOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null), menu = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLDialogElement>(null), reset = useRef<HTMLDialogElement>(null), input = useRef<HTMLTextAreaElement>(null);
  function scrollToLatest() {
    end.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "end" });
  }

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/v1/workspace", { cache: "no-store", signal });
    if (!response.ok) throw new Error("Couldn’t open Pip. Please try again.");
    setState(DemoStateSchema.parse(await response.json()));
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    scrollToLatest();
  }, [state?.messages.length, pendingAnswer]);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, 160)}px`;
  }, [draft]);
  useEffect(() => { if (summaryOpen) summary.current?.showModal(); else summary.current?.close(); }, [summaryOpen]);
  useEffect(() => { if (resetOpen) reset.current?.showModal(); else reset.current?.close(); }, [resetOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menu.current?.querySelector("button")?.focus(); } };
    window.addEventListener("pointerdown", outside); window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  async function run(command: Action): Promise<boolean> {
    if (!state || busy) return false;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/v1/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...command, expectedRevision: state.revision }) });
      const body = await response.json();
      if (!response.ok) { if (response.status === 409 || response.status === 401) await load(); throw new Error(body.error ?? "Couldn’t save that. Please try again."); }
      setState(DemoStateSchema.parse(body)); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); return false; }
    finally { setBusy(false); }
  }
  const step = state ? currentStep(state.profile) : null, mandate = state?.mandate;
  const proposal = state?.proposal;
  const checks = state && proposal?.status === "proposed" ? checkProposal(state, proposal) : [];
  async function answer(value: string) {
    if (!step || busy) return;
    setPendingAnswer(value);
    try {
      if (await run({ type: "answer", step, value })) {
        setDraft(""); requestAnimationFrame(() => input.current?.focus());
      }
    } finally { setPendingAnswer(null); }
  }
  function submit(event: FormEvent) { event.preventDefault(); if (draft.trim() && !busy) void answer(draft.trim()); }

  return <div className="pip-app">
    <a href="#conversation" className="skip-link">Skip to conversation</a>
    <header className="pip-header">
      <div className="pip-header-brand"><a className="pip-brand" href="/" aria-label="Pip home">pip.</a><span className="pip-demo-label">Scripted paper demo</span></div>
      <div className="pip-header-actions"><HyperliquidStatus refreshKey={walletState} /><WalletButton compact onChange={setWalletState} />
        <div className="pip-menu" ref={menu}><button className="icon-button" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} strokeWidth={1.6} /></button>
          {menuOpen && <div className="pip-menu-items"><button disabled={!state} onClick={() => { setMenuOpen(false); setSummaryOpen(true); }}>Your summary</button><a href="/connect">Wallet settings</a><button disabled={!state || busy} onClick={() => { setMenuOpen(false); setResetOpen(true); }}>Start over…</button></div>}
        </div>
      </div>
    </header>

    <main id="conversation" className="pip-conversation">
      <div className="pip-thread" tabIndex={0} aria-label="Conversation history" onScroll={e => { const thread = e.currentTarget; setAwayFromLatest(thread.scrollHeight - thread.scrollTop - thread.clientHeight > 100); }}><div className="pip-thread-inner">
      {!state ? <div className="pip-loading" role="status"><LoaderCircle size={20} className="spin" /><span>Opening Pip…</span></div> : <>
        <time className="pip-conversation-time" dateTime={state.createdAt}>{conversationTime(state.createdAt)}</time>
        <div className="pip-messages" role="log" aria-label="Conversation with Pip" aria-live="polite" aria-relevant="additions">
          {state.messages.map(message => <ChatMessage key={message.id} role={message.role} content={message.content} />)}
          {pendingAnswer && <>
            <ChatMessage role="user" content={pendingAnswer} />
            <div className="pip-replying" role="status"><span className="pip-typing" aria-hidden="true"><i /><i /><i /></span><span className="sr-only">Pip is preparing a reply</span></div>
          </>}
        </div>
        {step && step !== "goal" && step !== "capitalCents" && <div className="pip-suggestions" aria-label="Suggested replies">{questions[step].choices.map(choice => <button key={choice.value} disabled={busy} onClick={() => void answer(choice.value)}>{choice.label}</button>)}</div>}
        {mandate?.status === "draft" && <section className="inline-plan" aria-labelledby="plan-title"><span className="small-label">Paper plan</span><h2 id="plan-title">Here’s what we’ll work with.</h2>
          <div className="plan-glance"><span><strong>{money(mandate.capitalCents)}</strong> simulated capital</span><span>{riskLabels[mandate.risk]} · {mandate.horizon}</span></div>
          <PlanDetails mandate={mandate} />
          <button className="primary-button" disabled={busy} onClick={() => void run({ type: "approve-mandate", mandateId: mandate.id })}>Approve paper plan</button>
          <p className="fine-print">This approves simulated decisions only.</p>
        </section>}
        {proposal?.status === "proposed" && <section className="inline-plan" aria-labelledby="proposal-title"><span className="small-label">Paper example</span><h2 id="proposal-title">{proposal.allocations.length ? "Try a starting allocation." : "Keep your paper capital where it is."}</h2>
          {proposal.allocations.map(row => <div className="simple-row" key={row.symbol}><span>Buy {row.symbol} spot</span><strong>{money(row.amountCents)}</strong></div>)}
          <details className="simple-details"><summary>Why this plan & its checks</summary><p>{proposal.rationale}</p><p>{proposal.opposingCase}</p><p>Example fees: {money(proposal.estimatedFeesCents, true)}. Invented prices dated 26 October 2026; these are not market quotes.</p>
            <ul className="simple-checks">{checks.map(c => <li key={c.name} className={c.passed ? "" : "blocked"}>{c.passed ? <Check size={14} /> : <X size={14} />}<span>{c.name}{!c.passed && `: ${c.detail}`}</span></li>)}</ul>
          </details>
          {checks.some(c => !c.passed) && <p className="blocked">{state.paused ? "Paper decisions are paused. Resume them in your summary." : "This proposal needs attention. Open its checks above."}</p>}
          <button className="primary-button" disabled={busy || checks.some(c => !c.passed)} onClick={() => void run({ type: "apply-paper", proposalId: proposal.id })}>{proposal.allocations.length ? "Try this paper plan" : "Record no change"}</button>
          <p className="fine-print">Simulated money. No real order.</p>
        </section>}
        {proposal?.status === "applied" && <div className="paper-follow-up"><button className="quiet-button" onClick={() => setSummaryOpen(true)}>View paper portfolio</button><button className="quiet-button" disabled={busy || state.usage.researchRuns >= 20} onClick={() => void run({ type: "review" })}>Review again</button></div>}
      </>}
      <div ref={end} className="pip-thread-end" />
      </div></div>
      <div className="pip-composer-area"><div className="pip-composer-inner">
        {awayFromLatest && <button className="pip-jump-latest" aria-label="Jump to latest message" onClick={scrollToLatest}><ArrowDown size={18} strokeWidth={1.5} /></button>}
        {error && <div className="pip-error" role="alert"><p>{error}</p><button className="icon-button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={17} /></button>{!state && <button className="quiet-button" onClick={() => void load().catch((e: Error) => setError(e.message))}>Try again</button>}</div>}
        <form className="pip-composer" onSubmit={submit}>
          <label htmlFor="message" className="sr-only">{step ? questions[step].title : "Message Pip"}</label>
          <textarea ref={input} id="message" rows={1} autoComplete="off" maxLength={1200} inputMode={step === "capitalCents" || step === "lossReviewPct" ? "decimal" : "text"} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (draft.trim() && !busy) void answer(draft.trim()); } }} placeholder={!state ? "Opening Pip…" : step === "goal" ? "Send a message" : step ? questions[step].placeholder : "Review your paper plan above to continue"} disabled={!state || !step || busy} />
          <button className="pip-send" aria-label="Send message" disabled={!step || busy || !draft.trim()}>{busy ? <LoaderCircle size={18} className="spin" /> : <ArrowUp size={20} strokeWidth={1.8} />}</button>
        </form>
      </div></div>
    </main>

    <dialog ref={summary} className="pip-summary" aria-labelledby="summary-title" onClose={() => setSummaryOpen(false)}><div className="dialog-heading"><h2 id="summary-title">Your summary</h2><button className="icon-button" aria-label="Close summary" onClick={() => setSummaryOpen(false)}><X size={20} /></button></div>
      {state && <>
        {state.profile.goal && <p className="summary-goal">{state.profile.goal}</p>}
        {state.portfolio ? <><span className="small-label">Paper portfolio</span><div className="summary-equity">{money(equityCents(state.portfolio), true)}</div><div className="simple-row"><span>Cash</span><strong>{money(state.portfolio.cashCents, true)}</strong></div>{state.portfolio.positions.map(p => <div className="simple-row" key={p.symbol}><span>{p.symbol}</span><strong>{money(p.marketValueCents, true)}</strong></div>)}<p className="fine-print">Fixed example prices. Hypothetical fees: {money(state.portfolio.feesCents, true)}.</p></> : <p className="muted">Your paper plan will appear as we talk.</p>}
        {mandate && <><PlanDetails mandate={mandate} />{mandate.status === "approved" && <button className="secondary-button" disabled={busy} onClick={() => void run({ type: "pause", paused: !state.paused })}>{state.paused ? "Resume paper decisions" : "Pause paper decisions"}</button>}</>}
        <details className="simple-details"><summary>Recent activity</summary>{state.activity.map(a => <div className="summary-event" key={a.id}><strong>{a.title}</strong><p>{a.detail}</p></div>)}</details>
        <p className="fine-print">Scripted reviews: {state.usage.researchRuns} / 20 · Model cost: $0.00. No scheduled reviews are active.</p>
      </>}
    </dialog>
    <dialog ref={reset} className="pip-reset" aria-labelledby="reset-title" onClose={() => setResetOpen(false)}><h2 id="reset-title">Start a new conversation?</h2><p>This resets this demo’s conversation and paper plan. Your wallet connection stays available.</p><div className="dialog-actions"><button className="secondary-button" disabled={busy} onClick={() => setResetOpen(false)}>Keep this one</button><button className="primary-button" disabled={busy} onClick={async () => { if (await run({ type: "reset" })) { setResetOpen(false); setDraft(""); } }}>Start over</button></div></dialog>
  </div>;
}

function ChatMessage({ role, content }: { role: "assistant" | "user"; content: string }) {
  return <div className={`pip-message ${role}`}>
    <div className="pip-bubble"><span className="sr-only">{role === "assistant" ? "Pip" : "You"}: </span>{content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
  </div>;
}

function PlanDetails({ mandate }: { mandate: Mandate }) {
  return <details className="simple-details"><summary>Plan limits</summary><dl className="plan-limits"><div><dt>Capital</dt><dd>{money(mandate.capitalCents)} simulated</dd></div><div><dt>Time horizon</dt><dd>{mandate.horizon}</dd></div><div><dt>Risk</dt><dd>{riskLabels[mandate.risk]}</dd></div><div><dt>Total exposure</dt><dd>Up to {mandate.maxExposurePct}%</dd></div><div><dt>Single position</dt><dd>Up to {mandate.maxPositionPct}%</dd></div><div><dt>Products</dt><dd>BTC & ETH spot · No borrowing</dd></div><div><dt>Review trigger</dt><dd>{mandate.lossReviewPct}% decline</dd></div><div><dt>Need capital soon</dt><dd>{mandate.liquidity === "soon" ? "Yes" : "No"}</dd></div><div><dt>Authority</dt><dd>Paper decisions only</dd></div></dl><p className="fine-print">A review trigger does not cap losses. This demo does not monitor markets or run scheduled reviews.</p></details>;
}
