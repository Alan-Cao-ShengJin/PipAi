# Tiger read-only access spike

Updated: **27 October 2026**. This is a local founder diagnostic, not a customer-ready broker connection, production monitor or order service. Read-only OAuth and bounded live account reads succeeded on 27 October 2026. Production monitoring, live quote entitlement and complete reconciliation remain unverified.

## Live verification — 27 October 2026

Tiger authorized the local application with read-only scopes. Account discovery returned two live accounts; Alan selected one for the probe. Assets, stock/futures position and open-order reads, recent stock transactions, futures exchanges and `BZmain` reference metadata succeeded. Position and open-order lists were empty; the results still need comparison against the broker interface before claiming reconciliation.

Futures transaction history returned `READ_FAILED`; quote-permission metadata returned `MISSING_RESPONSE`. Quotes were not requested. No trading, model inference or background monitoring ran. The detailed report stays in ignored `.data/tiger/latest-probe.json`; authorization tokens remain outside the repository. No executable delivery contract or real-time quote entitlement was established.

## Ready locally

The isolated Python integration in `integrations/tiger/` can authorize read-only access, check local authorization metadata and produce a bounded account/data capability report. It uses the official `tigeropen==3.8.0` SDK; dependencies are pinned in [requirements.txt](../integrations/tiger/requirements.txt). Tested environment: Python 3.14.7 / macOS arm64; the pinned dependency set requires Python 3.12 or later.

The stock SDK derives requested scopes from all advertised permissions. Pip narrows those to `api.basic:read`, `api.quote:read`, `api.account:read` and `api.trade:read`. Write/unknown grants are rejected before token persistence. A second allowlist at the SDK authentication boundary rejects non-read business methods before dispatch. No order, cancellation or transfer command is exposed.

Two SDK extension points are version-sensitive: scope selection and new-token validation. Upgrade the SDK only with these tests passing. This is a local application boundary, not a sandbox for arbitrary Python code or a claim about a stolen token.

## One-time founder setup

For the simpler browser preview, use **Broker accounts → Connect Tiger** in Pip; see [broker onboarding](BROKER_ONBOARDING.md). The commands below remain engineering diagnostics. Browser sessions use isolated credentials and do not reuse this CLI grant.

