# AiFi Project — Product and Engineering Handoff

Updated: 27 October 2026
Status: Local web prototype, harness, persistent research runtime, analyst skills and separate read-only Hyperliquid connection implemented. Optional model adapter added; no real model verification, retail-broker integration or mainnet trading.

Connectivity update: `/connect` now connects MetaMask to **Hyperliquid mainnet for read-only account checks**, with automatic owner-account reads and a fresh green Mainnet / Read only indicator. No separate account, network switch or API trading approval is required. Details cover core perps and spot, explicitly excluding builder-deployed markets. The separate local execution package remains testnet-only and disarmed; mainnet order submission is absent. See [Hyperliquid connectivity](docs/HYPERLIQUID_CONNECTIVITY.md). The scripted workspace and proactive research runtime remain research/paper-only.
Project name: Not selected. “AiFi” is a working category label.

## 1. Product in one paragraph

Build a retail-facing personal AI investment manager that reduces the time users spend researching and the attention required to monitor their portfolios. Users connect their own accounts, set a mandate, and interact with a persistent personal investment agent through mobile and web. The platform supplies portfolio-aware research, background monitoring, meaningful updates, independent risk checks and eventual delegated execution. Target retail-broker access through Tiger, Moomoo and Robinhood; the first adapter and supported access remain to be selected and verified. Support paper proposals initially, then opt-in autonomous management under revocable, bounded authority once execution gates pass. Use model APIs, with platform-owned memory and explicit compute budgets.

## 2. Decisions and boundaries

| Topic | Current direction |
| --- | --- |
| Customer | Founder first, then a few invited testers; broader retail segment remains to be validated |
| Primary pain points | Research takes too much time; monitoring a portfolio requires constant attention |
| Primary user value | Useful research with less manual work, and timely portfolio updates that reduce repeated checking |
| Broker targets | Tiger, Moomoo and Robinhood; first adapter, access mechanism and supported account model remain unselected and unverified |
| Assets | Broad market discovery across available asset classes; do not hardcode the product around equities |
| Account connection | Retail-broker accounts are the current direction. MetaMask/Hyperliquid were earlier targets, not required onboarding dependencies; never request seed phrases/main private keys |
| Custody intent | Platform does not receive customer deposits into its own pooled account; actual key/control architecture requires technical and legal assessment |
| Agent authority | User-defined mandate; eventual opt-in delegated trading without external withdrawal authority |
| Interface | Native iOS app using SwiftUI/Xcode plus web app, with shared conversations, memory and portfolio state |
| Mobile role | Primary human-to-agent interface: conversation, notifications, controls and account activity |
| Web role | Detailed research, portfolio analysis, configuration and history |
| Model connectivity | Backend API access; OpenRouter is a candidate gateway, not a permanently running agent host |
| Model choice | Default model plus a small supported model selection; selection does not alter permissions |
| Memory | Durable, isolated user records owned by the platform, independent of model provider |
| Availability | Shared backend and monitoring are always available; LLM reasoning runs on messages, events or schedules |
| Initial research cadence | One daily AI review plus research on request; account data refreshes have a separate cadence |
| Initial pilot budget | Up to S$200/month if it materially improves the MVP; minimise actual spend, excluding existing coding subscriptions and Apple membership |
| Starting price hypothesis | US$20/month with bounded compute; not unlimited autonomous deep research |
| Investment performance | No guaranteed profits or capital protection; honest reporting and reliable operation remain essential |
| Brand | Cute, approachable and trustworthy, while credible for serious money decisions; no final name or availability checks |
| Interface design | Minimal black-and-white chat with DM Sans, using the founder's ChatGPT screenshot as the proportion reference. One 768px conversation column, content-sized pill-shaped bubbles, soft tonal contrast, a filled bottom message bar, one wallet button and one menu. A compact Hyperliquid connection link uses a neon green light only after a fresh account read verifies the linked testnet account and current agent approval; stale, missing and failed checks stay neutral. The light indicates connection, not enabled trading. Testnet remains explicitly labeled; the link opens connection setup directly. This green light is the requested exception to monochrome styling. No sidebar, search, profile area or read receipts. Assistant bubbles use up to 88% of the column (676px cap), user bubbles 86% (660px cap); same-speaker messages have tighter spacing. One session timestamp appears above the conversation. A jump-to-latest button appears only when scrolled away. Summary and reset live inside the menu; paper approvals appear only when relevant. The current reply engine remains a scripted paper demo. |
| Agent harness | Pip-owned context, tool policy, evidence and usage boundaries, informed by source review; provider adapters and durable orchestration remain swappable |

These are product directions, not evidence that a secure live service, commercial integration or licence is already available to this project.

### Confirmed refinements — 27 October 2026

- **Execution direction:** Target Tiger, Moomoo and Robinhood through supported broker access. This supersedes the earlier Hyperliquid/MetaMask-first plan. Preserve the existing Hyperliquid public-data study and tools as prototype research work, not a commitment to the first execution venue.
- **Build order:** Customer-journey design and backend work can progress together. Defining onboarding, the starting plan, allocation, activation, reporting and controls is not a prerequisite for useful harness, research or integration work.
- **Account-aware allocation:** Before account connection, a plan is an explicitly provisional preview. An account-aware allocation requires verified holdings and the user's intended managed amount, followed by relevant funding, exposure and mandate checks. Connected balances are observations, not permission to manage all assets.
- **Continuity:** Reuse the implemented prototype, persistent harness and model-first research cycle. The imported [product discussion](handoff.md) adds direction rather than resetting the project.

