# Pip build backlog

Baseline: **27 October 2026**. Owner: Alan, solo founder. Scope and rationale: [PRODUCT_PLAN.md](PRODUCT_PLAN.md).

These are planned tasks, not implemented features or GitHub issues. IDs stay stable as scope evolves. Effort estimates are focused engineering days, exclude external waiting time and overlap only where it is practical for one person. Review completed evidence weekly. Do not begin every row at once.

**Latest status — 27 October 2026:** PIP-001's local baseline passed: 188 tests, typecheck, production build, skill checks, all three offline demos and a production-server HTTP smoke check. See [verification evidence](BASELINE_CHECK.md). CI is not configured, so that acceptance item remains open. PIP-002 now has the founder's initial instrument references: “E-micro gold mini main” and `BZmain`; exact Tiger identifiers/venues/contracts remain unresolved.

**Scope update:** the founder retired crypto-wallet and Hyperliquid connectivity. The old connection/signer package, setup scripts and venue-specific research CLI were removed. The original 188-test baseline predates that removal; current verification is recorded separately in the baseline report. Funds and trading will remain with the broker; Tiger access is still to be implemented.

**Current local baseline after cleanup:** 93 tests across 8 files, typecheck, clean production build, skills validation, remaining offline demos and HTTP regression checks passed. Removed routes return 404; existing saved demo sessions remain readable. CI is still unconfigured.

**PIP-003 started:** a local Python Tiger OAuth/read-only probe and offline fixtures/tests are implemented; see [Tiger access setup](TIGER_ACCESS.md). Read-only OAuth and bounded live account reads now succeed. Assets, stock/futures position and order reads, stock transactions, exchanges and BZmain reference metadata succeeded; no positions/orders were returned. Futures transaction history failed, quote permissions were missing, and quotes were not requested. Entitlement costs/rights, streaming and renewal remain unverified; the task is not complete. PIP-004 has initial diagnostic normalization only, not a production broker-neutral context.

The access-spike verification passed 30 Python tests, the synthetic probe, missing-authorization handling, the existing 93 Node tests, TypeScript checks and Python dependency checks. Authorization and initial live reads subsequently succeeded. Remaining broker gaps do not block shared product work with isolated fixtures.

**Current spending restriction:** connection tests only. OpenAI authentication metadata verified without generation. The OpenRouter adapter rejects generation by default; paid quality benchmarks, research and background model activity require a new spending instruction.

## P0 — shared identity, onboarding and a working research path

**Browser connection increment:** broker setup now lives inside the conversation. Type **connect broker/connect Tiger**, complete broker-controlled consent, and select an account by button or typed ending. Setup acknowledgments persist; old `/brokers` links redirect to the thread. Browser sessions have isolated credentials; the existing CLI grant stays separate. Real SDK sign-in-link creation/cancellation, mocked account-selection flows and HTTP/browser checks passed. Hosted callbacks, production identity and complete browser consent verification remain open. See [broker onboarding](BROKER_ONBOARDING.md).

| ID | Task and dependencies | Acceptance evidence | Estimate |
| --- | --- | --- | --- |
| PIP-001 | Reproduce the current repository baseline on the Mac | Install from lockfile; record Node/package versions; run typecheck/tests/build/offline demos/skill check; classify failures without representing mock tests as live verification; CI matches the chosen runtime | 0.5–1 day |
| PIP-002 | Define supported user needs and initial operating envelopes | Novice, longer-horizon ETF/equity and active macro/futures evaluation profiles; goals, horizons, restrictions and first-use outcomes; Alan’s Tiger account/contracts as one case; S$500 bootstrap budget | 0.5 day |
| PIP-003 | Personal and customer Tiger/data feasibility; parallel with shared product work | Read-only account/positions/margin/orders/fills and exact contract metadata; quote/stream entitlement and cost; revocation/expiry/renewal; paper futures coverage explicitly verified or unknown; customer authorization/partner route distinguished from personal access; no order submission | 1–3 days plus account/vendor wait |
| PIP-004 | Broker-neutral data/context contracts; depends on 002, informed by 003 | Versioned research/monitor context distinct from paper/trading authority; full account/position/order/fill/cash/contract/event/quote schemas; units/currencies/source times/coverage; continuous-vs-executable distinction; imported observations distinct from synthetic fixtures/live reads; per-source freshness with original timestamps; fixtures and expected reconciliation | 1–2 days |
| PIP-005 | Multi-user evaluation pack; parallel to 003 | 30–50 cases across macro vintages, futures mechanics, risk, sourcing, unsupported/stale inputs, prompt injection and useful no-action outcomes; different portfolios/horizons, novice explanations and cross-user isolation; held-out subset and founder rubric | 1–2 days initially, then ongoing |
| PIP-006 | Production storage/identity/context spike; depends on 004 | Async repositories, Postgres migrations and private storage; migrate the harness to the versioned research/monitor context and source-specific freshness/coverage policy; mobile-compatible shared auth; tenant/account scope derived from authenticated identity; two identities cannot read each other’s records, credentials, retrieval, jobs or budgets; no hosted local SQLite dependence | 2–4 days |
| PIP-007 | Main model/research transport; depends on 001, 005 | Reuse existing OpenRouter transport with strict output/finish/usage handling and explicit routing policy. Current instruction permits authentication checks only; generation blocked by default. Quality/cost/latency benchmarks wait for a new spending instruction; no silent fallback or credentials in context | 1–3 days plus account setup |
| PIP-008 | Implement narrow retrieval/calculation tools, persist research and route skills; depends on 004, 006, 007 | Reviewed source search/fetch plus deterministic calculation adapters; provenance/rights/cost/size/timeout fixtures; router loads relevant skills; licensed common research stored separately from private user context; single shared dispatch for concurrent requests, entitlement-aware reuse and version/correction invalidation; common costs metered once and personal interpretation separately; thesis/event-plan artifacts and version/dependency invalidation; next task survives restart; no unsupported watch marked active | 3–5 days |
| PIP-009 | Shared onboarding and saved research; depends on 006–008 | Adaptive onboarding for different goals/experience/horizons; confirmed profile, scope, budget and research-only authority; server-owned context; isolated durable histories for two users; labeled imports and brokerless research; mocked research until inference spending is authorized | 3–5 days |

