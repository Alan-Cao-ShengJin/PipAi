# Pip

Local prototype for a personal investing workspace. The paper workspace uses a scripted guide, explicit paper mandate approval, a simulated portfolio, independent checks and local demo-session storage. That paper flow does not connect to a wallet, call an LLM or send orders.

A [wallet and Hyperliquid mainnet connection flow](docs/HYPERLIQUID_CONNECTIVITY.md) is available at `/connect`. Connect MetaMask once; Pip automatically reads that owner's mainnet account. The green indicator means fresh **read-only** account access, with no trading key approval, chain switch, trades or transfers. The separate execution tooling remains testnet-only and disarmed by default; the paper demo and research worker remain separate. Follow the connection guide for local backend setup.

Current product direction targets retail-broker access through Tiger, Moomoo and Robinhood; the first integration is unselected and unverified. Customer experience and backend development can progress together. Portfolio previews before connection are provisional; account-aware allocations require verified holdings and the user's intended managed amount. See [the confirmed refinements](PROJECT_HANDOFF.md#confirmed-refinements--27-october-2026).

## Run on Windows

Use Node.js 24.13 or later. From this directory:

```powershell
npm install
npm run dev
```

Open <http://127.0.0.1:3000>. The local development server binds to loopback. Demo records are stored under `apps/web/.data/`; browser cookies identify separate demo sessions. This is local prototype identity, not production wallet authentication or multi-device sign-in.

## Checks and harness example

```powershell
npm run typecheck
npm test
npm run build
npm run harness:demo
npm run agent:demo
```

The harness example is offline and separate from the web app. Its fabricated portfolio read demonstrates scope checks, durable usage reservations and replay after reopening SQLite. No provider credentials or funded account are needed.

The agent demo is also offline. It demonstrates proactive multi-step research, saved follow-up work and a simulated daily wake-up after reopening the databases. For the opt-in real-model/public-market CLI and its limits, see [PROACTIVE_AGENT.md](docs/PROACTIVE_AGENT.md). No model key is configured automatically.

## Project map

- `apps/web`: Next.js web app and local demo API.
- `packages/domain`: Mandates, paper accounting, proposals and deterministic checks.
- `packages/harness`: Initial research context, tool and usage boundaries.
- `packages/connectivity`: Dedicated wallet linking, testnet reads, restricted execution signer and model-facing tool client.
- [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md): Agreed scope, build stages and open decisions.
- [docs/HARNESS_DESIGN.md](docs/HARNESS_DESIGN.md): Open-source study, harness design and next implementation gates.
- [docs/PROACTIVE_AGENT.md](docs/PROACTIVE_AGENT.md): Persistent research runtime, daily continuation, provider setup, checks and remaining gaps.
- [skills/README.md](skills/README.md): Cleaned research-analyst skill cycle, conditional company/cross-asset branches, handoff checks and evaluation cases. Authored bundle; not automatically loaded into the worker.
- [docs/research/HYPERLIQUID_PAIR_SCREEN_2026-10-26.md](docs/research/HYPERLIQUID_PAIR_SCREEN_2026-10-26.md): Public-data cross-asset pair diagnostics, reproducible read-only script and evidence gaps. Separate from the app; no validated trading strategy or positions.

Native SwiftUI development and iOS Simulator verification will happen on the founder's Mac. No native app or production integration has been implemented yet.