### MVP refinement — 26 October 2026

Confirmed in the initial setup discussion; the broker and wallet priorities below are historical and superseded by the 27 October refinements above:

- **First users:** The founder, followed by a few invited testers.
- **Primary problems:** Research takes too much time, and monitoring a portfolio requires constant attention. Judge the MVP by research time saved and reduced monitoring burden; onboarding, chat and the harness enable these outcomes.
- **Core workflow:** Understand each user's risk profile and needs, research suitable strategies, and monitor/manage positions toward the user's stated return objectives within their mandate. Return objectives are planning inputs, not promised outcomes. Actual live position management remains subject to the later execution and authorisation gates.
- **Clients:** A native iOS app using SwiftUI/Xcode and a web app sharing one backend. The founder explicitly removed Expo from the plan and wants initial iOS testing in the iOS Simulator on their Mac.
- **Build order:** A simulated prototype first, followed by real read-only account connections and AI research. Simulated actions must be clearly labelled; the first usable milestone cannot submit live trades.
- **Initial geography:** Probably Singapore for operations and initial testers; this remains provisional and does not establish product eligibility or regulatory arrangements.
- **Schedule:** Aim for a minimum usable MVP in approximately one month, provisionally late November 2026. This is a planning target rather than a delivery commitment.
- **Cost preference:** Keep development and the initial pilot affordable, using free tiers where suitable, with a ceiling of S$200/month if spending materially improves the MVP. This is the total initial pilot ceiling, not a per-user allowance or a target to spend. Existing AI coding subscriptions and Apple membership are excluded; runtime model APIs, search/data and hosting are included.
- **Engineering preference:** Use AI heavily for implementation and a well-supported stack for persistent agent conversations, research, controlled tool integrations, Hyperliquid connectivity and wallet status. The agreed direction is native SwiftUI for iOS and Next.js/TypeScript for web/API, with the implementation baseline below; model providers, hosting and installed package compatibility remain unresolved.
- **First connections:** Hyperliquid as the venue and MetaMask as the existing-wallet integration. The founder uses MetaMask and does not currently have Hyperliquid positions. An empty account and a clearly separate simulated portfolio are required first-class states.
- **Strategy interaction:** Users describe their needs to their own agent rather than being forced into a platform-selected strategy. The agent helps formulate a mandate and proposes strategies within the approved mandate. Exact conversational onboarding and confirmation behaviour are an engineering recommendation below, not an already validated customer flow.
- **Tool scope:** Approved APIs and MCP tools for research, wallet reads and Hyperliquid. General DeFi execution, bridging and lending are outside this initial scope.
- **iOS access:** The founder has an iPhone, a Mac and Apple Developer membership, and has built iOS apps on a Mac before. Use Xcode and the iOS Simulator on the Mac for native development and testing. The current Windows workspace cannot run Xcode or the iOS Simulator; native build and simulator verification must happen on a Mac.
- **Research cadence:** One daily AI review plus research on request. Keep portfolio/account refreshes separate from model invocations and meter scheduled and manual research against the same budget.

Remaining setup questions include the first retail-broker adapter and supported account access, validated market/product coverage, research sources and commercial rights, model/provider selection and hosting. Strategies and holding periods should be derived per user within supported capabilities, rather than fixed globally. Keep engineering recommendations distinct from founder-confirmed decisions.

### Recommended one-month deliverable

The following makes the founder's target concrete; it is a scoped engineering recommendation, not a promise of live trading readiness:

1. Run an iOS app and a web app against one backend, preserving each user's conversations, profile, mandate and proposal history across both clients.
2. Complete a conversational risk/needs interview and approve a structured, versioned mandate. Support users who do not yet know their target return or preferred strategy.
3. Implement one supported broker account connection from the Tiger, Moomoo and Robinhood targets, after validating access. Display verified read-only holdings and available funds with source/freshness timestamps, and record the user's intended managed amount separately. Empty accounts must work without requiring a deposit or position. Keep any pre-connection portfolio preview provisional.
4. Maintain a separate, clearly labelled paper portfolio with user-selected simulated starting capital. Never merge simulated balances, fills or P&L into actual account records.
5. Generate sourced strategy/trade proposals, explain portfolio impact and uncertainty, and evaluate them using deterministic mandate checks.
6. Track approved hypothetical decisions with explicit execution, fee and funding assumptions. Run one daily review and research on request within spending limits.
7. Show decision/activity history, source timestamps, research usage and review controls. No live signing, order submission or fund movement is included.
8. Exercise a minimal background monitoring loop with explicitly selected watch conditions, persistent/deduplicated alerts, monitoring-health status and an agreed notification-delivery channel. Test meaningful changes and data-feed interruptions. This is a target capability, not present in the current scripted prototype; alert conditions, delivery channel and timing targets still need selection.

