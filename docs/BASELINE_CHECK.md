# Pip local baseline verification

Verified **27 October 2026** on the founder's Mac, against repository commit `798867d` plus the uncommitted planning documents. Application source and dependency lockfile were unchanged during verification.

**Historical result before connection-stack retirement: local baseline passed.** No broker connection, real-model call, cloud deployment or live order was used. GitHub CI is not configured yet, so PIP-001's CI acceptance item remains open.

The checks below describe the earlier code, including a connection package and routes that have since been removed. Current verification is recorded at the end of this report.

## Environment

- macOS: `26.5.2` (`25F84`), Apple Silicon (`arm64`).
- Node.js: `v26.4.0` (repository requirement: `>=24.13.0`).
- npm: `11.17.0`.
- Next.js: `16.4.3`; React/React DOM: `19.3.1`.
- TypeScript: `5.9.3`; Vitest: `5.0.5`.
- Installed with `npm ci --no-audit --no-fund`, using the existing lockfile. Added 89 packages; lockfile unchanged.

## Commands and outcomes

| Check | Outcome |
| --- | --- |
| `npm run typecheck` | Passed across domain, harness, connectivity and web |
| `npm test` | **188 tests passed across 12 files** |
| `npm run build` | Passed; production pages and API routes generated |
| `npm run skills:check` | Passed: 12 skills, 5 flows, 46 Markdown links, consistent handoff schema and all 60 imported source files verified |
| `npm run harness:demo` | Passed: synthetic read replayed after SQLite reopen, tool body ran once, order tool denied |
| `npm run agent:demo` | Passed: persisted next task, idle behavior, simulated daily wake after reopen and unvalidated candidate retained for review |
| `npm run connectivity:demo` | Passed: disposable fixture signatures, exact approval, one simulated submission despite duplicate request, reconciliation and withdrawal-tool rejection |
| `git diff --check` | Passed |

The model executions and costs printed by the agent demo are fixtures. The connectivity demo uses a loopback HTTP server and an in-memory fake venue; it does not establish actual broker or exchange behavior.

## Production-server HTTP smoke check

Started with `npm run start --workspace @pip/web -- --port 3100` on `127.0.0.1`.

- `/` and `/connect` returned HTTP 200 HTML.
- `/api/health` reported `local-demo`, `liveExecution: false`, `modelCalls: false`.
- `/api/v1/schema` returned HTTP 200 JSON.
- Independent cookie sessions received different users.
- Six demo answers created a draft mandate; explicit approval produced a paper proposal; applying it created simulated paper fills.
- Review and pause changes persisted across HTTP reads; the second session remained unchanged.
- Stale revision returned 409; cross-origin mutation returned 403; unsupported live-trading command returned 400. Rejected requests left state unchanged.

This verifies the scripted demo and its HTTP API. It is not a browser visual/accessibility test, a production-security assessment, or evidence that the web app is connected to the research worker.

## Non-blocking observations and remaining work

- npm reported install scripts awaiting approval for `@openrouter/sdk` and optional `fsevents`. No scripts were additionally approved; all listed checks passed with the current installation policy.
- Vitest/Vite warned that the CommonJS-loaded `vitest.config.ts` uses ESM syntax that a future native configuration loader will not support. Current tests passed; adjust the config module format when maintaining the test setup.
- No existing GitHub Actions workflow was found. Add CI on the selected deployment runtime before closing PIP-001 in full; only Node 26.4.0 was exercised here, not a runtime matrix.
- The install omitted the npm vulnerability-audit step; this report does not assert that dependencies were security-audited.
- Real provider quality/billing, Tiger access/data rights, hosted monitoring and iOS remain subsequent work.

## Founder input for the next spike

The founder identified **“E-micro gold mini main”** and **`BZmain`** as the most-traded references. Preserve these as user-entered labels until the Tiger spike resolves exact product, exchange, continuous-series identifier and dated executable contracts. Do not guess contract multipliers or route a continuous reference to execution.

## Current verification after broker-only cleanup — 27 October 2026

The founder explicitly retired crypto-wallet and Hyperliquid connectivity. Removed the connection UI/page/API, account/session/signature code, venue execution package, setup/rotation tools, dependencies and venue-specific research CLI/configuration. The generic paper domain, research harness and provider adapter remain; actual broker access is still unimplemented.

| Check | Current outcome |
| --- | --- |
| Clean lockfile install | Passed: 66 packages, down from 89; retired workspace and crypto/venue libraries absent |
| `npm test` | **93 tests passed across 8 files**; four retired connection/venue suites removed, one saved-session migration regression added |
| `npm run typecheck` | Passed for domain, harness and web |
| `npm run build` | Passed from a clean generated build directory; retired routes absent |
| `npm run skills:check` | Passed; all 12 skills and 60 preserved imported files verified |
| Updated skill validation | Both edited skill entrypoints passed Skill Creator's validator; its YAML dependency was installed only in a disposable environment, then removed |
| Remaining offline demos | Harness replay/denial and agent continuation/reopen demos passed; retired connectivity demo no longer exists |
| Current documentation links | 50 local Markdown links across 10 maintained files resolved |

HTTP checks against the rebuilt loopback production server at `http://127.0.0.1:3100` passed:

- Homepage contains no wallet/venue controls, settings link or connection-page link.
- `GET` and `POST` to `/connect` and `/api/v1/wallet` return **404**.
- API schema exposes `brokerConnected: false`; the retired wallet capability is absent. Old saved demo state parses without losing its profile, mandate, portfolio or messages.
- Health remains local-demo with live execution and model calls disabled.
- Onboarding, paper approval/fills, review, pause, persistence, separate sessions and reset work.
- Stale writes, cross-origin mutations and unsupported live-order commands remain rejected.
- Built static assets contain no retired venue endpoint/client references checked by the cleanup scan.

The original 188-test result above describes the earlier code. The current lower count reflects intentional retirement of obsolete suites. No real account connection, paid model call or real trade was performed. Browser visual verification and GitHub CI remain separate work.

## Tiger access-spike verification — 27 October 2026

Added an isolated, pinned `tigeropen==3.8.0` Python integration and local commands described in [TIGER_ACCESS.md](TIGER_ACCESS.md). The founder has not enabled OpenAPI yet; this is implemented/tested preparation, not verified account access.

- **30 Python tests passed**, using actual SDK request/model classes and blocking network calls. Coverage includes scope/method restrictions, account isolation, missing/invalid data, futures segments/quantities, continuous references, quote identities/timestamps, pagination and private reports.
- Synthetic probe demo passed with fictional contract/account data; its report marks simulation, execution unavailable and monitoring inactive.
- `tiger:status` reported unauthorized without network authorization or account queries. A live probe without authorization returned `AUTH_REQUIRED` and stopped before broker reads.
- The existing **93 Node tests** and TypeScript checks passed. `pip check` reported no broken requirements.
- Fifty-five current documentation file links resolved. SDK environment, generated reports and credentials remain outside tracked source.

Actual OAuth consent/renewal, live Tiger account data, quotes, entitlement costs/rights and exact gold/BZ contracts remain pending. No order request or paid model call was made.

## Connection-only spending verification — 27 October 2026

The OpenAI model-list endpoint accepted the local key; zero generation requests were made by the connection helper. This confirms authentication only, not inference access or remaining balance. The key was moved out of `.env.example` into ignored `.env` with mode 0600. A scan of tracked/nonignored files found no copy of that credential.

Four mocked connection-helper tests, 94 application tests across eight files, and all TypeScript checks passed. The OpenRouter adapter blocks inference before dispatch in connection-only mode and defaults to that mode. Offline demos remain credential-free. No paid research or model benchmark was run.

## Tiger live read-only verification — 27 October 2026

Read-only OAuth authorization succeeded. Account discovery returned two live accounts; the user selected one for bounded reads. Assets, stock/futures positions and open orders, stock transactions, exchanges and BZmain reference metadata succeeded. Position/order responses were empty. Futures transactions returned READ_FAILED; quote permissions returned MISSING_RESPONSE. Quotes were not requested. This establishes local account connectivity, not complete reconciliation, real-time entitlements, active monitoring or execution. Reports remain ignored/private. No model inference or order request was made.

## Browser broker connection preview — 27 October 2026

Implemented `/brokers` and `/api/v1/brokers/tiger` with isolated local browser sessions, private per-connection SDK stores, Tiger authorization, opaque account selection, saved state, reconnect and disconnect. The callback is local to the same computer; hosted customer integration remains pending. Existing CLI authorization is unchanged.

- **108 application tests across 9 files**, **33 Python tests**, TypeScript checks and production build passed.
- Chrome desktop/mobile checks passed: HTTP session isolation, HttpOnly/SameSite cookie and no-store headers, CSRF/command rejection, navigation, popup authorization/polling, blocked-popup fallback, account selection and cancellation/disconnect. Broker completion in UI tests used mocks.
- The real Tiger SDK generated a validated read-only sign-in link through the new web endpoint. The test cancelled before browser consent or account reads; it did not create another authorized account grant. Full new-page consent and live refresh remain unverified.
- Existing CLI status still reports authorized with the four read scopes. No model calls, orders, live quotes or background monitoring ran during this increment.

Details and broker prerequisites: [BROKER_ONBOARDING.md](BROKER_ONBOARDING.md).

## Conversational broker setup — 27 October 2026

Moved broker setup into the existing chat. Supported typed requests, inline sign-in/account actions, canonical server-journaled acknowledgments and automatic continuation preserve the same conversation. The old `/brokers` URL redirects into chat. The existing scoped connection backend and CLI credentials remain separate; there is no new live model capability.

- **128 application tests across 10 files**, TypeScript checks and production build passed.
- Chrome checks passed for inline discovery, recognized typed requests, saved/reloaded setup messages, old-link redirect, mocked external consent/polling, typed authorized account endings, cancellation/disconnect, blocked-popup fallback and desktop/mobile layout. The paper-profile question resumes after connection; broker replies are not saved as financial goals/capital.
- Unknown text during authorization/account choice is kept out of paper-profile writes. Broker journal entries are authored by server code and omit credentials and authorization URLs. Existing account ownership, read-only scopes and cancellation-race checks still pass.
- No paid model call, new live broker consent, quote request or order was made. Full live consent through the conversational interface remains unverified. Shared research is recorded as planned architecture, not a running service.
