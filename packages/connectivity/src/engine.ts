import { randomUUID } from "node:crypto";
import { verifyMessage } from "viem";
import { z } from "zod";
import { Decimal } from "decimal.js";
import { Address, Id, MandateSchema, OrderSchema, ProposalSchema, cloid, deny, hash, type Mandate, type Proposal } from "./contracts.ts";
import { ExecutionStore, type Intent } from "./store.ts";
import { VenueOrderRejected, type TradingVenue } from "./venue.ts";
import { checkTrade } from "./risk.ts";

const ChallengeRequest = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sign-in"), address: Address }).strict(),
  z.object({ kind: z.literal("link-primary"), address: Address }).strict(),
  z.object({ kind: z.literal("link-trading"), address: Address }).strict(),
  z.object({ kind: z.literal("mandate"), mandate: MandateSchema }).strict(),
  z.object({ kind: z.literal("approve-proposal"), proposalId: Id }).strict(),
]);
export class ExecutionEngine {
  #store: ExecutionStore; #venue: TradingVenue; #origin: string; #now: () => number; #armed: boolean; #busy = false;
  constructor(options: { store: ExecutionStore; venue: TradingVenue; origin: string; armed?: boolean; now?: () => number }) {
    this.#store = options.store; this.#venue = options.venue; this.#origin = options.origin; this.#armed = options.armed === true; this.#now = options.now ?? Date.now;
  }
  status() {
    const mandate = this.#store.mandate();
    return { network: "testnet", armed: this.#armed, paused: this.#store.get<boolean>("paused") ?? true,
      primary: this.#store.get<string>("primary") ?? null, trading: this.#store.get<string>("trading") ?? null,
      agent: this.#venue.agentAddress, retired: this.#store.get<boolean>("retired") ?? false,
      agentRegistered: this.#store.get<boolean>("everApproved") ?? false,
      authorityExpired: !mandate || mandate.expiresAt <= this.#now(),
      mandate: mandate ?? null, proposals: this.#store.proposals(this.#now()), intents: this.#store.intents() };
  }
  #account() { return this.#store.get<`0x${string}`>("trading") ?? deny("NOT_LINKED", "Connect your trading account first."); }
  #mandate() {
    const m = this.#store.mandate();
    if (!m || m.expiresAt <= this.#now()) deny("NO_AUTHORITY", "A current wallet-signed mandate is required.");
    if (m.agent !== this.#venue.agentAddress) deny("AGENT_CHANGED", "Sign a fresh mandate for the newly provisioned API wallet.");
    if (this.#store.get<boolean>("retired")) deny("RETIRED_AGENT", "This API key was revoked or expired. Provision a fresh key; do not reapprove it.");
    return MandateSchema.parse(m);
  }
  challenge(input: unknown) {
    const r = ChallengeRequest.parse(input), now = this.#now();
    let address: string, payload: unknown;
    if (r.kind === "sign-in") {
      if (r.address !== this.#store.get("primary") && r.address !== this.#store.get("trading")) deny("WALLET_NOT_LINKED", "Choose a wallet already connected to this workspace.");
      address = r.address; payload = { purpose: "Sign in to Pip", address, tradingAuthorityGranted: false };
    } else if (r.kind === "link-primary") {
      if (this.#store.get("primary")) deny("ALREADY_LINKED", "Primary wallet is already bound to this signer instance.");
      address = r.address; payload = { address };
    } else if (r.kind === "link-trading") {
      const primary = this.#store.get<string>("primary");
      if (!primary || this.#store.get("trading")) deny("LINK_ORDER", "Link the primary wallet first; trading identity cannot be overwritten.");
      if (r.address === this.#venue.agentAddress) deny("SEPARATE_AGENT_REQUIRED", "The trading account and Pip API wallet must be distinct.");
      address = r.address; payload = { primary, account: address, agent: this.#venue.agentAddress, dedicatedAccount: address !== primary };
    } else if (r.kind === "mandate") {
      address = this.#account(); payload = this.#validateMandate(r.mandate);
    } else {
      address = this.#account();
      const p = this.#store.proposal(r.proposalId).value;
      if (p.expiresAt <= now) deny("EXPIRED", "Proposal expired; create a fresh proposal.");
      payload = p;
    }
    return this.#store.challenge(r.kind, address, payload, this.#origin, now);
  }
  #validateMandate(input: unknown): Mandate {
    const m = MandateSchema.parse(input), previous = this.#store.mandate();
    if (m.account !== this.#account() || m.agent !== this.#venue.agentAddress || m.account === m.agent) deny("ACCOUNT_MISMATCH", "Mandate must target the linked trading account and its separate API wallet.");
    if (m.dedicatedAccount !== (m.account !== this.#store.get("primary"))) deny("ACCOUNT_SEPARATION_MISMATCH", "The signed account separation must match the linked wallet identities.");
    if (m.expiresAt <= this.#now() || m.expiresAt > this.#now() + 86_400_000) deny("EXPIRY_LIMIT", "Mandates last at most 24 hours in this first version.");
    if (previous && m.version <= previous.version) deny("STALE_MANDATE", "A replacement mandate must increase the version.");
    if (new Decimal(m.maxOrderUsd).gt(m.maxPositionUsd) || new Decimal(m.maxPositionUsd).gt(m.maxGrossUsd)) deny("INVALID_LIMITS", "Order, position and gross limits must be consistent.");
    if (this.#store.get("retired")) deny("RETIRED_AGENT", "Provision a fresh API key after revocation or expiry.");
    return m;
  }
  async prove(input: unknown) {
    const r = z.object({ challengeId: z.string().regex(/^[0-9a-f]{48}$/), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) }).strict().parse(input);
    const c = this.#store.readChallenge(r.challengeId);
    if (c.expiresAt <= this.#now()) deny("EXPIRED", "Wallet challenge expired.");
    if (!await verifyMessage({ address: c.address, message: c.message, signature: r.signature as `0x${string}` })) deny("INVALID_SIGNATURE", "Signature does not match this wallet and exact challenge.");
    this.#store.transaction(() => {
      if (c.expiresAt <= this.#now()) deny("EXPIRED", "Wallet challenge expired.");
      this.#store.consumeChallenge(c.id);
      if (c.kind === "sign-in") {
        if (c.address !== this.#store.get("primary") && c.address !== this.#store.get("trading")) deny("WALLET_NOT_LINKED", "Wallet is no longer linked to this workspace.");
      } else if (c.kind === "link-primary") {
        if (this.#store.get("primary") || c.address === this.#venue.agentAddress) deny("ALREADY_LINKED", "Cannot replace the primary identity or use the API wallet.");
        this.#store.set("primary", c.address);
      } else if (c.kind === "link-trading") {
        if (this.#store.get("trading") || c.address === this.#venue.agentAddress) deny("SEPARATE_AGENT_REQUIRED", "Cannot replace the trading account or use Pip's API wallet as its owner.");
        this.#store.set("trading", c.address);
      } else if (c.kind === "mandate") {
        const m = this.#validateMandate(c.payload);
        this.#store.set("mandate", m); this.#store.set("paused", false);
      } else if (c.kind === "approve-proposal") {
        const p = ProposalSchema.parse(c.payload), current = this.#store.proposal(p.id).value;
        if (hash(p) !== hash(current) || p.expiresAt <= this.#now()) deny("APPROVAL_MISMATCH", "Approval must match the current unexpired proposal.");
        this.#store.approve(p.id);
      } else deny("ACTION_DENIED", "Unsupported wallet authorization.");
      // Preserve signature evidence for audit, never any wallet private key.
      this.#store.event("wallet.authorized", { kind: c.kind, wallet: c.address, message: c.message, signature: r.signature }, this.#now());
    });
    return this.status();
  }
  pause() { this.#store.set("paused", true); this.#store.event("execution.paused", { openOrdersMustBeReconciled: true }, this.#now()); return this.status(); }
  async #snapshot() {
    const s = await this.#venue.snapshot(this.#account());
    if (s.account !== this.#account() || s.network !== "testnet") deny("ACCOUNT_MISMATCH", "Account adapter returned the wrong account or network.");
    const active = s.agents.find(a => a.address.toLowerCase() === this.#venue.agentAddress && a.validUntil > this.#now());
    if (active) {
      const expiry = this.#store.get<number | null>("registrationExpiry");
      if (expiry != null && expiry !== active.validUntil) { this.#store.set("retired", true); this.pause(); }
      else { this.#store.set("everApproved", true); this.#store.set("registrationExpiry", active.validUntil); }
    }
    else if (this.#store.get("everApproved")) { this.#store.set("retired", true); this.pause(); }
    return s;
  }
  #turnover() { const start = Math.floor(this.#now() / 86_400_000) * 86_400_000; return this.#store.intents().filter(i => i.createdAt >= start).reduce((a, i) => a.add(i.notional), new Decimal(0)).toFixed(); }
  async #exclusive<T>(work: () => Promise<T>) { if (this.#busy) deny("BUSY", "Another account operation is running."); this.#busy = true; try { return await work(); } finally { this.#busy = false; } }
  async worker(name: string, input: unknown): Promise<unknown> {
    // No caller-supplied account, URL, signature, builder fee, leverage update or raw action.
    if (name === "account.read") { z.object({}).strict().parse(input); return this.#snapshot(); }
    if (name === "markets.read") { z.object({}).strict().parse(input); return this.#venue.markets(); }
    if (name === "execution.status") { z.object({}).strict().parse(input); return this.status(); }
    if (name === "trade.propose") return this.#exclusive(async () => {
      const order = OrderSchema.parse(input), m = this.#mandate();
      const [s, market] = await Promise.all([this.#snapshot(), this.#venue.market(order.symbol, this.#account())]);
      const p = ProposalSchema.parse({ id: randomUUID(), mandateId: m.id, mandateVersion: m.version, account: m.account, agent: m.agent,
        network: "testnet", order, expiresAt: Math.min(this.#now() + 120_000, m.expiresAt) });
      const risk = checkTrade(p, m, s, market, this.#now(), this.#turnover());
      this.#store.saveProposal(p);
      return { proposal: p, hash: hash(p), risk, approvalRequired: m.execution === "per-order" };
    });
    if (name === "trade.execute") return this.#exclusive(async () => {
      const { proposalId } = z.object({ proposalId: Id }).strict().parse(input);
      const existing = this.#store.intent(proposalId);
      if (existing) return { replay: true, intent: existing }; // Never resubmit, even after restart/timeouts.
      if (!this.#armed) deny("NOT_ARMED", "Signer is disarmed. Testnet submission requires explicit local configuration.");
      const { value: p, approved } = this.#store.proposal(proposalId), m = this.#mandate();
      if (m.execution === "per-order" && !approved) deny("APPROVAL_REQUIRED", "The trading wallet must approve this exact proposal.");
      const [s, market] = await Promise.all([this.#snapshot(), this.#venue.market(p.order.symbol, this.#account())]);
      const risk = checkTrade(p, m, s, market, this.#now(), this.#turnover());
      const intent: Intent = { id: p.id, proposal: p, fingerprint: hash(p), status: "pending", result: null, notional: risk.notional, createdAt: this.#now() };
      this.#store.transaction(() => {
        if (this.#store.get("paused") !== false || hash(this.#mandate()) !== hash(m)) deny("PAUSED_OR_CHANGED", "Execution paused or mandate changed during validation.");
        if (this.#store.intents().some(i => i.status !== "settled")) deny("RECONCILIATION_REQUIRED", "Resolve the previous order before sending another.");
        this.#store.saveIntent(intent); this.#store.event("order.reserved", { id: p.id, cloid: cloid(p.id), hash: hash(p), risk }, this.#now());
      });
      const expiresAfter = Math.min(this.#now() + 5000, p.expiresAt, m.expiresAt);
      try {
        const result = await this.#venue.order(p, market, expiresAfter);
        // Even an acknowledgement needs a fresh account read and order-status reconciliation.
        intent.result = result;
        this.#store.saveIntent(intent); this.#store.event("order.acknowledged", { id: p.id }, this.#now());
      } catch (error) {
        if (error instanceof VenueOrderRejected) {
          intent.status = "settled"; intent.result = { outcome: "rejected", code: "VENUE_ORDER_REJECTED" };
          this.#store.saveIntent(intent); this.#store.event("order.rejected", { id: p.id }, this.#now());
        } else {
          intent.status = "uncertain"; this.#store.saveIntent(intent);
          this.#store.event("order.uncertain", { id: p.id }, this.#now());
        }
        // Do not return SDK error objects: they can contain signed request envelopes.
      }
      return { replay: false, intent };
    });
    if (name === "orders.cancel" || name === "execution.reconcile") return this.#exclusive(async () => {
      const { proposalId } = z.object({ proposalId: Id }).strict().parse(input);
      const i = this.#store.intent(proposalId) ?? deny("UNKNOWN_INTENT", "Only orders recorded by this signer can be managed.");
      if (name === "orders.cancel") {
        if (!this.#armed) deny("NOT_ARMED", "Signer is disarmed.");
        // Cancel only our exact cloid, including while locally paused. Never cancel another user's order.
        if (this.#store.get("retired")) deny("RETIRED_AGENT", "Use the trading wallet to cancel after agent revocation.");
        this.#store.event("cancel.requested", { id: i.id }, this.#now());
        try { await this.#venue.cancel(i.proposal, this.#now() + 5000); } catch { deny("CANCEL_UNCERTAIN", "Cancellation outcome is uncertain; reconcile it before continuing."); }
      }
      const raw = await this.#venue.orderStatus(this.#account(), cloid(i.id)), snapshot = await this.#snapshot();
      const result = z.discriminatedUnion("status", [z.object({ status: z.literal("unknownOid") }), z.object({ status: z.literal("order"), order: z.object({
        status: z.string(), statusTimestamp: z.number().int(), order: z.object({ cloid: z.string().nullable(), coin: z.string() }),
      }) })]).parse(raw);
      if (result.status === "order") {
        if (result.order.order.cloid !== cloid(i.id) || result.order.order.coin !== i.proposal.order.symbol) deny("RECONCILIATION_MISMATCH", "Order status does not match the recorded instruction.");
        const terminal = ["filled", "canceled", "rejected", "marginCanceled", "selfTradeCanceled", "reduceOnlyCanceled", "iocCancelRejected", "minTradeNtlRejected", "perpMarginRejected", "tickRejected", "scheduledCancel"].includes(result.order.status);
        if (terminal && result.order.statusTimestamp >= i.createdAt - 1000 && result.order.statusTimestamp <= snapshot.sourceTime && snapshot.observedAt - snapshot.startedAt <= 10_000 && !snapshot.openOrders.some(o => o.cloid === cloid(i.id))) {
          i.status = "settled"; i.result = result; this.#store.saveIntent(i); this.#store.event("order.reconciled", { id: i.id, status: result.order.status }, this.#now());
        }
      }
      return { intent: i, orderStatus: result, snapshot, blocked: i.status !== "settled" };
    });
    deny("TOOL_DENIED", "Unsupported tool. Withdrawal, transfers, arbitrary signing and account changes are unavailable.");
  }
}