Suggested milestones: simulated client flows and domain contracts; durable identity/memory and one supported read-only broker integration; sourced research and independent checks; daily reviews, paper accounting and failure-mode verification. Progress on backend and customer experience can overlap; completing the journey design is not a prerequisite. Validate the selected broker connection on both platforms early. Narrow research coverage before weakening isolation, evidence or accounting requirements if time becomes constrained.

## 3. Problem and positioning

### Founder-defined pain points

1. **Research takes too much time.** Gathering information, checking sources, forming a view and understanding portfolio implications consume too much manual effort.
2. **Monitoring a portfolio requires constant attention.** Users repeatedly check positions, markets and news to determine whether something requires action.

These are the founder's defined problems; their prevalence, willingness to pay and degree of improvement still need validation with pilot users.

| Problem | Product outcome | Evidence of value |
| --- | --- | --- |
| Time-consuming research | A concise, portfolio-aware research brief or decision proposal with traceable sources, counterarguments, costs and clear uncertainty | Less user time needed to reach an informed decision, while factual accuracy and source quality hold up |
| Attention-intensive monitoring | Background observation, a daily brief and timely alerts for material changes or monitoring failures | Fewer unnecessary manual checks, useful alerts, low duplicate/noise rates and measured detection-to-delivery time |

The product should make delegation useful even before live execution is enabled. Onboarding establishes context and permissions; research and monitoring deliver the primary value. A no-action conclusion is valid. An absence of alerts must not imply that monitoring is healthy when data is stale or a worker has failed.

### Initial positioning

A personal investment agent that researches with the user's portfolio in mind and monitors it in the background, surfacing what matters within user-approved boundaries.

With equity perpetuals, this is a trading product with derivative mechanics. Do not describe a stock-linked perpetual as ownership of a company share.

### Customer validation

- Identify the first users: crypto-native active investors, systematic traders or another specific segment.
- Validate the research-time and portfolio-attention problems separately, including which research tasks and monitored changes matter most to the first users.
- Compare against their current workflow, including exchange interfaces, trading bots, general LLM tools and buy-and-hold alternatives.
- Measure repeat use, paid renewal, accepted/rejected proposals, time saved and total delivery cost.
- Record a manual-work baseline, then measure research minutes saved, repeated portfolio checks avoided, alert usefulness/noise, monitoring coverage and detection-to-delivery time. Do not treat chat volume or trade count as the primary success metric.
- Simple ETF investors may have little reason to switch; do not assume a broad retail market is validated.

## 4. MVP scope

### Include

1. Wallet-based authentication and account linking.
2. Hyperliquid read access, dynamic market discovery and a unified portfolio dashboard.
3. Onboarding for goals, horizon, risk constraints and authority settings.
4. One persistent agent with API-based model routing and a limited model selector.
5. Portfolio-aware research and structured trade proposals with sources.
6. Independent mandate checks and a separately controlled signing boundary.
7. Paper/shadow decisions followed by controlled live execution.
8. Order tracking, reconciliation, monitoring and an audit history.
9. Mobile conversation and web detailed views using the same backend.
10. Subscription, usage metering, research credits and cost limits.

### Defer

- Universal traditional bank/broker/CPF/insurance connectivity.
- A full household wealth-planning service.
- Multiple execution venues, cross-chain bridging orchestration and yield protocols.
- An agent marketplace or a fleet of specialist agents per user.
- Proprietary wallets, custom cryptography and pooled customer investment vehicles.
- Unlimited research, unrestricted model selection or dedicated computers for every user.
- Any promise that the agent produces superior returns.

Broad market discovery does not mean blindly enabling every newly listed product. Each market type needs validated metadata, pricing, order handling, permissions and risk rules. Keep unsupported instruments visible as unsupported where useful, rather than executing them incorrectly.

## 5. Main user journeys

### Recommended conversational mandate formation

Check available connections and retrieve observable account facts before asking follow-up questions. Once authorised and connected, read wallet balances/token identities on supported chains and the linked Hyperliquid account's equity, collateral, positions and open orders. Display sources and freshness. Do not ask the user to recite facts available through these tools, such as where connected balances are held. If a required connection is missing, present the connection action and explain the required read access; never imply that an unimplemented or unconnected tool has been used.

Ask users for intent and facts that cannot be observed reliably: goals, horizon, spending/liquidity needs, loss capacity, which funds are allocated to the agent and whether existing positions are included. A wallet's total balance does not establish permission to use all of it. Ask a targeted question only when retrieved facts conflict, are missing, or do not establish the user's intent. Read account facts before researching an allocation and refresh them before any proposed action.

1. Let the user begin with their own goal or a guided conversation; a complete investment prompt is not a prerequisite.
2. Ask focused follow-ups about allocated capital, horizon, liquidity needs, experience, ability and willingness to bear losses, existing holdings and desired outcomes. Keep missing facts explicit.
3. The agent proposes a structured mandate containing scope, permitted products, gross notional/exposure definitions, leverage and concentration rules, review cadence and authority mode. Translate vague phrases such as "low risk" into concrete, reviewable limits.
4. The user reviews and explicitly approves the mandate. The backend validates and versions it. In the first milestone, its authority mode can only permit research and simulated decisions.
5. The agent researches strategies that fit that mandate and explains product fit, costs, counterarguments and any mismatch between the user's objectives and supported opportunities. Holding cash or taking no action remains valid.
6. Changes that widen risk limits, product scope or authority produce a new proposed mandate and require fresh user approval. Chat messages and third-party tools cannot silently change permissions.

