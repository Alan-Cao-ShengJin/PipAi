# Broker connection experience

Updated: **27 October 2026**. Goal: ordinary users connect a supported broker from Pip without terminal commands or copying API credentials.

## User flow

1. Type **connect broker** or **connect Tiger** in Pip’s conversation. The welcome suggestion and **Broker accounts** menu also bring setup into the same thread.
2. Sign in and approve the intended accounts/read permissions on Tiger’s site.
3. Return to the same conversation. Pip acknowledges approval and asks which account to use. Choose an inline button or type the account’s last four characters. One authorized account is selected automatically.
4. Pip saves the connection for that browser. Expired access offers **Reconnect Tiger**; the SDK first attempts to reuse/refresh the saved authorization before opening sign-in. Actual renewal remains live-unverified. **Disconnect** removes the preview’s local credentials; remote grant revocation remains available through Tiger.

Money stays with the broker. This first integration has read scopes only and exposes no order, cancellation, transfer or withdrawal operations. Connection success does not mean positions are synchronized or background monitoring is active; the UI says so.

## Implemented local preview

Open [the Pip conversation](http://127.0.0.1:3000/). There is no separate broker setup page; old `/brokers` links redirect into the conversation. The server must be running locally. `/api/v1/brokers/tiger` coordinates the pinned Python SDK’s browser authorization, PKCE/state validation, callback and account discovery. It polls local connection state, not the broker or an LLM. The connection starts only after an explicit Connect action or recognized typed request. The prototype uses narrow deterministic shortcuts, not a live language model. A manual sign-in link remains available when a popup is blocked. No model credits are required.

Setup prompts, account-selection acknowledgments and outcomes persist in a bounded per-session transcript and appear chronologically beside the paper conversation. Only server-authored broker text is journaled; credentials and OAuth URLs are excluded. Unrecognized text during sign-in/account selection is not submitted as a paper-profile answer. Connection history does not grant trading authority.

Each browser gets a separate random HttpOnly/SameSite cookie and private credential directory. Backend-generated session/attempt IDs determine storage paths; account selections must belong to that connection. The existing local CLI grant is never inherited by a browser or another session. Opaque account-choice IDs distinguish even accounts sharing the same last four characters.

Web state and credentials are outside the repo: `~/Library/Application Support/Pip/web-brokers/` on macOS. Directories are private and database/token files have owner-only permissions. Resetting the paper demo does not change broker authorization. Cancel/disconnect invalidates the attempt before stopping its worker so late callbacks cannot restore access. Workers have bounded lifetimes, and interrupted sessions offer retry rather than appearing connected.

This preview only accepts loopback hosts and same-origin mutations. The SDK callback runs on this computer; it is unsuitable for remote customer browsers or serverless deployment. Browser cookies are local preview identity, not production sign-in, and private files are not a substitute for production encrypted credential storage. Do not deploy this adapter as a hosted customer integration.

## What still requires broker work

Tiger’s personal OAuth flow does not replace OpenAPI or market-data activation. Tiger currently documents authorization validity of up to 15 days and reauthorization after expiry/revocation. Do not promise permanent background access or silently broaden permissions. [Tiger authentication](https://docs-en.itigerup.com/docs/authentication).

Tiger also documents a commercial app-registration route with platform credentials, registered redirects and customer authorization/binding. This is the route to assess for a hosted **Connect Tiger** experience; its availability for Pip, Singapore accounts, the required products/data rights and commercial terms is unverified. We have not submitted an application or contacted Tiger. Do not assume the personal SDK grant is approval to serve customers. [Tiger app registration](https://enterprise-docs.itigerup.com/reference/oauth-2).

For the hosted product, preserve the user flow while replacing local browser identity with authenticated user/account ownership, the loopback callback with an approved hosted callback, and filesystem credentials with encrypted per-user storage. Add connection renewal/revocation checks, durable callbacks/jobs, account reconciliation and explicit sync/monitor health. Assess aggregator alternatives against actual broker/jurisdiction/instrument coverage rather than assuming a Robinhood integration supports Tiger futures.

## Verification

- 128 application tests, TypeScript checks and the production build passed after the conversation integration. The unchanged Python integration previously passed 33 tests.
- Mocked tests cover user/credential isolation, account ownership, read-only authorization URLs, expired access, interruption, cancellation races, private storage and bounded concurrent attempts.
- Chrome checks cover inline setup, typed intents and account endings, persisted/reloaded history, return to the interrupted paper question, cancellation/disconnect, popup fallback, old-link redirects and mobile layout. Consent completion in these tests uses mocks; no model calls.
- The real SDK returned a Tiger sign-in link through the web API; that test was then cancelled without consent, account reads or model calls. The complete new browser-consent round trip remains to be verified by the account holder. The earlier CLI authorization and live-account probe remain separate verified evidence in [TIGER_ACCESS.md](TIGER_ACCESS.md).
