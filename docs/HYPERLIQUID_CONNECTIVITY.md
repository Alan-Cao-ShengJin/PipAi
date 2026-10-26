# Wallet and Hyperliquid connectivity

Updated on 26 October 2026: the web connection now uses **Hyperliquid mainnet, read only**, as requested. Connect the existing MetaMask wallet once using a browser-bound ownership proof. Pip automatically checks the authenticated owner's mainnet account using public information requests. No second account, trading-account link, API wallet approval, chain switch, deposit or funded order is required. Empty accounts can connect successfully. This grants no mainnet execution or withdrawal authority.

The chat header and setup screen say **Mainnet ? Read only**. Their neon green light requires a fresh account-specific response for the verified session owner. It rechecks periodically, drops stale verification after at most 30 seconds, rechecks the session after each read, and clears green when the tab is hidden. A connected indicator confirms data access only. Clicking it opens the minimal setup screen; account details are optional and collapsed.

The authenticated gateway action `mainnet.account.read` accepts no address, URL or exchange action. Trusted code supplies the session owner's address and the fixed `https://api.hyperliquid.xyz/info` endpoint. Only `clearinghouseState`, `spotClearinghouseState` and `openOrders` requests are supported, with bounded responses, timeouts, no redirects and strict response validation. The adapter has no exchange client or private key. The account summary explicitly covers core perpetuals and spot, not builder-deployed markets; it does not claim a combined portfolio balance. Mainnet reads do not reuse or change testnet approvals, mandates, proposals, signing keys or execution state.

The separate local execution package below remains **testnet-only**, disarmed by default. Its operator tools are separate from mainnet web onboarding; the web setup no longer exposes testnet trading approval or mandate controls. Mainnet submission is absent. The scripted paper workspace and research worker do not acquire execution authority automatically.

## Run locally