**P0 exit:** two isolated users with different needs complete onboarding and recover their own profile, scope, portfolio/import and research. Research stays mocked until generation is authorized; live quality verification remains explicitly pending. Broker feasibility progresses independently: imports do not establish live monitoring. P0 estimates total approximately 13–26 engineering days, excluding external waiting.

## P1 — proactive position and event monitoring

| ID | Task and dependencies | Acceptance evidence | Estimate |
| --- | --- | --- | --- |
| PIP-010 | Tiger adapter and reconciliation; depends on 003, 004, 006 | Per-user production authorization, encrypted credential storage, renewal/revoke and account binding; the local CLI token store is not shared production storage. Full snapshots/stream deltas normalized; manual broker trades reflected; partial/stale reads explicit; reconnect resync and duplicate/out-of-order fixtures; scopes remain read-only | 3–6 days |
| PIP-011 | Macro calendar/release ingestion; depends on 004, 006 | Official schedule/release observations, prior/revision/actual and publication/receipt times; consensus separate and sourced; changed calendars, DST and event-day changes tested | 2–4 days |
| PIP-012 | Macro/futures skills extension; depends on 005, 008, 011 | Focused methods for event scenarios, expectations/revisions, contract/session/margin/roll; relevant tests/evals; company-model branch retained; no claims of validated trading edge | 1–3 days |
| PIP-013 | Durable jobs and metering; depends on 006, 007 | Atomic claims/fencing, paid-call intent/results, task/period reservations, explicit unknown outcomes, graceful drain and next-task commit; restart/deploy overlap tests in real Postgres | 3–5 days |
| PIP-014 | Deterministic watch service; depends on 010, 011, 013 | Price/exposure/margin/event/expiry/freshness watches; active acknowledgment, cooldown, coalescing, limits; per-feed freshness and essential-monitoring budget separation | 3–5 days |
| PIP-015 | Notifications and independent health; depends on 013, 014 | Transactional outbox, durable history/deep links, one initial delivery channel with individual preferences, urgency/quiet hours; failed/delayed/uncertain delivery surfaced; external watchdog detects killed worker | 2–3 days |
| PIP-016 | Multi-user verification and founder operating trial; depends on stable 009–015 | Two isolated users with different portfolios/horizons, plus ten relevant Alan trading sessions; actual event and delivery timestamps; useful/noisy/missed alert review; invoice reconciliation; recovery drill and restored backup; small native-client work can overlap once monitoring is stable | At least 2 weeks elapsed |

**P1 exit:** genuine background observation of the supported live account/universe, useful research follow-through, visible health and tested recovery. Monitoring runs while the app is closed. Any imported or delayed component keeps its limitation visible.

## P2 — native daily use and paper decisions

| ID | Task and dependencies | Acceptance evidence | Estimate |
| --- | --- | --- | --- |
| PIP-017 | Native SwiftUI shell; depends on stable 009 API | Same identity/conversation/portfolio/research as web; contract/time/freshness display; pause/revoke; simulator plus physical phone checks | 4–7 days |
| PIP-018 | APNs and alert actions; depends on 015, 017 | Notification permission, deep link to committed evidence, alert history, expired auth/offline/retry behavior; no action from an unauthenticated notification payload | 2–3 days |
| PIP-019 | Paper proposal/approval journal; depends on 004, 008, 013 | Exact account/contract/order payload; expiry/mandate/snapshot binding; independent checks and deterministic paper fills with stated assumptions; no mixing paper and actual P&L | 3–5 days |
| PIP-020 | Refine progressive onboarding and monitoring preferences beyond core onboarding in 009; depends on 006, 009, 014 | Profile/intent separate from observed holdings; explicit included sleeve/capital; first useful brief, acknowledged watches; correction/disconnect flows; trading modes unavailable until actually supported | 3–5 days |

