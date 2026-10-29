# Pip — Product and Engineering Handoff

Updated: **27 October 2026**. Owner: Alan, solo founder.

Current planning entry point: [product and delivery plan](docs/PRODUCT_PLAN.md). Implementation order and acceptance evidence: [build backlog](docs/BUILD_BACKLOG.md). Verification: [baseline report](docs/BASELINE_CHECK.md).

## Confirmed product

Build a Singapore-first personal AI investment manager that reduces research time and the attention required to monitor positions. Alan will be the first heavy user even if the project never becomes a commercial business. He has five years of professional investment/trading experience.

Build a multi-user product from the first shared slice: standard identity, isolated portfolios/memory/budgets, individualized mandates and adaptive onboarding. Alan's initial validation workflow is Tiger Brokers, US markets/futures, event-and-macro driven trades held hours to days; it is not every user's default. The founder's first instrument references are “E-micro gold mini main” and `BZmain`; exact product, exchange, continuous identifier and dated contracts remain to be verified. Initial operating ceiling: **S$500/month**, excluding existing coding subscriptions and Apple membership. Necessary data/AI-use fees count within that ceiling.

**Money and trading remain with the broker.** Crypto-wallet and Hyperliquid connectivity are retired. Their UI, API, execution package, setup/rotation scripts and venue-specific research CLI have been removed. Do not restore wallet sign-in, on-chain account linking or a separate funded trading wallet as prerequisites for Pip.

The mature product supports three modes: research/monitoring only; exact approval of each trade; and bounded autonomous trading within an explicitly approved, revocable mandate. A user's holdings do not authorize managing all assets. Standard application identity is separate from broker permissions.

The intended experience is a persistent personal agent that understands the user's goals, remembers research and decisions, continues useful investigations, observes meaningful changes, and returns with concise explanations and next actions. Astor and proactive personal agents are product references; they are not selected dependencies or evidence that Pip has their capabilities.

## Current implementation

| Component | Implemented | Missing |
| --- | --- | --- |
| `apps/web` | Next.js scripted paper conversation; inline conversational Tiger setup with isolated browser credentials, saved setup messages and typed account selection | Production identity, hosted broker callback, shared research, portfolio sync and background monitoring |
| `packages/domain` | Paper profile, mandate, proposal checks, accounting, revision control and pause/reset | Full broker-neutral holdings, futures mechanics, actual profile/authority lifecycle and live risk |
| `packages/harness` | Typed context, reviewed tool gateway, local usage reservations/receipts/replay, proactive goals/checkpoints/leases and next tasks | Hosted orchestration, actual broker/source tools, skill/artifact integration and notification/watch services |
| Provider adapter | Reusable OpenRouter SDK transport, verified against mock HTTP | Real-provider quality, latency and billing verification; reuse OpenRouter initially |
| `skills` | Twelve cleaned analytical methods, references, artifact validators and numerical helpers | Runtime selection/loading; focused macro/event/futures extensions and behavioral evaluation |
| Broker/execution | Local Tiger read-only OAuth/access probe with synthetic fixtures and tests; no order service | Live read-only authorization, assets, positions/orders and BZmain metadata verified; futures history and quote permissions unresolved; production monitoring/execution remain future work |
| Native iOS | Planned SwiftUI client | Shared backend API, native implementation, APNs and physical-device verification |

The existing paper demo retains synthetic fixtures; these are neither real broker positions nor a supported instrument universe. No real model/broker/trading capability should be implied by its UI or health endpoint.

The earlier full baseline passed 188 tests before connection-stack removal. The baseline report records current verification separately. Removing retired test suites changes the test count; it does not supply broker coverage. CI remains unconfigured.

## Delivery priorities

1. Preserve a reproducible local baseline and choose a matching CI/deployment runtime.
2. Define supported customer profiles and broker-neutral context; investigate personal and commercial broker-access routes in parallel. No orders during the access spike.
3. Define exact account, position, order, fill, cash/margin, contract, quote, event and source-freshness schemas. Distinguish live reads, imports and synthetic fixtures.
4. Build shared sign-in, isolated durable records, adaptive onboarding, source retrieval and saved research. Demonstrate two users with different portfolios/horizons before any external pilot; paid model benchmarks wait for an explicit spending instruction.
5. Implement broker reconciliation, deterministic watches, event ingestion, durable jobs, notification delivery and independent health checks.
6. Build a thin native iOS client against the same identity, conversations, portfolio and research; run a paper decision journal.
7. Resolve external pilot eligibility, commercial broker/data agreements, privacy and measured unit economics.
8. Add exact-approved broker execution, then bounded autonomy only after their separate technical, contractual, regulatory and operational requirements are met.

Broker feasibility and customer-experience design can progress together. Manual import can enable research while access is resolved, but cannot establish unattended intraday position/margin awareness. Rebaseline schedule estimates after the first working slice.

## Application and harness architecture