Platform software provides the supported market catalogue, data-quality requirements, tool permissions and independent policy checks. Each personal agent handles profile-aware research and strategy proposals within those boundaries. Do not turn a requested return into a guaranteed outcome or infer permission to increase risk to pursue it.

Cross-asset research must cover validated builder-deployed markets as well as crypto. Distinguish diversification from factor hedging, relative value and carry; require an economic thesis and tested sizing policy before assigning weights. A loss budget or historical correlation alone does not justify an allocation. The [26 October public-data pair screen](docs/research/HYPERLIQUID_PAIR_SCREEN_2026-10-26.md) compares NVDA/AMD, XYZ100/SP500 and GOLD/SILVER using captured candles, funding and order books. It is a standalone diagnostic, not a validated trading strategy or an integration into the web app/harness.

The agent must own and advance the next useful task. A shortlist or no-trade finding should lead to further investigation, a timed follow-up, an essential user question or an actionable mandate revision rather than abandonment. Continue within approved risk/tool limits and bounded compute; do not chase an infeasible return target by silently widening authority. The [local proactive runtime](docs/PROACTIVE_AGENT.md) now demonstrates multi-step continuation, persisted tasks/checkpoints, model-request accounting, exclusive workers and a daily wake-up. Its opt-in OpenRouter/public-market CLI is separate from the web app, uses a synthetic allocation and needs local credentials/model selection. No paid model call was made during implementation. Deterministic real-time monitoring, remote notifications and independent proposal/approval integration remain open.

### Research analyst skill cycle — 27 October 2026

The founder supplied ten raw Claude skills and asked for the best logical sequence, explicitly establishing the model before valuation/conclusions. The [cleaned project bundle](skills/README.md) now centres company research on historical 3S -> operating data -> guidance -> forward model -> model/consensus audit -> valuation/expectations -> thesis validation/challenge -> investment conclusion -> brief. Management questions branch from material uncertainties. Model audit and post-valuation thesis validation are distinct passes, and valuation and the final conclusion are separate artifacts. Strategy testing, portfolio construction and monitoring are downstream extensions; non-company instruments use their relevant economic methods. The [audit](docs/RESEARCH_SKILLS_AUDIT.md) records source mapping, corrected methods, preserved workbook conventions and missing capabilities. Original files under `Claude Skills/` and live Claude installations are not overwritten.

Skills are authored guidance with versioned handoffs and authoring/numerical checks, not automatic backend enforcement or installed capabilities. The existing worker does not load this bundle or persist its full artifact contract yet. Selective skill loading, artifact invalidation, richer retrieval/backtesting tools and actual watch activation remain integration work. Keep mandate, identity, tool policy, costs and execution controls in trusted application code.

### Onboarding and initial portfolio

1. Connect a wallet and verify ownership through an appropriate signed challenge.
2. Link the user's venue account and read current balances, positions and orders.
3. Collect account purpose, allocated capital, time horizon, withdrawal needs and trading preferences.
4. Establish permitted markets, exposure and leverage limits, position limits, pause conditions and authorisation expiry.
5. Ask whether existing positions are included in the agent's mandate.
6. Generate a starting plan based on qualifying opportunities and current holdings. Unallocated collateral is a valid result.
7. Present target positions, rationale, costs, correlated exposures, adverse scenarios and review/exit conditions.
8. Obtain approval of the mandate and initial plan. Recheck the account before each actual order.

The initial plan must distinguish gross notional exposure, posted collateral, account equity and available margin. “Use up to my capital” is ambiguous until this is resolved. If the intended rule is no notional exposure above account equity, encode that exact rule and account for outstanding orders.

### Human-approved mode

User asks or an event triggers research → agent proposes → independent checks run → user reviews/signs or authorises the specific order → submit → reconcile → update portfolio and history.

### Delegated mode

User funds an account and grants a revocable mandate → qualifying events trigger research → agent proposes an action internally → independent signer/risk checks approve or reject → execute and reconcile → notify according to preferences.

The LLM cannot approve its own permission changes. Material changes to the mandate or authority require fresh user authorisation. Expiry may require periodic renewal; “one sign-off” is not a promise of permanent authority.

### Pause and exit controls

Expose distinct actions for:

- Pause new risk-taking.
- Cancel outstanding orders, with explicit handling of protective orders.
- Reduce or close positions, subject to execution conditions.
- Revoke delegated authority.
- Withdraw through the user's own authorised flow.

Revoking access does not itself close positions or necessarily cancel existing orders. Explain and test each operation separately.

## 6. Research design

Research should conclude with a decision: open, hold, reduce, close or take no action.

| Layer | Purpose |
| --- | --- |
| Market conditions | Trends, volatility, correlations and relevant scheduled events |
| Opportunity screening | Narrow the available universe using reproducible signals and qualifying catalysts |
| Thesis investigation | Drivers, horizon, supporting evidence, strongest counterargument and missing information |
| Instrument assessment | Contract structure, liquidity, spread, funding, margin, liquidation mechanics and holding-period fit |
| Portfolio impact | Gross exposure, concentration, correlated positions, collateral and stress scenarios |
| Position review | New information, thesis invalidation and whether action is warranted |

