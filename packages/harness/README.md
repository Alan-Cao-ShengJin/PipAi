# Pip harness foundation

This is the first implementation of Pip's application-owned agent boundaries, informed by the source study in [HARNESS_DESIGN.md](../../docs/HARNESS_DESIGN.md).

It currently supplies:

- Strict, immutable research context with an approved paper mandate and a fresh portfolio snapshot.
- A registered read-only tool gateway. Trusted account scope travels separately from model arguments.
- Atomic tenant and run cost reservations in a local SQLite ledger. Amounts are integer micro-US dollars: 1,000,000 units = US$1.
- Versioned call fingerprints, durable results and replay of completed calls without a second dispatch.
- Cancellation/timeout handling and retained reservations for unknown outcomes.
- A typed adapter contract for future model integration.
- A persistent proactive research loop and reusable OpenRouter SDK adapter, documented in [PROACTIVE_AGENT.md](../../docs/PROACTIVE_AGENT.md).

Run from the repository root with Node 24.13 or later:

```powershell
npm install
npm run harness:demo
npm run agent:demo
npm test
npm run typecheck
```

The offline example uses fabricated identities and balances, writes `packages/harness/.data/offline-demo.sqlite`, closes and reopens it, replays a completed read, and rejects an order tool. It does not call an LLM or any external service. SQLite data is ignored by Git.

The web app continues to use its existing scripted demo. This package is not connected to a web route. The proactive runtime persists model requests and goal checkpoints and schedules local daily continuations. A caller can supply the reusable model adapter and reviewed tools, but no live CLI or broker/data adapter is currently exposed. The offline agent demo verifies continuation and restart without network requests. No inference request was made during implementation; a separate project helper has checked OpenAI authentication metadata only. The OpenRouter adapter defaults to `connection-only` and rejects generation before network dispatch. Paid inference stays disabled until a new spending instruction; mock tests explicitly enable their fake transport. Production scheduling, conversation compaction, authenticated broker reads, validated portfolio proposals, approvals and broker order submission remain open.

`ToolGateway` and `UsageLedger` are trusted backend modules, not an authentication API or a sandbox. The caller must derive the scope from authenticated account ownership. Tool adapters are reviewed server code; a `readOnly` declaration cannot prevent malicious code or a compromised tool server from acting outside its description.

Unknown or interrupted calls are not retried or automatically refunded. Their reservations remain held. A dedicated reconciliation API and operator workflow are future work. Provider-enforced limits and complete billing metadata are required before treating any adapter's declared cost bound as a monetary guarantee.