Use the existing TypeScript/Next.js foundation and Pip-owned context, authority, tool policy, usage ledger and research state. The recommended first production path is Postgres/private object storage with a hosted worker; Singapore is the preferred initial data/service region where supported. A Python Tiger adapter may be appropriate if required by the selected scoped authorization SDK. These choices still need implementation and deployment spikes.

Initially reuse the server-side OpenRouter adapter and provider-independent interface; explicit routes require later quality/cost/privacy evaluation. A direct-provider adapter is optional. Runtime spending is currently connection-only: no generation, research loops or background model calls. OpenAI authentication was verified using its model-list endpoint without generation. Credentials belong in ignored local files, never `.env.example`. Coding subscriptions do not fund product API use. Do not silently send user data to an unassessed fallback provider.

Keep deterministic account observation and numerical risk separate from LLM reasoning. The agent researches and explains; code enforces authority, budgets, sizing, contract units and later order payload validation. A model call or mobile notification must not be the sole time-critical protection for a futures position.

The current context is paper-only and too thin for real monitoring. It needs a versioned research/monitor schema, full positions/open orders, imported-data labeling and source-specific freshness before actual account use. Production identity and trusted account routing must be loaded by backend code, not selected by model arguments.

## Research and memory

Shared research is an approved architectural direction, not implemented inference. Ingest and verify reusable market facts once where rights permit; store versioned common research separately from private user theses, holdings and decisions. Deduplicate shared jobs, enforce access/entitlement groups, invalidate on corrections/new vintages and charge common costs once. Personal interpretations, authority and retrieval remain user-specific.

Preserve a durable chain: position -> thesis/event plan -> evidence -> active watches -> decision -> outcome. Postgres holds structured/versioned records; private object storage holds permitted source files. Retrieval supplies bounded relevant context. An embedding index is not the source of authority or portfolio truth.

For this founder, macro release vintages, consensus versus actual/prior revisions, event scenarios, exact futures contracts, margins, session calendars, expiry/notice and trade review take priority. Company modeling remains a conditional route. Selectively load methods from the existing bundle rather than putting every skill in each prompt.

No retrieved text, research summary or user ambition can alter the mandate. A planned watch is not active until the service acknowledges it. If no action is justified, retain a concrete next investigation or review condition. Handle stale data and monitoring failures visibly.

## Onboarding and clients

Use standard application sign-in, then connect a supported broker or label an import inside the conversation. Broker selection, permission explanation, account choice, confirmation and recovery belong in the thread. Only the broker-controlled login/consent opens externally; resume automatically in the same conversation. Reconcile observable account facts before asking redundant questions. Ask for intent: goals, horizon, liquidity needs, loss tolerance/capacity, included capital/positions, restrictions and event/overnight preferences.

Confirm a structured research/monitor scope first, show a useful brief, then activate acknowledged watches and the chosen alert channel. Exact-order approval and autonomous mandates are separate later flows, not permission inferred from a connected account.

Native SwiftUI iOS and web share one backend and memory. The mobile first slice is conversation, positions/freshness, event plans, research, alert history/deep links and pause/revoke. The backend monitors while the app is closed. Keep the existing minimal monochrome DM Sans conversation layout; summary and reset remain in the menu. Broker setup controls should appear only when the corresponding integration exists.

## Business and external offering

Singapore-first commercial ambition includes an appropriate MAS licence/partner route. Personal prototype work can progress now; obtain a scoped assessment before offering external personalized recommendations or trading. Read-only access and per-order approval do not by themselves settle regulatory classification. Detailed sources and gates are in the product plan.

Test bounded subscription hypotheses after actual data, model, support and operating costs are known. Do not promise unlimited research or broad real-time futures coverage inside an unverified data budget. The first success measures are usefulness, time/attention saved, factual quality, monitoring reliability and measured cost, with decision/outcome reviews over time.

## Documents and next work

- [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md): current comprehensive roadmap, proposed stack/models/data, economics and phased gates.
- [BUILD_BACKLOG.md](docs/BUILD_BACKLOG.md): stable implementation task IDs and acceptance evidence.
- [HARNESS_DESIGN.md](docs/HARNESS_DESIGN.md): source study and reusable harness boundaries.
- [TIGER_ACCESS.md](docs/TIGER_ACCESS.md): local read-only Tiger access spike, setup and limitations.
- [BROKER_ONBOARDING.md](docs/BROKER_ONBOARDING.md): local Connect Tiger web flow and remaining hosted integration work.
- [PROACTIVE_AGENT.md](docs/PROACTIVE_AGENT.md): implemented local runtime and offline verification.
- [skills/README.md](skills/README.md): curated methods and integration limits.
- [decisions.md](docs/decisions.md): retained product/engineering decisions and retirement record.
- [handoff.md](handoff.md): historical imported discussion; it does not override the current plan or broker-only decision.

The next product slice is shared identity/storage and broker-neutral context for two isolated test users. The local Tiger probe completed read-only authorization and live account reads. Assets, stock/futures positions and open orders, stock transactions, exchanges and BZmain reference metadata succeeded. Position/order lists were empty. Futures history failed and quote permissions were missing. Quotes, complete reconciliation, executable contracts and active monitoring remain unverified.