Research inputs vary by market: crypto supply/unlocks/adoption; equity earnings/valuation/sector news; index and FX growth/rates/policy; commodity supply/demand/inventories. Obtain sufficient licensed data for the chosen coverage. An exchange price feed alone is not a complete research dataset.

### Required proposal fields

- User/account/mandate version and proposal ID.
- Venue, instrument identifier, product type, direction, size and order constraints.
- Thesis, catalyst, intended horizon and strongest opposing case.
- Sources, timestamps, data gaps and uncertainty.
- Current portfolio snapshot identifier and portfolio impact.
- Fees, funding assumptions, liquidity and relevant adverse scenarios.
- Invalidation conditions and monitoring triggers.
- Estimated and actual research cost.
- Risk-check results, authority mode and lifecycle status.

Start with a daily portfolio brief and research on request. Use ordinary code for background observation, broad screening and calculations, then spend LLM tokens on relevant candidates within the agreed cadence and budget. Event-triggered automatic AI investigations are a later opt-in capability. Reuse common market research where rights permit; keep private user information isolated.

### Portfolio monitoring and attention management

Keep background observation separate from discretionary LLM research. Account/market updates and deterministic watch rules can run without invoking a model on every tick. The agreed initial AI cadence remains one daily review plus research on request; automatic event-triggered AI investigations require a later explicit cadence/budget decision.

Define and validate the first watch conditions with pilot users. Candidate conditions include mandate-limit breaches, relevant position/price changes, approaching agreed review thresholds, order/account changes and stale or missing data. Alert only for supported, configured conditions; coverage of all possible news or risks is not assumed.

Each alert should record its account, condition, source snapshot, observed time, severity, concise explanation, proposed next step and lifecycle/delivery status. Use deduplication and suitable cooldowns; group routine updates into the daily brief. Surface feed/worker health separately so failed monitoring cannot silently look like an uneventful portfolio.

To validate reduced attention burden, users must be able to leave the app closed while the backend continues operating and receive the agreed notifications. An in-app alert list alone does not establish that outcome. The notification channel, permissions and delivery targets remain open; no notification service is enabled in the current prototype.

## 7. Architecture

```text
apps/
  ios/                # Native SwiftUI: conversation, permissions, portfolio
  web/                # Detailed research, analytics, settings, history
services/
  api/                # Authentication, user-scoped APIs and orchestration
  workers/            # Scheduled/event-driven research and reconciliation
  signer/             # Separate authority boundary; no general-purpose signing
packages/
  domain/             # Mandates, proposals, orders, instruments and accounting
  harness/            # Research context, scoped read tools and usage ledger
  venue-hyperliquid/  # Metadata, account reads, quotes, orders and fills
  models/             # Provider adapters, routing, token/cost accounting
  research/           # Retrieval, evidence handling and proposal generation
  risk/               # Deterministic pre-trade checks and reservations
  shared/             # Language-neutral API schemas and shared TS validation
docs/
  product.md
  threat-model.md
  architecture.md
  decisions.md
```

This is a proposed logical layout, not a requirement to deploy every module as a microservice. Begin with a small shared application plus workers; preserve the signer's separate security boundary. The baseline below uses native SwiftUI for iOS and Next.js/TypeScript for web/API. Confirm current package compatibility, database/hosting choices and deployment constraints before scaffolding.

### Recommended implementation baseline

The founder agreed to the setup direction and subsequently replaced Expo with native iOS development and Mac simulator testing. Installed package compatibility, providers and deployment details still need validation during implementation.

| Layer | Proposed implementation |
| --- | --- |
| Workspace | One repository containing native Swift iOS code and TypeScript web/backend packages; keep API schemas language-neutral |
| iOS | SwiftUI and Xcode, tested in the iOS Simulator on the founder's Mac; no Expo dependency |
| Web and API | Next.js with a shared, authenticated API consumed by both clients; keep domain logic outside route handlers |
| API contracts | Versioned OpenAPI/JSON schemas as the shared interface, with matching Swift Codable and TypeScript models; enforce business and permission rules on the backend |
| Durable storage | PostgreSQL, with Supabase as the initial managed database/auth candidate; wallet ownership and sessions need an explicit, verified integration |
| Research runtime | Pip-owned harness boundaries with replaceable SDK-backed model adapters; AI SDK and LangGraph.js remain candidates for transport/orchestration after a durable-run spike |
| Daily jobs | One Node.js worker with persisted jobs, retries and budget reservations; choose hosting compatible with its scheduling/runtime needs |
| Wallet access | Existing MetaMask wallet integration; validate a native iOS connection/sign-in and return-to-app flow before choosing its connector; begin with EVM scope and a small explicit chain allowlist, whose exact chains remain unresolved |
| Venue reads | Hyperliquid info API through a dedicated adapter with validated schemas; preserve venue-specific identifiers and product metadata |
| Tools | A backend allowlist with typed inputs, user context, timeouts, permission checks and usage accounting; approved MCP integrations use the same boundary |
| Future signing | A separate service/security boundary, absent from the first usable runtime; SDK/signing implementation will be assessed at the later execution stage |