1. Enable OpenAPI for the existing eligible trading account in [Tiger Developer Center](https://developer.itigerup.com). Account activation and applicable agreements are actions for the account holder. [Official prerequisites](https://docs-en.itigerup.com/docs/prepare).
2. The local SDK environment is already installed on this Mac. To recreate it:

   ```sh
   npm run tiger:setup
   ```

3. Once activation is complete, authorize the local Pip application:

   ```sh
   npm run tiger:login
   ```

   The command opens Tiger's browser authorization flow. Choose the intended accounts and read/query permissions. Pip has its own OAuth registration/name; it does not borrow another CLI's authorization. No private key is requested. To open the printed URL manually, use `npm run tiger:login -- --no-browser`.

4. Inspect local authorization status, without a broker read or token refresh:

   ```sh
   npm run tiger:status
   ```

OAuth does not replace account/API activation or market-data entitlements. Its expiry and revocation require handling separately; actual renewal behavior remains unverified. [Tiger authentication](https://docs-en.itigerup.com/docs/authentication).

Authorization data is stored outside the repository under `~/Library/Application Support/Pip/tiger/` on macOS, with a private directory and SDK-managed token files. Status output never prints access/refresh tokens. Do not paste tokens or credentials into chat. Revocation is available through Tiger's authorized-application controls.

## Run the bounded read probe

```sh
npm run tiger:probe
```

The probe selects a single authorized live account, excluding paper accounts. If several accounts are present, it returns masked aliases and stops before holdings reads. Select one with `--account-suffix` followed by its last four characters; an ambiguous suffix does not select an account.

The current reads cover:

- Prime account assets with `consolidated=False`, retaining securities (`S`) and futures (`C`) separately. The legacy Global account asset shape is explicitly not implemented yet.
- Futures and stock positions and working orders, including unresolved quantity/unit information rather than inventing it.
- Up to 100 transaction records per security type over the prior seven days, with an explicit indication of more pages. This is not a complete fill-history reconciliation.
- Quote entitlement metadata and the available futures exchanges.
- Exact contract queries from [the founder watchlist](../config/tiger-watchlist.json), initially `BZmain` only.

Prime account fields and futures-specific reads follow the [account API](https://docs-en.itigerup.com/docs/accounts) and [order/transaction API](https://docs-en.itigerup.com/docs/orderinfo). Empty, missing, partial and failed responses stay distinct; a successful request does not establish complete account coverage.

Output is a redacted capability summary; the detailed report is written atomically with mode `0600` to ignored `.data/tiger/latest-probe.json`. Monetary/quantity values are decimal strings with source fields. Unknown/infinite SDK values become missing, not zero. Broker observation timestamps are separate from local receipt times. Reports are local and are not supplied to any LLM.

## Resolve contracts and check quotes

The gold description **“E-micro gold mini main”** remains unresolved. `BZmain` is a user-supplied research reference; it is not permission to choose a delivery month. Inspect broker-provided contracts before selecting any dated instrument.

The basic report lists exchange codes. To inspect contracts from a code actually returned by Tiger:

```sh
npm run tiger:probe -- --exchange EXCHANGE_CODE
```

`EXCHANGE_CODE` is a placeholder: use a real code from the returned exchange list. The probe refuses an unverified exchange. To query a known identifier, pass `--contract` with that exact identifier. At most two exchanges and ten identifiers are allowed per probe.

Continuous/main references are always marked reference-only, even when a provider flag is false. A missing contract month also prevents treating a reference as a dated contract. No result enables execution. [Tiger futures metadata](https://docs-en.itigerup.com/docs/quote-future).

Quotes are opt-in:

```sh
npm run tiger:probe -- --quotes
```

Quote client initialization explicitly disables automatic device-permission claiming. If Tiger requires device authorization, the quote read may fail even when a subscription exists; review that condition with Tiger rather than silently claiming it. API data access is separate from Tiger app data. Timestamps are labeled missing/future/stale/recent for diagnosis, but a recent timestamp alone does not establish real-time entitlement or an exchange-session freshness policy. [Market-data permissions](https://docs-en.itigerup.com/docs/permission).

## Offline demonstration and tests

```sh
npm run tiger:demo -- --quotes --exchange SIM_EXCHANGE
npm run tiger:test
```

The demo uses fabricated accounts, contracts, margin and quotes; `.data/tiger/demo-report.json` is explicitly `synthetic`. It does not make broker or model requests. Its gold contract and exchange names are deliberately fictional.

The tests use actual SDK model/request classes with network calls blocked. They cover narrowed scopes, rejection of wider grants, method denial, no automatic quote-permission claim, account separation, finite decimal fields, futures-segment gaps, actual versus legacy scaled quantities, continuous references, timestamp gaps, partial reads, pagination and private report writes. They do not establish live Tiger compatibility.

Verification on 27 October: **30 Tiger tests passed**, the offline probe passed, local status reported unauthorized, and an unauthenticated live-probe attempt stopped with `AUTH_REQUIRED` before broker reads. The existing 93 application tests and TypeScript checks also passed; installed Python dependencies passed `pip check`.

## Before PIP-003 can close

Authorization and initial reads succeeded. Next compare account/position/margin observations against Tiger, resolve futures history and quote-permission gaps, and verify actual data entitlements. Still open: exact gold/BZ instruments, account quote entitlements and prices, permitted automated/AI use, broker paper support, real streaming/reconnect behavior, renewal/revocation and measured latency. This local probe supplies a starting point; none of those open items is marked verified by fixtures.

The eventual customer experience should be a simple broker authorization flow. This local setup is the founder access spike, not the final onboarding interface or proof of commercial multi-user permission.
