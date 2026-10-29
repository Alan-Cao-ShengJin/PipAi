> Historical imported discussion. Current requirements are in [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) and [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md). The founder retired crypto-wallet and Hyperliquid connectivity on 27 October 2026; any older connection instructions below are superseded.

# Handoff: autonomous personal investment manager

Updated: 27 October 2026, Asia/Singapore.

## Purpose of this handoff

Continue building the product described below. This file captures the user's direction, relevant research, unresolved decisions and implementation recommendations. Distinguish confirmed requirements from suggestions. No application was built, broker selected, partnership agreed or regulatory clearance obtained during this conversation.

## Confirmed product direction

Build a personal AI investment manager for people who want to delegate investment work and ongoing attention.

The user describes their worldview, objectives and constraints in a short conversation. The agent then researches investments, constructs a portfolio, sizes positions, executes trades, monitors developments and manages the portfolio within delegated authority. The intended mature experience is that the user can sit back and watch, with visibility and override controls.

The latest execution direction is **retail-broker access targeting Tiger, Moomoo and Robinhood**, through approved APIs or MCP tools where supported. Customers keep assets in their brokerage accounts. The first broker adapter, API/MCP implementation and account structure have not been selected or verified; these names are integration targets, not claims of available access.

The research agent is the first building block, but the end goal includes autonomous execution and management. Do not narrow the product back into a research terminal or a tool that requires customers to supervise every research task.

## Customer feedback that shaped this direction

The user's consultant friend, Teck Yuke Chia, explained:

> The entire point of having a system, is so I don't have to do anything.

> Ask me some questions, and recommend me products based on my worldview.

He also said that having to read research or run the research process would itself be too much work.

The user explicitly extended this idea to automated trading, execution and portfolio management.

In a further message at 15:13–15:15 on 27 October, the consultant emphasised starting with the **initial user journey and customer promise**, then deriving product requirements from it to avoid unnecessary features. He specifically called out the ad tagline, onboarding, what users can and cannot tweak, presets, funding and reporting.

The user subsequently clarified that defining the full customer journey is not a prerequisite for further backend work. Onboarding, the starting plan, managed allocation, activation, reporting and controls can be refined alongside useful research, harness and broker-integration work. Use the journey to inform implementation without making it a mandatory first phase.

Implications:

- Onboarding should elicit the customer's beliefs and constraints; it should not require a written investment thesis.
- Research happens in the background. Reports and citations remain available for inspection, while the default experience is brief and decision-oriented.
- Ongoing value comes from doing the work and managing attention, not just answering prompts.
- The mature experience should not depend on per-trade customer approval. Any approval-based prototype is a development stage, not the final product promise.
- Treat worldview as a hypothesis to investigate. The agent must challenge beliefs, evaluate contrary evidence and consider whether expectations are already reflected in prices.
- Worldview alone is insufficient: objectives, horizon, existing exposure, liquidity needs, financial circumstances and loss tolerance also constrain investments.
- A valid outcome can be no trade or holding cash. Do not equate activity with value.

## Working product principles

These principles were developed in discussion and should guide the prototype:

1. Beliefs guide research; evidence informs positions; explicit limits constrain execution.
2. Personalisation should reflect the customer's actual circumstances and portfolio.
3. Memory should preserve the reasons for decisions and track how evidence changes.
4. The user should be able to understand holdings, reasoning, risks, changes and performance without managing the workflow.
5. Autonomous customer experience still requires defined authority, supervision and operational controls.

Do not claim proven investment performance, product-market fit or a defensible moat. These remain unvalidated.

## User preferences and working instructions

- The user said: "its ok, we build the product first, then we go talk to people."
- Continue useful implementation instead of repeatedly returning to licensing discussions or asking for permission on routine reversible work.
- Building a prototype is authorised in direction; live trading of customer assets has not been authorised or arranged.
- Explain concrete behaviour in plain English. The user prefers concise answers and dislikes vague strategy language.
- Do not base product positioning on Alan's professional background. In prior discussion, the user explicitly rejected that approach.
- Reuse the existing repository and agreed platform direction recorded in `PROJECT_HANDOFF.md`; this imported discussion does not reset implemented work. Tiger, Moomoo and Robinhood are target brokers, but the first integration, supported markets, subscription price and production model provider remain open.
- This handoff originated in another AI conversation and was imported into the project. Statements about what was built "during this conversation" refer to that source discussion, not the existing repository.