Use a platform-neutral backend API and a documented streaming protocol so the Swift client does not depend on React or JavaScript chat hooks. Validate streaming and reconnection on both clients. MetaMask's documentation describes native app connection routes, but a SwiftUI integration has not been tested or selected; its Embedded Wallets product has a different purpose from connecting the founder's existing wallet. Hyperliquid lists an official Python SDK and community TypeScript SDKs; do not describe a community SDK as official. A TypeScript read-only adapter can use the documented info API without choosing future signing infrastructure now.

The founder requested a source study of existing harnesses to inform Pip's own implementation. See [Harness design and source study](docs/HARNESS_DESIGN.md), [Proactive runtime](docs/PROACTIVE_AGENT.md) and [Engineering decisions](docs/decisions.md). `packages/harness` implements validated research context, registered reads, model/tool cost reservations, replay, goal checkpoints, local daily continuation and an optional OpenRouter SDK transport. It has no production scheduler, authenticated real-account loader, approval workflow or signer, and is not connected to the scripted web UI. Offline examples run with `npm run harness:demo` and `npm run agent:demo`. Real provider calls remain unverified and require local configuration.

Retain Hyperliquid as the single first venue. dYdX is a credible alternative with documented market/account APIs, but no venue ranking, liquidity benchmark or conclusion that one venue is universally best has been established. Keep the adapter boundary so future venue selection does not require rewriting profiles, mandates or conversations.

### State and memory

- One durable backend is the source for mobile and web.
- Store versioned mandates and explicit approvals as structured records.
- Keep conversations, summaries, research, decisions and event history separately addressable.
- Include essential mandate information on each decision; retrieve other relevant context as needed.
- Use the venue for current holdings/order truth, not a conversational summary.
- Record source and freshness timestamps; reconcile streams with account snapshots.
- Serialize conflicting account actions or use equivalent transactional concurrency controls.
- A model switch preserves stored context but does not guarantee identical reasoning.

Suggested entities: User, WalletLink, VenueAccount, MandateVersion, AgentConfig, Conversation, MemoryRecord, PortfolioSnapshot, Instrument, ResearchJob, Proposal, RiskDecision, ExposureReservation, ExecutionIntent, Order, Fill, Authorisation, UsageLedger, Subscription and AuditEvent.

### Model access

- Platform backend calls supported providers through APIs; never ship provider secrets to clients.
- OpenRouter can simplify multiple providers; direct provider APIs remain an option.
- Default to a bounded routine model, with explicit premium-model/research allowances.
- Record provider, model, token categories, tool charges, retries and task totals.
- Model-provider fallback must preserve tool contracts and permission checks; disclose paid substitutions appropriately.
- API connectivity is shared infrastructure; user memory, permissions and usage budgets are isolated.

## 8. Security and delegated authority

### Principles

1. Never request or store the user's seed phrase or main-wallet private key.
2. Do not give the LLM raw agent keys, credentials or arbitrary signing capability.
3. Use a separate agent key for delegated actions and protect it with an appropriate key-management/signing design.
4. Validate the exact account, instrument, action and mandate version at the signing boundary.
5. Restrict supported actions explicitly; treat unknown actions as unsupported.
6. Enforce independent pre-trade policy using fresh state and pending orders.
7. Use allocated capital in a dedicated account/wallet where practical; do not infer key scope from a UI subaccount label.
8. Protect user isolation, mandate changes, authorisation renewal and account recovery.
9. Keep secrets out of prompts, logs, research documents and analytics.
10. Audit actions and incident response without exposing credentials.

### Important Hyperliquid distinctions

- API wallets are approved signers. Official documentation describes a master account approving agents to sign for itself or subaccounts; do not assume a per-subaccount agent is a hard capital boundary.
- The official SDK demonstrates delegated trading without withdrawal permission.
- Current exchange documentation also permits some agent-signed internal asset movements where destination matches the source address. “No external withdrawals” and “no movement whatsoever” are different promises.
- Agent authorisation does not automatically implement our desired notional, leverage, market or loss limits.
- Application checks protect normal operation, but a stolen broadly authorised agent key may bypass application-only limits. Assess remaining bypass paths and avoid claiming cryptographically enforced limits unless they are actually enforced there.
- Key expiry, replacement, nonce handling and revocation require explicit tests. Follow current documentation on generating fresh agent keys rather than reusing deregistered keys.

### Minimum policy checks

Account ownership and authorisation; mandate validity; market/product eligibility; fresh balances and quotes; gross exposure; pending-order exposure; position/concentration limits; leverage/margin configuration; liquidity/slippage; fee settings; order size/price increments; sufficient collateral; supported action type; task/permission validity.

Loss-triggered pauses and stop orders do not guarantee maximum losses or execution prices. Withdrawal restrictions do not prevent trading losses, liquidation or malicious trades.

### Failure behaviour

- Block new risk if state is stale, conflicting or unreconciled.
- Reserve exposure before concurrent submissions.
- Reconcile uncertain outcomes before retrying; avoid duplicate orders.
- Distinguish rejected, accepted, resting, partially filled, filled and cancelled states.
- Handle cancellation/revocation without abandoning open positions silently.
- Treat third-party research as untrusted input incapable of modifying authority.
- Separate discretionary AI budget exhaustion from essential risk monitoring and approved position management.

