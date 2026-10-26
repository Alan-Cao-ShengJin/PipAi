# Engineering decisions

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

Once MetaMask and Hyperliquid are authorised and connected, the agent should obtain balances, token identities, positions and other available account facts through tools. Check connection state first and request the missing connection when necessary. Ask follow-up questions about user intent or genuinely missing/conflicting information, rather than asking the user to manually supply facts available from connected sources.

Read access does not confer trading authority, and observed holdings do not define the user's allocated capital. Source timestamps and unsupported chains/accounts must be explicit. Never present simulated or missing connection data as an observed balance.

## 0004 — Research across supported asset classes before allocating

Date: 26 October 2026. Status: founder-directed scope; standalone public-data screen completed, production strategy validation open.

Do not equate Hyperliquid with crypto-only coverage. Discover and validate core and builder-deployed markets, including applicable equities, indices, commodities and currencies. Distinguish diversification, directional theses, factor hedges, relative value and spot/perpetual carry. Each strategy needs an economic rationale, evidence, contract/cost analysis and explicit failure conditions before it can support an allocation. Correlation, listing availability, a loss budget or an LLM narrative alone cannot establish an investment case or portfolio weights.

Use deterministic calculations and explicit, evaluated sizing policies. Hedge ratios, gross exposure, collateral pools and portfolio-wide factor risks must be considered; equal-dollar long/short positions are not automatically neutral. Different tickers or asset-class labels do not establish diversification. Keep unsupported products and insufficient evidence explicit, and accept no action as a result.

The [initial pair screen](research/HYPERLIQUID_PAIR_SCREEN_2026-10-26.md) compares six public markets across three hypotheses. It establishes diagnostics and source capture only, with no trading edge, chosen entry direction, portfolio approval or live app integration.

## 0005 — Own the next task and continue research within the mandate

Date: 26 October 2026. Status: local runtime and opt-in provider transport implemented; production integration and real model verification open.

The founder requires a proactive agent that keeps advancing the user's mandate, rather than stopping at a shortlist or an unsupported “no trade yet.” Continue useful investigations within each bounded cycle. Every review must retain a concrete next task, an essential user question, a candidate for independent validation or an actionable explanation of an infeasible target. A no-trade outcome preserves research progress and a daily follow-up; it does not end the mandate.

Use explicit durable workflow state, independently enforced authority, shared usage budgets and capped model/tool steps. Preserve the agreed one-daily-review-plus-on-request cadence; idle observations must not become unbounded paid reasoning. Persist before dispatch, replay settled results, fence concurrent workers and hold uncertain outcomes for reconciliation. Ambitious return goals do not expand permissions or justify arbitrary risk.

The [local proactive runtime](PROACTIVE_AGENT.md) implements that lifecycle with a deterministic offline demonstration, an opt-in OpenRouter SDK adapter and public-market research tools. It has no production identity, live account context, validated trading strategy, real-time watch service, remote notifications or execution integration. A configured provider key/model and real-provider verification are required before claiming an LLM is running in the worker.