## Proposed customer journey

This is a proposed answer to the consultant's questions, not a final specification approved screen by screen. Refine the customer experience and backend requirements together; neither requires completing the other first.

### Customer promise and acquisition

Working tagline to test:

> Your investment beliefs. An AI that does the work.

Supporting product promise:

> Tell us your goals and how you see the world. Your AI researches, invests and manages your portfolio within the limits you set.

This describes the intended mature product. Any prototype or public-facing copy must accurately describe what is actually available. The promise is less investment work and attention; do not promise guaranteed profit or outperformance.

### First-session journey

| Step | What the user experiences | Requirement implied |
| --- | --- | --- |
| 1. Understand the offer | A short explanation of what the agent does, the authority it needs, costs and who provides the investment service | Clear landing-page promise and service identity |
| 2. Answer a few questions | A guided conversation about goals, horizon, financial needs, tolerance for loss and worldview; allow "I'm not sure" | Persist a usable profile, distinguish assumptions from answers and retrieve observable account facts once connected |
| 3. Preview a starting plan | An explicitly provisional research direction or illustrative portfolio, related to the user's beliefs, with assumptions, risks, estimated costs and proposed permissions | Do not present a pre-connection preview as an account-aware allocation or approved mandate |
| 4. Connect and define the managed amount | Authorise a supported broker account, verify holdings and available funds, and choose the amount or portion the agent may manage | Reconcile account data and freshness; distinguish total holdings from the user's intended managed amount |
| 5. Confirm the account-aware plan and activate | Review the allocation based on verified holdings and the intended managed amount, confirm the mandate and enable the supported management mode | Revalidate exposures, funding and limits before activation; record authority and clearly label paper versus live status |
| 6. Leave it running | See a short account of results and meaningful changes; inspect details or pause when desired | Reconciled portfolio, concise reporting, notifications and control over the mandate |

Research, portfolio construction and order handling happen behind this journey. Avoid presenting them as tasks the user must run.

### What the user can tweak

Proposed initial controls:

- Goals, investment horizon and worldview, including editing or withdrawing a belief.
- Amount allocated to the agent, within supported account arrangements.
- Risk preference and supported investment exclusions, subject to the manager's suitability assessment and permitted mandate.
- Notification preferences and report frequency.
- Pause new trading, resume management where permitted or terminate the mandate.

Material changes to risk, allocation or beliefs should show their implications before changing the mandate. Pausing new trades, selling holdings and terminating management are different actions; make their consequences explicit.

Keep research prompts, model configuration, tool routing and strategy parameters out of the default onboarding. The customer should not need to choose an LLM or operate an agent console to obtain the core service.

### Presets

The number and contents of presets are unconfirmed. Start by testing one recommended configuration after onboarding rather than building a large selection gallery. If users need a simpler choice, evaluate a small set of clearly defined risk profiles with plain descriptions of potential losses and investment restrictions.

Risk profiles should define constraints, not replace individual suitability assessment. Separate a user's investment beliefs from their capacity to take risk. Do not hard-code example portfolio weights or imply a low-risk profile cannot lose money.

### How money gets in and out

- Funding occurs through the selected broker's supported process. Explain this in the journey; do not introduce a startup deposit account by default.
- For an existing supported account, show usable cash, existing positions and which assets are included in or excluded from the mandate, where the account model supports that distinction.
- If additional funding is required, guide the user to the broker's deposit process and show pending versus available funds.
- For a new user, account opening, identity checks and funding depend on the selected broker and management partner. These steps are not yet implemented or selected.
- Explain how to reduce the managed amount, terminate management, sell investments if requested and withdraw through the broker. Avoid promising instant availability of sale proceeds.
- Do not assume existing accounts can be linked to a manager, assets ring-fenced or permissions limited in every broker; validate the chosen account model.