## 9. Availability and compute economics

“Always on” means the service can monitor and respond while the user's devices are offline. It does not require a dedicated LLM, VM or browser for each user.

Use shared market streams, deterministic monitoring, event queues and workers. Invoke models for messages, scheduled reviews and qualifying events. Batch related triggers and reuse common research when appropriate.

### US$20 entry subscription hypothesis

| Item | Illustrative monthly target per user |
| --- | ---: |
| Revenue | US$20 |
| Maximum AI spend | US$3 |
| Other direct costs | US$3 |
| Contribution before fixed staffing/compliance/acquisition | US$14 |

These are unvalidated targets, not vendor quotes or a profit forecast. Data contracts, low initial scale, support and research intensity can invalidate them. Measure actual all-in delivery cost before committing to allowances.

Implement per-user and per-task budgets, cost reservations for concurrent work, token/reasoning/tool/retry limits, monthly allowances and prepaid top-ups. Paid tiers should reflect research consumption and automation depth; safety controls remain available across tiers.

### Illustrative token arithmetic

The following uses hypothetical ordinary-input/output rates to make workload assumptions explicit. Reprice against current vendor terms before implementation; caching, reasoning accounting, tool charges and routing fees can change the bill.

| Workload | Tokens per complete cycle | At US$0.10 input / US$0.50 output per million | At US$2 input / US$10 output per million |
| --- | --- | ---: | ---: |
| Routine decision, hourly for 30 days | 20,000 input + 2,000 billed output | US$2.16/month | US$43.20/month |
| Routine decision, every 5 minutes for 30 days | Same | US$25.92/month | US$518.40/month |

For a deep job consuming 300,000 input + 30,000 billed output tokens across all calls: US$0.90/job at US$2/US$10 per million, or US$4.50/job at US$10/US$50. Thirty such jobs cost US$27 or US$135 in base model charges alone. These token quantities are assumptions, not measured research benchmarks.

### Trials and pricing

- Free interactive demos can reuse example research with minimal personalised inference.
- A trial should have a fixed allowance and expiry.
- Personalised autonomous paper trading still incurs model/data/hosting costs.
- Paper versus live is an execution setting, not a reason to offer unlimited free inference.
- Earlier US$49–99 and higher-tier prices were brainstorming, not agreed launch prices.
- Small account economics matter: US$20/month is US$240/year, before trading costs.
- Pure subscription-connected ChatGPT usage is not the MVP foundation. Official user-authorised plan sharing exists for eligible integrations, but commercial remotely hosted availability requires approval and usage remains limited. Do not pool one consumer account across customers.

## 10. Build sequence and acceptance gates

### Stage 0 — Freeze the first slice

Write the product spec, threat model, authority contract, data requirements and architecture decisions. Select the stack and target wallets. Verify actual Hyperliquid capabilities, commercial data rights, product eligibility and applicable regulatory arrangements. Set explicit pilot and launch gates.

### Stage 1 — Simulated mobile and web experience

Create connected mock screens for conversation, portfolio, proposal details, mandate approval, activity and pause/revoke controls. No real funds or production credentials.

Acceptance: the full interaction is understandable on mobile and detailed views work on web.

### Stage 2 — Read-only venue and durable memory

Link wallet identity, retrieve real account data and market metadata, persist user state, and synchronise both clients.

Acceptance: portfolio figures reconcile with the venue; changing devices preserves state; one user cannot access another user's records.

### Stage 3 — Bounded research and shadow trading

Generate sourced proposals, run policy checks, record hypothetical actions and meter complete research costs. Include fees/funding assumptions and realistic execution limitations in paper results.

Acceptance: research is traceable; no live order can be sent; per-user/task spending caps hold under concurrency; stale data and invalid proposals are rejected. Background monitoring detects configured test conditions, persists/deduplicates alerts and reports stale-feed/worker failures; notification delivery and its timing are verified through the selected channel.

### Stage 4 — Deterministic execution and authorisation

Integrate the isolated signer, client order identifiers, exposure reservations, fills and reconciliation. Exercise controlled orders independently of model reasoning before connecting autonomous proposals. Use suitable test environments and recognise that simulated liquidity may not reflect live execution.

Acceptance: no duplicate orders after timeout/retry; partial fills reconcile; unauthorised payloads fail; key expiry/revocation works; failure recovery has defined behaviour.

### Stage 5 — Limited live pilot

Use narrowly allocated capital and consenting pilot users only after applicable permissions and security gates are satisfied. Begin with explicit approvals, then test opted-in delegated mode under a fixed mandate. Monitor continuously and keep an incident procedure ready.

Acceptance: complete decision-to-fill auditability; independent controls work; costs and user value are measured; emergency actions are tested.

### Stage 6 — Paid launch readiness

Add robust subscriptions/allowances, operational dashboards, support, recovery, backups, retention/deletion controls and independent security review. Resolve applicable legal/regulatory arrangements before public live service.

### Rough planning estimates

