# Engineering decisions

## 0016 — Conversation-based broker setup and shared research architecture

Date: 27 October 2026. Status: conversational local setup implemented; shared research planned.

The user prefers broker setup in the agent's text interface. Replace the separate broker screen with inline prompts/actions, typed account selection, persistent acknowledgments and recovery in the existing conversation. Broker-owned sign-in/consent remains external and returns to the same thread automatically. Preserve existing per-browser isolation/read-only policy. Current shortcuts are deterministic and do not invoke a language model. Old broker-page links redirect to the thread. This supersedes 0015's separate-page presentation.

The user approves common research reuse: ingest/verify reusable licensed market facts once, keep versioned common artifacts, and personalize implications separately. Deduplicate concurrent jobs, enforce source/recipient entitlements and freshness/vintage invalidation, and meter shared work once. Personal portfolios, chats, theses and authority stay private. No live research pipeline, model spend or unrestricted cross-user cache is authorized by this direction. Acceptance details are in the product plan and PIP-008.

## 0015 — Move broker authorization into the web experience

Date: 27 October 2026. Status: local browser preview implemented; commercial/hosted customer route unverified.

Users connect through **Broker accounts → Connect Tiger**, approve read access with Tiger and choose an authorized account in Pip. Preserve money/trading at the broker and distinguish connection from portfolio sync/monitoring. No terminal or copied API credentials in the normal preview flow; Tiger’s personal OpenAPI activation requirement still applies.

Each browser owns a separate private credential store and opaque account choices. Do not reuse the founder’s CLI grant for web users. The current SDK uses a same-computer callback, so this adapter accepts loopback hosts only. A hosted customer offering needs authenticated ownership, an approved hosted authorization route and encrypted managed credentials; assess Tiger’s documented commercial app registration. [Implementation, sources and verification](BROKER_ONBOARDING.md).

## 0014 — Connection tests only; protect local credentials

Date: 27 October 2026. Status: user-directed spending restriction implemented.

Use API credits only for connection checks for now. Do not run generation, research, benchmarks or background model activity without a new spending instruction. The OpenRouter adapter defaults to connection-only and blocks generation before dispatch. Offline demos/tests use fake transports.

Move the OpenAI key from tracked `.env.example` to ignored local `.env` with owner-only permissions; examples contain empty placeholders. The connection helper uses only a fixed model-list GET, no prompt, retries or fallback, and prints sanitized metadata. Authentication passed with zero generation requests; inference billing and remaining credits are unverified. OpenAI and OpenRouter credentials are separate.

## 0013 — Multi-user foundation and initial OpenRouter transport

Date: 27 October 2026. Status: user-directed product correction reflected in plan/backlog; shared platform implementation pending.

Pip is a product for supported users with different goals, portfolios, experience and horizons. Alan’s Tiger macro/futures workflow is one validation case. Build shared identity, isolated memory/accounts/jobs/budgets, adaptive onboarding and research-only mandates in the initial slice. Verify two distinct identities; personal broker activation does not block fixture-based product development. The Tiger diagnostic’s local token store is not a production customer store.

Reuse the existing OpenRouter model gateway initially; evaluate explicit provider routes before live research. Broker APIs/aggregators provide authorized account access separately. Customers need neither LLM keys nor a developer account as an assumed product requirement; commercial broker authorization still requires investigation. A direct model adapter is optional. This supersedes 0010’s founder-only prioritization and provisional direct-provider recommendation.

## 0012 — Implement a local Tiger read-only access spike

Date: 27 October 2026. Status: local probe and 30 offline tests implemented; read-only OAuth and bounded live reads subsequently verified. Futures history and quote permissions remain unresolved; quotes and monitoring unverified.

Use the official Python SDK pinned at 3.8.0 in an isolated local environment. Give Pip its own OAuth registration and private token store, request only the four supported read scopes, reject broader/unknown grants and independently allowlist read business methods before dispatch. Do not claim device quote permissions during initialization or expose arbitrary SDK/order operations.

The probe reports bounded account/position/order/fill, permission and futures-contract reads with gaps, times, quantities and continuous-reference limits explicit. Reports remain local; no broker data is sent to models. The current gold label is unresolved, and `BZmain` remains a research reference. This diagnostic is not shared production identity, active monitoring, a complete account reconciliation or customer-ready broker onboarding. See [setup and verification](TIGER_ACCESS.md).