### Reporting and notifications

Proposed default home view:

- Amount under management and performance, with deposits/withdrawals distinguished from investment gains/losses.
- Current holdings, cash, broad exposures and status of the agent.
- A short explanation of recent material changes and their reasons.
- Costs and a clear link to the full activity history.

Proposed periodic update: what changed, what the agent did and why, performance/risk context, and whether anything needs the user's attention. Keep detailed research, sources, assumptions, orders and fills accessible as a drill-down.

Test a periodic digest plus material exceptions. Do not make reading a daily report or approving routine actions necessary to maintain the mature service. Reporting frequency and notification triggers remain open decisions.

### Deriving the MVP requirements

Refine a small first-session flow with sample inputs, outputs, defaults and exception states alongside implementation. For each proposed feature, identify the customer need or necessary operating requirement it serves. Completing onboarding, allocation, activation, reporting and control screens is not a gate on useful backend components.

For the first vertical slice, test one supported paper-trading broker integration, a defined investment universe, one recommended starting configuration, the core mandate controls and concise reporting. This is a suggested development scope, not a confirmed launch configuration.

Defer additional brokers, extensive preset libraries, customer-facing model selection, advanced research dashboards and other optional controls until a demonstrated journey need justifies them. The architectural components below can initially be modules within one application; they do not imply separate services.

## Architecture direction

### Responsibilities to keep separate

| Component | Intended responsibility |
| --- | --- |
| User profile and mandate | Record beliefs, objectives, limits, permissions and changes |
| Research agent | Gather evidence, evaluate hypotheses and maintain source-linked conclusions |
| Portfolio decision layer | Propose allocations and actions within the mandate |
| Independent execution controls | Enforce permissions and deterministic limits before an order can reach a broker |
| MCP integration layer | Expose approved broker and data tools to the agent |
| Broker adapter | Implement broker-specific authentication, account access, orders, cancellations, positions and fills |
| Portfolio state and event processing | Reconcile broker records and trigger relevant work |
| Audit and explanation layer | Preserve sources, reasoning summaries, policy versions, actions and outcomes |

MCP is the connection/interface mechanism. It does not itself establish investment authority, broker approval or regulatory permission. Do not assume every retail broker has an official MCP server or permits third-party discretionary trading through its ordinary retail API.

### Recommended engineering constraints

These are proposed requirements for review during implementation:

- Use broker-supported authorisation and access arrangements for the intended commercial service.
- Keep credentials outside model context and logs; use least-privilege access.
- Where the broker supports it, separate trading authority from withdrawal authority.
- Place order permissions and risk checks outside the LLM's ability to override.
- Enforce permitted assets, position/exposure limits, order limits and available buying power.
- Handle retries and duplicate requests without duplicate orders.
- Model order acknowledgement, partial fills, cancellation, rejection and reconciliation explicitly.
- Reconcile portfolio state against the broker before acting on stale local state.
- Preserve a trace from mandate and evidence to proposed action, checks, order and fill.
- Provide pause/override controls and a defined response to stale data, connectivity loss and conflicting broker state.
- Keep paper/simulated trading visibly separate from live trading.

Do not assume technical safeguards alone satisfy legal or broker requirements.

## Singapore legal findings

These are research findings and candidate structures, **not a legal opinion or clearance to launch**. Check the exact operating model with Singapore financial-regulatory counsel and the chosen partner/broker before a live client-money launch. This should not prevent prototype development.

### Full autonomy changes the licensing analysis

The desired service goes beyond factual research or recommendations. It chooses and manages investments without separate customer approval for each trade.

MAS's Guidelines on Provision of Digital Advisory Services state that digital advisers exercising discretion over client portfolios beyond limited portfolio rebalancing require a CMS licence for fund management (paragraph 14).

Keeping assets in the customer's broker account, avoiding pooled funds, preventing withdrawals or using MCP does not by itself resolve that fund-management analysis.

The earlier discussion of a Financial Adviser licence was relevant to advice-only functionality. For the current full-autonomy goal, focus on the fund-management structure and any other activities actually conducted.