Assuming one capable builder using AI full time: prototype 1–2 weeks; useful read-only/shadow product 3–5 weeks cumulative; limited live pilot roughly 8–12 weeks; credible paid release roughly 4–6 months. These are estimates, not commitments. Part-time work, unfamiliarity, reviews and external approvals can extend them substantially.

## 11. First usable milestone

A user opens mobile, connects their account, receives a concise sourced and mandate-aware research brief or proposal, and opens the same research and history on web. With the app closed, background monitoring detects a configured material change and delivers a useful alert through the agreed channel; routine status is available in the daily brief. The system records its compute cost and performs risk checks, but cannot submit a live trade.

This target milestone validates research time saved, reduced monitoring burden, connectivity, memory and economics before granting financial authority. Real research, background monitoring and notification delivery are not implemented in the current scripted web demo.

## 12. Instructions for the coding AI

- Treat this file as the project brief. Preserve the agreed scope and surface unresolved decisions.
- Start with Stage 0/1 and the first usable milestone; do not implement all future features at once.
- Inspect the repository and applicable AGENTS.md before editing.
- Choose a small vertical slice; propose and implement the smallest coherent change.
- Verify current primary exchange/provider documentation. Do not invent permissions, endpoints or error semantics.
- Use established wallet/crypto libraries. Do not create custom cryptography.
- Do not put credentials in source control, prompts, client bundles or logs.
- Keep model output separate from executable authority. Validate structured proposals and exact signed payloads.
- Test domain invariants and failure modes, especially tenant isolation, signing, exposure accounting, retries, budget concurrency and revocation.
- Explain what changed, what was tested and what remains unverified.
- Never enable live trading, grant wider authority, move funds or deploy publicly merely to complete a coding milestone. Obtain explicit authorisation for those actions.
- Maintain architecture decisions and update this specification when the founder changes scope.

### Starter instruction to paste into the working environment

> Read PROJECT_HANDOFF.md and any repository instructions. Summarise the agreed MVP and unresolved decisions. Propose a minimal stack and repository structure for mobile, web and one shared backend, with an isolated future signing boundary. Implement Stage 1 using simulated data, with live execution impossible. Establish the core domain contracts for users, mandates, portfolios, proposals, orders and usage budgets. Show the vertical slice and verification approach before broadening scope. Do not introduce live credentials, fund transfers or autonomous execution.

## 13. Open decisions

1. Final brand, trademark/domain availability and mascot direction.
2. Broader customer segment beyond the founder/invited testers, and confirmation of operating/serving jurisdictions; Singapore remains provisional.
3. Initial wallet-read chains, native connection validation, package versions and hosting; MetaMask and iOS plus web are confirmed, with the recommended stack recorded above.
4. Account isolation and custody/control assessment, including agent-key scope.
5. Precise supported market types and eligibility rules; dynamic discovery with validated execution adapters.
6. Mandate defaults, exposure definitions, leverage permissions and treatment of existing positions.
7. Initial supported research capabilities/signals and data providers; strategies are profile-driven within validated coverage, and an execution platform alone does not establish an investment edge.
8. Model providers, selectable models and fallback policy.
9. Trial allowance, US$20 tier limits, top-up pricing and higher tiers; the initial pilot ceiling of S$200/month is confirmed separately from future customer pricing.
10. Authorisation renewal, incident response, audit scope and paid-launch gates.
11. First monitoring conditions, materiality/severity rules, notification channel, deduplication/cooldowns, monitoring coverage and delivery targets.

## 14. Primary references

These references were consulted during the discussion. Recheck current versions before implementation; integration details and eligibility can change.

- [Hyperliquid — Nonces and API wallets](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets)
- [Hyperliquid — Exchange endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)
- [Hyperliquid — HIP-3 builder-deployed perpetuals](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals)
- [Hyperliquid official Python SDK — Agent example](https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/examples/basic_agent.py)
- [tradeXYZ — Perpetuals and contract mechanics](https://docs.trade.xyz/perpetuals)
- [OpenRouter — Pricing](https://openrouter.ai/pricing)
- [OpenAI — API pricing](https://developers.openai.com/api/docs/pricing)
- [OpenAI — Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [OpenAI — Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [ChatGPT dots — Tasks and memory](https://learn.chatgpt.com/docs/dots/tasks-and-memory)
- [OpenAI — Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart)
- [MAS — Digital advisory services guidelines](https://www.mas.gov.sg/regulation/guidelines/guidelines-on-provision-of-digital-advisory-services)
- [MetaMask — Connect existing wallets](https://docs.metamask.io/metamask-connect/)
- [MetaMask — Supported platforms and native app connection routes](https://docs.metamask.io/metamask-connect/supported-platforms/)
- [Hyperliquid — SDKs and public API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Hyperliquid — Perpetual market discovery and account reads](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals)
- [AI SDK — Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [dYdX — Integration documentation](https://docs.dydx.xyz/)
- [Apple — SwiftUI](https://developer.apple.com/swiftui/)
- [Apple — Running an app on simulated or physical devices](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)

Security and regulatory positioning must follow actual behaviour. User approval, self-custody terminology or “connectivity only” labels do not by themselves establish an exemption from applicable obligations. This document is a product/engineering handoff, not a legal opinion.