## 0011 — Broker accounts replace crypto-wallet and venue connectivity

Date: 27 October 2026. Status: founder-directed removal implemented; broker integration remains planned.

Funds and trading stay with the user's broker. Remove the wallet/Hyperliquid UI, connection page/API, browser discovery/signatures, session/account adapters, signer/execution package, setup/rotation tools, dependencies and venue-specific market-research CLI/configuration. Do not replace them with a pretend broker connection. The generic paper domain, research harness, provider adapter and analytical skills remain.

Standard application identity and separately authorized broker access are the intended direction. Tiger is first for the founder; actual account/data/contract access and later broker order execution need implementation and verification. Future approvals, risk enforcement and reconciliation will be broker-specific rather than wallet-signing flows.

## 0010 — Founder-first Tiger macro/futures workflow and delivery plan

Date: 27 October 2026. Status: founder requirements confirmed; implementation recommendations planned, not yet verified in production.

Alan is the solo founder and first heavy user. Prioritize Tiger Brokers US/futures event-and-macro trading held hours to days, with an initial S$500/month operating ceiling excluding existing coding subscriptions and Apple membership. Build persistent, source-backed research and actual position/event monitoring first; support paper decisions and a thin native SwiftUI client next. Exact-approval trading and bounded autonomy are separate later capabilities with independent broker, risk, operating and regulatory gates.

The [current plan](PRODUCT_PLAN.md) and [backlog](BUILD_BACKLOG.md) bridge the existing disconnected prototypes. Keep Pip-owned context, policy, research memory and metering; provisionally select a direct Sol API adapter and shared Postgres/private storage, subject to evaluation and deployment spikes. Add macro/event and futures methods to the existing research bundle rather than forcing short-term futures work through the company-model route. Investigate Tiger access/data rights immediately; personal retail access does not establish commercial multi-user permission.

The Singapore commercial ambition includes an appropriate MAS route; obtain a scoped assessment before external personalized recommendations, not only before automated execution. Earlier records below retain implementation history and do not override the new founder scope or budget.

Decisions 0006 and 0007 are retired by 0011; their connection and execution stack has been removed.

## 0001 — Own the application harness and isolate provider transports

Date: 26 October 2026. Status: implemented for the research boundary foundation; durable engine and provider adapter still open.

Pip will own mandate/context preparation, tool permissions, usage budgets, evidence records and approval/execution boundaries. Model transport will use a replaceable adapter around an established SDK. The first package supplies only scoped read tools and a local durable usage ledger.

This follows the [source study and design](HARNESS_DESIGN.md). It gives the product stable control contracts while allowing the model, SDK or workflow runtime to change. It also avoids importing the broad execution capabilities of a coding-agent harness into the initial investing workflow.

Consequences:

- The web demo remains scripted while the harness foundation is verified separately.
- Provider calls, full run journaling, approvals and restart recovery need additional implementation and acceptance tests.
- A custom state machine, LangGraph.js and AI SDK WorkflowAgent remain candidates for durable orchestration. No production runtime comparison has been performed yet.
- SQLite is a local development choice. Production identity, deployment, tenant isolation, database operations and provider cost bounds remain explicit gates.

## 0002 — Prioritise research time saved and reduced monitoring burden

Date: 26 October 2026. Status: founder-defined product direction; capabilities and value still to be validated.

The two primary problems are that research takes too much time and portfolio monitoring requires constant attention. Prioritise a useful sourced research brief and background monitoring that surfaces meaningful changes. Conversation, onboarding and the harness support these outcomes.

Measure research time saved against a manual baseline, unnecessary checking avoided, alert usefulness/noise and detection-to-delivery reliability. Live autonomous execution is a later capability and is not required to begin testing these two problems.

Background observation and deterministic alerts have a different cadence from model research. Keep the initial one-daily-review-plus-on-request model policy. Select watch conditions, notification delivery and timing targets before claiming the portfolio is monitored while the user is away. The current prototype has neither real research nor background notification delivery.

## 0003 — Retrieve observable account facts before asking the user

Date: 26 October 2026. Status: founder-directed interaction policy; real connection/read adapters remain unimplemented.

Once broker access is authorized and connected, the agent should obtain balances, positions, margin, orders and other available account facts through tools. Check connection state first and request the missing connection when necessary. Ask follow-up questions about user intent or genuinely missing/conflicting information, rather than asking the user to manually supply facts available from connected sources.