The exemption for advising no more than 30 accredited investors is an advisory exemption. Do not present it as permission to manage their portfolios on a discretionary basis.

### Candidate partnership structure

The user says their ex-boss is a fund manager and knows the CEO of iFAST. No firm name, exact licence scope, willingness to participate or partnership terms were established.

A possible structure to assess:

- The startup supplies the product and technology.
- An appropriately licensed investment-management firm contracts with customers, accepts discretionary mandates and genuinely operates/supervises the investment-management service.
- Customers' assets remain with an agreed broker/custodian, accessed through approved account and authorisation arrangements.
- The licensed manager approves the investment methodology, controls and change process and retains substantive management responsibility.

MAS's digital-advisory guidelines, paragraph 15, say an outsourced technology provider need not be licensed if it does not directly conduct financial advice, fund management or dealing for clients. This is conditional on what the provider actually does.

Do not assume that labelling the startup a software vendor, obtaining a nominal sponsor or having the manager rubber-stamp decisions settles licensing. A company exercising portfolio influence or control may itself be conducting regulated activity. Investment personnel may need appointments within the licensed manager; the correct arrangement needs review.

The user can have a hands-off experience while the licensed manager supervises the system. The partner's actual governance and risk appetite will determine the acceptable degree of automation.

### Retail versus accredited/institutional clients

- Confirm whether the prospective manager is authorised to serve retail investors or is restricted to accredited/institutional clients.
- A manager limited to accredited/institutional investors cannot gain retail access merely by routing trades through a retail broker.
- If the initial partner is A/I-only, an eligible-client pilot may be possible within its permissions; a mass-market launch needs the appropriate retail-capable structure.
- Broker availability, investment universe, licence conditions and onboarding requirements must all match the service.

### iFAST's possible role

Official iFAST materials advertise APIs, customised B2B2C services, white-label robo-advisory solutions and discretionary portfolio-management services.

An iFAST release dated 15 January 2026 announced discretionary portfolios advised by BlackRock and J.P. Morgan Asset Management.

This establishes relevant infrastructure and partnership experience. It does not establish that iFAST accepts open-ended LLM portfolio management, individualised worldview portfolios, our proposed MCP integration or any particular allocation of legal responsibilities.

For the latest direct-to-retail-broker architecture, **iFAST is optional**. It could be a broker/infrastructure partner or potentially a management partner if agreed and appropriately authorised. It is not a mandatory pooled-fund wrapper.

### Broker approval is a separate workstream

Interactive Brokers is an example researched, not a selected launch broker.

IBKR advertises advisor account structures and API trading. Its Web API documentation distinguishes individual access, advisors and third-party vendors. It states that third-party offerings require compliance approval and that automated-trading vendors are expected to hold applicable regulatory registration in the regions served, or provide support such as a legal opinion explaining why registration is unnecessary.

Do not assume a customer's API consent alone satisfies either the broker's commercial integration requirements or Singapore licensing requirements.

## Competition researched

Published vendor features were reviewed; no hands-on quality comparison was performed.

| Product | Relevance |
| --- | --- |
| Astor | Portfolio-aware personal investing agent, proactive monitoring, sourced research and user-approved trading; close consumer competitor |
| Finn | Advertises long-term thesis memory, evidence monitoring, KPI tracking and model updates; close research/monitoring competitor |
| Marvin Labs | Research agents for filings, earnings and management guidance, including scheduled/event-driven runs |
| Fiscal.ai, formerly FinChat | Financial data and conversational investment research terminal/copilot |

Do not claim research + memory + monitoring is an uncontested market or sufficient moat.

The user reports Astor appears unavailable in Singapore. Astor's terms refer to US residents or others legally eligible to receive services. Its exact reason for geographic restrictions was not confirmed. Do not claim SEC registration inherently prohibits overseas clients.

## Recommended implementation sequence

This is a suggested sequence, not a reason to reopen broad product strategy.

