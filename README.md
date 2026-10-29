# Pip

Start with the [current product and delivery plan](docs/PRODUCT_PLAN.md) and [ordered build backlog](docs/BUILD_BACKLOG.md). Pip is a Singapore-first personal investing product for users with different goals, portfolios and horizons. Alan's Tiger US/futures workflow is the first validation case. The initial foundation includes shared identity, isolated user data, adaptive onboarding and saved research; native iOS and execution follow later milestones. The bootstrap operating ceiling is S$500/month.

Local prototype with a conversational broker connection and a scripted paper guide. Paper mandates, portfolios and decisions stay synthetic; they do not use the connected broker portfolio. The prototype does not call an LLM or send real orders.

Funds and trading will remain with the user's broker. The earlier crypto-wallet and Hyperliquid connection stack has been removed, including its UI, API, execution tooling and venue-specific research CLI. A [local Tiger read-only access probe](docs/TIGER_ACCESS.md) is now implemented and fixture-tested. Read-only OAuth and bounded live account reads succeeded on 27 October 2026. Futures transaction history and quote-permission reads remain unresolved; live quotes and background monitoring are unverified. The web connection flow is implemented; its full consent round trip remains unverified.

Tiger is the first broker because the founder uses it; full account/API/futures/data eligibility remains to be verified. A [local browser connection flow](docs/BROKER_ONBOARDING.md) now replaces terminal commands for the preview: type **connect broker** or **connect Tiger** in the conversation, authorize on Tiger’s site, and choose an account in the same thread by button or last four characters. Setup acknowledgments persist alongside the conversation; there is no separate broker setup page. Browser connections are separate from the existing CLI grant. Hosted customer authorization and portfolio synchronization remain future work. Moomoo and other brokers are later candidates.

## Run on Windows

Use Node.js 24.13 or later. From this directory:

```powershell
npm install
npm run dev
```

Open <http://127.0.0.1:3000>. The local development server binds to loopback. Demo records are stored under `apps/web/.data/`; browser cookies identify separate demo sessions. This is local prototype identity; production identity and multi-device sign-in remain planned.

## Checks and harness example

```powershell
npm run typecheck
npm test
npm run build
npm run harness:demo
npm run agent:demo
```

The harness example is offline and separate from the web app. Its fabricated portfolio read demonstrates scope checks, durable usage reservations and replay after reopening SQLite. No provider credentials or funded account are needed.

The agent demo is also offline. It demonstrates proactive multi-step research, saved follow-up work and a simulated daily wake-up after reopening the databases. See [PROACTIVE_AGENT.md](docs/PROACTIVE_AGENT.md) for the reusable runtime and remaining broker/research integration work. The provider adapter remains available, but no live research CLI or market-data adapter is currently exposed.

## Model connection checks and spending

Runtime model use is **connection-only** until a new spending instruction. Generation is blocked by default in the OpenRouter adapter. Offline demos and mocked tests need no provider credits. No automatic research or model benchmarks should run.

Keep credentials in ignored `.env` or `.env.local`, never `.env.example`. `npm run model:check` authenticates the local OpenAI key using a single model-list request, with no prompt, token generation, retries or fallback. This verifies authentication, not inference access or remaining balance. An OpenAI key is separate from an OpenRouter key. `npm run model:check:test` uses mocks only.

## Project map

- [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md): Current product requirements, architecture/model/data choices, onboarding, economics and phased delivery.
- [docs/BUILD_BACKLOG.md](docs/BUILD_BACKLOG.md): Ordered implementation tasks, dependencies and acceptance evidence.
- [docs/TIGER_ACCESS.md](docs/TIGER_ACCESS.md): Local read-only OAuth setup, account/contract access probe and its verification limits.
- [docs/BROKER_ONBOARDING.md](docs/BROKER_ONBOARDING.md): Browser connection flow, session isolation, verification and hosted broker requirements.
- `apps/web`: Next.js web app and local demo API.
- `packages/domain`: Mandates, paper accounting, proposals and deterministic checks.
- `packages/harness`: Initial research context, tool and usage boundaries.
- [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md): Agreed scope, build stages and open decisions.
- [docs/HARNESS_DESIGN.md](docs/HARNESS_DESIGN.md): Open-source study, harness design and next implementation gates.
- [docs/PROACTIVE_AGENT.md](docs/PROACTIVE_AGENT.md): Persistent research runtime, daily continuation, provider setup, checks and remaining gaps.
- [skills/README.md](skills/README.md): Cleaned research-analyst skill cycle, conditional company/cross-asset branches, handoff checks and evaluation cases. Authored bundle; not automatically loaded into the worker.

Native SwiftUI development and iOS Simulator verification will happen on the founder's Mac. No native app or production integration has been implemented yet.