Read access does not confer trading authority, and observed holdings do not define the user's allocated capital. Source timestamps and unsupported instruments/accounts must be explicit. Never present simulated or missing connection data as an observed balance.

## 0004 — Research across supported asset classes before allocating

Date: 26 October 2026. Status: founder-directed scope; broker instrument coverage and production strategy validation open.

Discover and validate the supported broker instruments, including applicable equities, indices, commodities and currencies. Distinguish diversification, directional theses, factor hedges, relative value and spot/perpetual carry. Each strategy needs an economic rationale, evidence, contract/cost analysis and explicit failure conditions before it can support an allocation. Correlation, listing availability, a loss budget or an LLM narrative alone cannot establish an investment case or portfolio weights.

Use deterministic calculations and explicit, evaluated sizing policies. Hedge ratios, gross exposure, collateral pools and portfolio-wide factor risks must be considered; equal-dollar long/short positions are not automatically neutral. Different tickers or asset-class labels do not establish diversification. Keep unsupported products and insufficient evidence explicit, and accept no action as a result.

## 0005 — Own the next task and continue research within the mandate

Date: 26 October 2026. Status: local runtime and opt-in provider transport implemented; production integration and real model verification open.

The founder requires a proactive agent that keeps advancing the user's mandate, rather than stopping at a shortlist or an unsupported “no trade yet.” Continue useful investigations within each bounded cycle. Every review must retain a concrete next task, an essential user question, a candidate for independent validation or an actionable explanation of an infeasible target. A no-trade outcome preserves research progress and a daily follow-up; it does not end the mandate.

Use explicit durable workflow state, independently enforced authority, shared usage budgets and capped model/tool steps. Preserve the agreed one-daily-review-plus-on-request cadence; idle observations must not become unbounded paid reasoning. Persist before dispatch, replay settled results, fence concurrent workers and hold uncertain outcomes for reconciliation. Ambitious return goals do not expand permissions or justify arbitrary risk.

The [local proactive runtime](PROACTIVE_AGENT.md) implements that lifecycle with a deterministic offline demonstration, a reusable OpenRouter SDK adapter. The venue-specific market tools were removed; new broker/research adapters remain to be implemented. It has no production identity, live account context, validated trading strategy, real-time watch service, remote notifications or execution integration. A configured provider key/model and real-provider verification are required before claiming an LLM is running in the worker.

## 0008 — Curate research methods into a conditional analyst cycle

Date: 27 October 2026. Status: project skill bundle authored; runtime selection and artifact-store integration remain open.

Preserve the imported Claude collection as source material and maintain a canonical [research bundle](../skills/README.md). The founder asks us to choose the best sequence, with the model established before valuation and conclusions. Use historical actuals -> operating data -> guidance -> forward model -> model/consensus audit -> valuation/expectations -> targeted thesis validation/challenge -> investment conclusion -> brief. Keep valuation provisional until validation, separate the conclusion artifact, and draft management questions where they can change assumptions. Broader strategy/portfolio/monitoring work extends the analyst conclusion rather than replacing this model-first core. Continue authorised analysis with concrete next tasks; approval requirements come from actual actions and the user mandate, not a legacy default to pause after every step.

Use versioned source-aware handoffs and invalidate affected downstream work when facts, assumptions or mandates change. Retain provenance, distinguish observation/guidance/assumption/derivation, avoid forced accounting/KPI reconciliations, and keep company formatting preferences optional. The skills do not create tools, imply source access, approve positions or activate watches. Machine shape/numeric checks supplement model judgment; they do not certify research quality or investment performance.

## 0009 — Target retail brokers and develop the experience alongside the backend

Date: 27 October 2026. Status: founder-confirmed direction; Tiger is the first planned adapter, with actual access unverified.

Target Tiger first through supported retail-broker access; Moomoo and other brokers can follow demonstrated need. The old venue-specific stack and study have been removed; the provider-independent research harness remains. Target names do not establish API/MCP availability or supported account permissions.

Refine onboarding, the starting plan, managed allocation, activation, reporting and controls alongside useful backend work. A completed customer journey is not a mandatory prerequisite for research, harness or integration components.

A plan shown before connection is an explicitly provisional preview. An account-aware allocation requires verified holdings and the user's intended managed amount. Retrieve observable account facts through authorised connections, preserve source/freshness information, and do not treat the entire account balance as delegated capital. Confirm the resulting plan and mandate before activating the supported management mode.