**P2 exit:** useful phone workflow, shared backend records and a trustworthy paper decision trail. This does not authorize live order tools.

## P3 — external pilot and commercial feasibility

| ID | Task and dependencies | Acceptance evidence |
| --- | --- | --- |
| PIP-021 | Singapore offering scope assessment before outside personalized recommendations | Written product/data/authority description reviewed by appropriate Singapore adviser; decision on permitted pilot/licence/partner route and relevant obligations; no assumption that read-only/free/invited means exempt |
| PIP-022 | Commercial Tiger and data access; investigate alongside PIP-003 | Actual partner/API conditions, SG customer permissions, data/AI/non-display/display/redistribution rights and pricing; vendor statements distinguished from verified account tests |
| PIP-023 | Private pilot readiness; depends on 016, 020–022 | Tenant/retrieval/storage isolation; privacy/consent/retention/export/deletion; restored backups; runbooks and support/incident capacity; scoped access review before real customer data |
| PIP-024 | Pricing and value experiment; depends on eligible pilot | Test S$39/S$79 hypotheses against actual task allowances and data costs; measure weekly use, four-week retention, useful alerts, willingness to pay and p50/p95 variable COGS |

Begin the access/scope investigation early enough to avoid product rework. This does not require completing a licensing application before developing a personal-use prototype. External approvals/legal work have no estimated delivery date here.

## P4 — execution gates

| ID | Task and dependencies | Acceptance evidence |
| --- | --- | --- |
| PIP-025 | Order-adapter lifecycle validation; depends on 019 and verified instrument support | Verified broker sandbox where supported; otherwise labeled adapter mocks/shadow replay pending separately gated own-account verification. Test exact contracts/ticks/order types, submit/ack/reject/partial fill/cancel/replace, venue dedupe/client IDs where supported, uncertain outcome reconciliation and no blind retry; simulation does not establish venue behavior |
| PIP-026 | Separate risk/approval/execution service; depends on 025 | Fresh broker state, open-order exposure reservations, tick/size/margin/event limits, exact expiring approvals, revocation race and emergency control tests; no LLM access to credentials or arbitrary broker tools |
| PIP-027 | Limited approved live rollout; depends on 021–023, 025–026 as applicable | Explicit own-account/customer scope and relevant broker/legal permissions; small eligible universe/capital; broker-side protection verified; live supervision and incident/reconciliation capability |
| PIP-028 | Bounded autonomy; depends on sustained 027 evidence | Versioned standing mandate; account/sleeve/session/instrument/loss/exposure/margin/order limits enforced outside model; change/revoke/expiry races tested; independent review and adequate operational coverage |

No calendar date substitutes for these gates. A paper success or good model benchmark does not establish safe live execution.

## Test and operating evidence that spans phases

- Correct units, currencies, futures contract month/ticks/multiplier, expiry/notice, daily settlement, open-order effects and fee accounting.
- Data stale/missing/partial/delayed/out-of-order; stream gaps, quote entitlements and actual broker reconciliation.
- Two concurrent workers/deploy overlap; lease loss; worker killed before/during/after paid dispatch; unknown receipts held rather than retried blindly.
- Atomic artifact/outbox/next-task commit; duplicate schedules/webhooks; provider 429, timeout and invalid/truncated output.
- Concurrent budget reservations and period rollover; discretionary research stops while essential monitoring and user controls work.
- Pause, disconnect, mandate revision and credential expiry during a run; no stale authority dispatch.
- Tenant isolation in database, private object storage, retrieval and caches; hostile external evidence cannot change tools/mandates.
- User/exchange timezone, DST, overnight session date and changed event schedules.
- Independent heartbeat detects a fully dead worker; monitoring/delivery failures visible; backups actually restored.
- Later execution: submission uncertainty, partial fills, cancellation races, stale approvals and orphan orders reconciled with venue truth.

## Immediate sequence

Continue **002, 004 and 006** toward shared identity/context, with 003/022 access discovery and 005 evaluation design in parallel. Then implement 007–009 with mocked research while the connection-only spending instruction remains active. Keep one primary implementation task active, plus a small access/research investigation. At each weekly review record completed evidence, current blockers, spend, the next useful user workflow and any scope change. The roadmap should become more precise from actual use, rather than expanding every time another model/tool is released.