Node 24.13 or later is required. On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`.

```powershell
npm.cmd install
# Run once; refuses to overwrite credentials.
npm.cmd run connectivity:setup
npm.cmd run signer:start
```

In a second terminal run `npm.cmd run dev`, then visit <http://127.0.0.1:3000>. Click **Connect wallet** in the workspace header or <http://127.0.0.1:3000/connect>. Confirm the connection and sign-in in the extension; mainnet account checks follow automatically. There are no keys, addresses or tokens to paste. EIP-6963 discovery supports browser wallets alongside the legacy `window.ethereum` provider. Returning authenticated users do not need to repeat the ownership proof. Connecting grants no trading authority.

Developer setup automatically configures `apps/web/.env.local` with a server-only credential for the narrow wallet gateway. It contains no wallet private key or signer encryption key. The browser never receives backend credentials. An installation created before this automatic configuration can be updated by running `node --env-file=.env.signer scripts/configure-wallet-web.mjs` once, then restarting the web server. Existing environment files and unrelated variables are preserved. These are operator steps, not end-user onboarding. `.env.execution-worker` contains only the worker credential and loopback URL. All environment files are ignored by Git. Signer databases and encrypted API keys default to `D:/CodexData/Pip/signer`; the environment files are in the project on D:.

Wallet sign-in uses a single-use, browser-bound signature challenge and a 12-hour HttpOnly, SameSite=Strict session cookie. Only a wallet already linked to this local workspace can reconnect once its owner is established.

For separate operator-driven testnet development, the signer control protocol retains trading-account linking, wallet-signed mandates and exact proposal approvals. A user-owned account may equal the sign-in address; the API wallet must be distinct. Testnet execution additionally requires `PIP_TESTNET_EXECUTION=enabled` and a signer restart. Leave it disabled for the current mainnet read-only test. No mainnet execution toggle exists. Give only `.env.execution-worker` to a trusted execution worker; no secrets belong in model arguments or context.

The signer requires a single local process, enforced by `signer.lock`. After an unclean shutdown, verify that the previous signer is stopped before removing its stale lock. Never remove a live process's lock.

## Tools and agent integration

`@pip/connectivity` exports `ExecutionToolClient`. Its model-visible `tools` property contains JSON schemas and descriptions. The trusted worker retains the client instance and invokes `client.invoke(name, input)` after validating the model's complete output. The account, endpoint, credentials, authority and private key are never model arguments.

| Tool | Inputs | Behavior |
| --- | --- | --- |
| `account.read` | `{}` | Real testnet account state, venue/source timestamps, orders, positions, agent expiry and unsupported-exposure flag |
| `markets.read` | `{}` | Active core perpetual metadata; asset IDs resolved by trusted code |
| `trade.propose` | `symbol`, `side`, decimal-string `size` and `limitPrice`, `reduceOnly` | Fresh preflight and durable two-minute proposal, bound to the exact account, API wallet, mandate ID/version, network and order |
| `trade.execute` | `proposalId` | Rechecks authority and fresh risk, reserves durably, sends at most once, then holds the account for reconciliation |
| `orders.cancel` | `proposalId` | Cancels only this signer's recorded client order ID; can run during a local pause |
| `execution.reconcile` | `proposalId` | Exact client-order status plus a fresh account snapshot; unresolved outcomes remain blocked |
| `execution.status` | `{}` | Pause/expiry/retirement status, mandate and durable execution records |

For example, from a trusted worker:

```ts
import { ExecutionToolClient } from "@pip/connectivity";
const client = new ExecutionToolClient({ token: process.env.PIP_WORKER_TOKEN! });
const toolsForModel = client.tools;
const account = await client.invoke("account.read", {});
// Dispatch the model's validated tool name/arguments through this same client.
// Do not serialize the client or environment into a prompt.
```

For manual tool inspection and read-only calls:

```powershell
npm.cmd run connectivity:read
node --env-file=.env.execution-worker scripts/execution-tool.mjs tools
node --env-file=.env.execution-worker scripts/execution-tool.mjs execution.status
```

`scripts/execution-tool.mjs` also accepts a tool name and JSON argument as its next argument. Pending proposals appear as readable trade cards in the authenticated browser's optional trading section, with a review button; users do not paste proposal IDs. These tools are ready for an execution-capable agent adapter; `scripts/run-agent.mjs` and `ProactiveAgent` deliberately remain research-only. No model/provider is selected, charged or enabled by setup. The offline demo exercises the complete client → HTTP signer → independent checks → mock venue flow with disposable wallet signatures; it is not a model-performance or live-execution demonstration.

## Authority and risk boundary

```text
User's primary wallet --ownership proof--> Pip identity
Selected owner wallet (same or separate) --ownership proof + signed mandate--> signer authority
Selected owner wallet --approveAgent--> Hyperliquid delegated authority
AI instructions --> worker tool client --> restricted signer --> Hyperliquid testnet
Account/market reads --> independent pretrade checks and reconciliation
Funding/withdrawal/revocation --> user's wallet
```

The signer holds only the API wallet key, encrypted with AES-256-GCM at rest. It exposes no raw signing endpoint. The SDK object and key remain in private fields in the signer process. The browser uses the connected wallet to approve/revoke agents and sign Pip authorizations; Pip never asks for seed phrases or wallet private keys. Plain-message authorizations apply to Pip's policy, while `approveAgent` is a distinct Hyperliquid EIP-712 authorization. Only externally owned wallet signatures are currently supported.

Worker and control credentials are distinct and mutually rejected on the other endpoint. Workers cannot link accounts, grant mandates, approve proposals, resume execution or rotate keys. The browser uses `/api/v1/wallet`, a same-origin gateway; backend credentials are attached only by the web server. Anonymous requests can only obtain and complete a wallet sign-in challenge. A proof must match its initiating browser nonce cookie; management proofs must match their authenticated wallet session. The gateway permits only specific wallet operations and is not an arbitrary signer proxy. It checks host/origin, request shape and size, session expiry, ownership and replay. Disconnect invalidates the session even if the signer is unavailable. Trading changes still require independent wallet signatures. Direct signer browser calls require the exact local origin; worker calls are server-only. Unknown fields and actions, builder-fee injection, vault/subaccount routing, transfer requests, account-mode changes and arbitrary HTTP destinations are rejected. The only agent-signed exchange actions implemented are core-perpetual IOC orders and cancellation by a recorded client order ID.

Risk validation uses decimal arithmetic and fresh state. It checks account/key/mandate binding and expiry, venue approval, registry coverage, account mode, supported positions, configured leverage, market and size/price increments, bid/ask/mark deviation, per-order and per-position limits, gross exposure, equity threshold, uncommitted collateral, and daily requested turnover. Existing open orders or core TWAPs block new orders rather than estimating their remaining exposure. Unsupported spot balances, subaccounts, automatic DEX abstraction and funded/positioned HIP-3 pools block execution. Core order reads include spot open orders. The all-DEX WebSocket snapshot must cover every name returned by the DEX registry; no fixed shortlist is used. Other DEXs with zero collateral and no positions cannot use the default pool while DEX abstraction is disabled. All exposure in the selected Hyperliquid account is included; a shared owner account does not isolate capital from trading losses. The signed `dedicatedAccount` flag records whether primary and trading owner addresses differ and is checked against the stored identities; it does not guarantee an exclusive capital balance.

Equity pause is a trigger, not a loss guarantee. A genuine reduce-only order may reduce risk below the equity threshold; it cannot reverse or enlarge the position. Leverage changes require the user to act in Hyperliquid. There is no automatic stop-loss strategy or permanent market monitor in this package.

Each order is recorded before submission, has a deterministic client order ID, a durable signer nonce and a short signed expiry. A repeat of the same proposal returns its existing record without resubmission. An unknown response or process crash retains the pending record and blocks subsequent orders. An acknowledgement requires reconciliation. An exact terminal order whose status is reflected in the venue account snapshot releases that hold. A separately validated single-order error response can settle as a definitive rejection without a fill; mixed or ambiguous responses cannot. `unknownOid` never means permission to resend. Failed requests with no definitive rejection or queryable terminal order remain held for operator investigation; there is no model-accessible manual override. Turnover accounting conservatively charges requested notional, including failed attempts, within each UTC day.

## Pause, revocation and fresh keys

Pause immediately blocks new submissions after the signing-boundary recheck. A request already signed/in flight can still reach the venue until its signed expiry. Pause does not close positions or revoke the venue agent. Cancellation of recorded orders remains available while paused. The user can manage orders and positions in Hyperliquid independently of Pip.

Use the connection screen or Hyperliquid's own API controls to revoke the named Pip agent. Refresh the account so the signer observes retirement. Once it has observed an approved key disappear, expire or change registration expiry, the instance refuses to reuse that key. Never renew the same expired/deregistered API address; nonce pruning can make older signatures replayable. A renewal uses a new API key.

Stop the signer and run:

```powershell
npm.cmd run connectivity:rotate
```

Rotation is offline and requires observed retirement. It archives the previous encrypted key under the existing data directory, preserves identities, mandates, proposals, execution history and audit records, provisions a fresh key and pauses execution. Restart, approve the new API wallet, and sign a new mandate with a higher version. Outstanding old orders still require reconciliation. Do not copy an older database over the current one or delete history to bypass a hold.

## Verification and remaining launch gates

Automated tests exercise valid and invalid wallet proofs, exact mandate/proposal approval, replay/expiry, model argument injection, denied withdrawals/transfers, stale and incomplete state, hundreds of DEXs, unknown account modes, unsupported balances, slippage/exposure/collateral/leverage limits, racing requests, pause during preflight, process credential isolation, durable restart behavior, reconciliation and SDK-generated order/cancellation payloads against mock HTTP. The offline demo also drives the authenticated HTTP worker client end to end. Read-only HTTP/WebSocket discovery was checked against public Hyperliquid testnet, including an empty randomly generated address. No real wallet authorization, funded testnet order, withdrawal attempt or mainnet action was performed during implementation.

This is a local implementation, not a production security certification. Process/API separation does not protect against a compromised host or another unrestricted process running as the same OS user. Before customer funds: deploy signer and worker under separate service identities/network rules, use reviewed managed signing/key storage with policy enforcement, add production user authentication/tenant routing and operations, run funded testnet tests proving venue-level withdrawal/transfer rejection against the owner account even when Pip's gateway is bypassed, and commission security review. A stolen broadly authorized API key can bypass application limits and damage capital through trades or permitted internal movements. No claim is made that Hyperliquid enforces Pip's size, leverage or loss limits cryptographically.

Primary references checked during implementation:

- [Hyperliquid API wallets and nonces](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets)
- [Exchange actions, including agent approval and internal asset movement](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)
- [Account reads](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint)
- [Account WebSocket snapshots](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions)
- [Official Python SDK agent example](https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/examples/basic_agent.py)
- [Community TypeScript SDK used here, pinned to 0.33.3](https://github.com/nktkas/hyperliquid)