1. Inspect the actual application repository and existing instructions; reuse the current prototype, harness and analyst skills. Refine the customer promise and first-session experience alongside backend work rather than requiring screen design first.
2. Build a private end-to-end prototype: persistent profile -> sourced research -> provisional preview -> verified account context and intended managed amount -> account-aware proposal/mandate -> controlled paper order -> portfolio state -> meaningful update. The user interface can evolve while these contracts are implemented.
3. Select one initial broker adapter from the Tiger, Moomoo and Robinhood targets after checking supported access, account arrangements and test environments. Start with a narrow explicitly configured investment universe and keep tools extensible.
4. Include contrary evidence, no-trade decisions and understandable action history from the first version.
5. Demonstrate actual workflows and failure handling using paper trading. Mark simulated holdings, fills and performance clearly.
6. Use the working prototype and a concrete responsibility map to scope a licensed-manager partnership and broker integration. No outreach has been requested or undertaken.
7. Resolve licensing, broker approval, contracts, mandate design and production controls before live client trading.

## Open decisions

- Production deployment environment and detailed user experience; use the existing repository and platform direction as the implementation baseline.
- First broker among Tiger, Moomoo and Robinhood, API/MCP implementation and supported account authorisation model.
- Initial asset universe, markets, portfolio scope and permitted strategies.
- Agent hosting, model provider, data providers, source entitlements and operating costs.
- Detailed mandate, risk limits and escalation rules.
- Prototype/pilot success criteria and investment-quality evaluation.
- Legal manager, eligible customer segment, distribution arrangement and responsibilities.
- Pricing and economics, including brokerage, data, inference and management/compliance costs.

Do not imply any of these have been agreed merely because a concrete example appears in this file.

## Sources

Sources were reviewed during this conversation on 27 October 2026. Recheck material requirements when making live-launch decisions.

- MAS — Fund Management Licensing: https://www.mas.gov.sg/regulation/capital-markets/apply-for-licensing-or-registration-of-capital-market-entities/fund-management-licensing
- MAS — Digital Advisory Services guidelines, including paragraphs 14–15 on discretion and technology providers: https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulations-guidance-and-licensing/securities-futures-and-fund-management/guidelines-on-provision-of-digital-advisory-services--cmgg02.pdf
- MAS — Fund Management Companies licensing/conduct guidelines: https://www.mas.gov.sg/regulation/guidelines/guideline-sfa-04-g05-on-licensing-registration-and-conduct-of-business-for-fund-managers
- MAS — Financial Advisory Service guidelines, including factual information, opinions, software examples and disclaimers: https://www.mas.gov.sg/-/media/MAS/Regulations-and-Financial-Stability/Regulations-Guidance-and-Licensing/Financial-Advisers/Guidelines/Guidelines-on-Provision-of-Financial-Advisory-Service-10-July-2019.pdf
- MAS — Financial Advisers FAQs, including the 30-accredited-investor advisory exemption: https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulations-guidance-and-licensing/financial-advisers/faq/faqs-on-financial-advisers-act-financial-advisers-regulations-notices-and-guidelines.pdf
- MAS — Outsourcing guidelines for financial institutions other than banks: https://www.mas.gov.sg/regulation/guidelines/guidelines-on-outsourcing-financial-institutions-other-than-banks
- IBKR — Trading Web API; see "Web API Access for Third Parties": https://www.interactivebrokers.com/campus/ibkr-api-page/web-api-trading/
- IBKR Singapore — Advisor accounts: https://www.interactivebrokers.com.sg/en/accounts/advisor.php
- IBKR Singapore — Advisor trading technology: https://www.interactivebrokers.com.sg/en/accounts/advisor/solutions/trading-technology.php
- iFAST — Business divisions, including Fintech Solutions: https://www.ifastcorp.com/ifastcorp/business/business-divisions.tpl?locale=en
- iFAST announcement, 15 January 2026: https://en.prnasia.com/releases/apac/ifast-partners-blackrock-and-jpmorgan-to-drive-discretionary-portfolio-adoption-among-wealth-advisers-519101.shtml
- Astor: https://www.astor.app/
- Astor terms: https://www.astor.app/legal/terms
- Finn: https://heyfinn.co/product
- Marvin Labs research agents: https://app.marvin-labs.com/docs/deep-research-agents/
- Fiscal.ai: https://fiscal.ai/
