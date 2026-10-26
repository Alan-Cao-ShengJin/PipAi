# Hyperliquid cross-asset pair screen

Research snapshot: **26 October 2026, 17:35 Singapore time** (09:35 UTC).

## Finding

**Retain XYZ100/SP500 and GOLD/SILVER for further research. Do not treat NVDA/AMD as a default hedge. No candidate has established a profitable trading rule or an entry direction.**

This is a reproducible public-market diagnostic, separate from the scripted app and harness. It does not connect a user account, use a model, open a paper position, schedule monitoring or send orders. A market being listed or a pair being correlated does not establish an investment opportunity.

## Economic hypotheses

| Candidate | Relationship to investigate | What could invalidate it |
| --- | --- | --- |
| XYZ100 / SP500 | Large-cap growth/technology exposure relative to broad US equities. A short in SP500 may offset some common equity exposure. | Changing factor exposures, prolonged relative trends, different reference constructions, funding and oracle dislocations. These indices are not interchangeable assets. |
| GOLD / SILVER | Relative precious-metal exposure. Investigate macro, monetary and industrial-demand drivers before selecting a direction. | Different demand/supply regimes can drive a persistent ratio change. Correlation alone does not imply mean reversion. |
| NVDA / AMD | Relative company performance within semiconductors, requiring a specific fundamental thesis. | Company-specific growth, valuations and events can dominate the common sector exposure. Same industry does not imply a reliable hedge. |

The operator describes XYZ100 as an index of 100 large, actively traded non-financial US-listed companies, SP500 as referencing the S&P 500, GOLD as XAU/USD and SILVER as XAG/USD. NVDA and AMD reference their respective company shares. These are perpetual exposures rather than ownership of the referenced assets. See the [operator specification index](https://docs.trade.xyz/perpetuals/specifications-and-schedules/specification-index.md).

## Price relationship diagnostic

Requested 180 calendar days of daily trade candles from the [Hyperliquid public info API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#candle-snapshot). Each market returned 180 complete daily candles, 29 April through 25 October 2026. After aligning timestamps and retaining positive-volume UTC weekdays, each pair had 128 paired closes through 23 October, producing 127 simple returns.

Fit the first 84 returns (through 25 August) and inspect the remaining 43 returns separately. Regress A's returns on B's returns with an intercept. Freeze the earlier beta when calculating the later-period residual `rA - beta * rB`. Report the residual standard deviation, not a portfolio return or a trading profit.

| A / B | Earlier correlation | Later correlation | Earlier beta A/B | Later beta A/B | Later A daily volatility | Later frozen-beta residual volatility |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| NVDA / AMD | 0.417 | 0.538 | 0.196 | 0.301 | 1.932% | 1.668% |
| XYZ100 / SP500 | 0.902 | 0.902 | 1.668 | 1.627 | 1.074% | 0.465% |
| GOLD / SILVER | 0.879 | 0.873 | 0.444 | 0.470 | 1.249% | 0.613% |

Interpretation:

- The index and metals pairs had stronger common movement and less beta drift than NVDA/AMD in this sample. They are better candidates for investigating hedges, not demonstrated sources of profit.
- Earlier index beta implies an illustrative **US$100 long XYZ100 / US$166.81 short SP500** hedge, rather than equal dollars. This is a historical notional ratio, not an approved order or a guaranteed neutral position.
- A lower residual volatility does not establish a convergent spread, a useful signal, positive expected returns or an optimal allocation. Neither cointegration nor statistical significance was tested.
- The chronological split diagnoses stability only. The research design has not been independently validated, and no frozen trading strategy was tested out of sample.

## Funding and execution

Retrieved 720 matched hourly funding observations per pair over the preceding 30 days, from 26 September 10:00 UTC through 26 October 09:00 UTC, with no missing interior hours after normalising timestamps to the hour. Funding is distinct from trading fees. See [historical funding API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals#retrieve-historical-funding-rates).

For comparison only, assume a constant US$250 long A and a short B equal to US$250 times the earlier beta. Sum funding as `250 * (beta * sum(fundingB) - sum(fundingA))`. Positive is received; negative is paid. Maintaining constant dollar notionals would require rebalancing, whose execution costs are excluded here. These figures are not realised P&L or forecasts.

| Illustrative orientation | Short B notional | Matched 30-day funding illustration |
| --- | ---: | ---: |
| Long NVDA / short AMD | US$49.06 | -US$0.91 |
| Long XYZ100 / short SP500 | US$417.02 | -US$0.23 |
| Long GOLD / short SILVER | US$111.08 | -US$0.78 |

At the snapshot, XYZ100 funding was positive and SP500 funding negative: the illustrative long-XYZ100/short-SP500 direction would pay funding on both legs at those particular rates. Do not extrapolate a single hourly quote into a promised annual return.

The six order books were approximately 0.7–1.1 seconds old on receipt. Displayed spreads ranged from 0.13 to 0.47 basis points. The returned levels covered illustrative US$250 buys and sells without walking beyond the best price. This one small-size snapshot does not establish typical liquidity, executable fill quality, or weekend/stressed-market behaviour.

Exact user fees were not retrieved. As a fee sensitivity example, four US$250 fills (two entries and two exits) cost US$0.10, US$0.50 or US$1.00 at hypothetical per-fill rates of 1, 5 or 10 basis points. Actual rates depend on market settings and account tier/discounts. Metadata explicitly reported growth mode for five markets; GOLD omitted that field. Resolve the actual fee configuration rather than applying a universal rate. See [Hyperliquid fees](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees).

## Implementation and evidence gaps

1. **No entry thesis established.** Specify an economic driver and a falsifiable signal before choosing long/short direction. Do not invert a losing historical direction solely because it would have looked profitable.
2. **No trading backtest.** Need predeclared entry/exit rules, rolling estimation using only available information, historical funding, realistic fees, size rounding, minimums, execution timing and sensitivity to alternative windows. Account for selection bias.
3. **Insufficient stress coverage.** Six months does not establish behaviour across market regimes. Obtain longer, consistent reference-price histories and check contract listing/history and corporate actions. Perpetual candles are not total-return underlying series.
4. **Session effects.** UTC weekday closes are not synchronised official underlying closes; holidays remain. Friday-to-Monday returns span a longer interval. Repeat using aligned external-session data. The operator uses internal oracle pricing when external prices are unavailable; a closed underlying does not imply a frozen oracle. See [oracle mechanics](https://docs.trade.xyz/perpetuals/mechanics/oracle-price.md).
5. **Margin and leg risk.** AMD metadata restricts it to isolated margin while NVDA supports cross margin. A profitable hedge elsewhere does not fund an isolated leg automatically. Model collateral and liquidation per margin pool, together with partial fills, legging risk and liquidation/ADL. See [margin modes](https://docs.trade.xyz/perpetuals/risk-and-margining/margin-modes.md).
6. **Whole-portfolio risk.** Overlapping equity pairs can duplicate factor exposure. Allocate risk to independent strategies only after measuring aggregate gross exposure, common factors, scenario losses, collateral availability and stablecoin/platform risks. Affordability of losing a budget does not establish permission to use leverage.
7. **User/account suitability unresolved.** No connected holdings, account eligibility, experience or approved derivatives mandate was established. This screen supports research only.

For a hypothetical US$1,000 experimental account, the conclusion is **no new position from this evidence**. Keep capital uncommitted while testing the strongest hypotheses. Uncommitted capital is an accounting status, not a claim that a particular stablecoin or collateral holding is risk-free.

## Reproduce and verify

No additional dependencies or credentials are required. From the repository root:

```powershell
node scripts/research-hyperliquid-pairs.mjs
```

This makes bounded public read requests and saves input responses plus a summary under ignored `.data/research/`. Fresh runs use fresh data and will differ.

Captured inputs for this screen are local at:

```text
.data/research/hyperliquid-pairs-2026-10-26T09-35-12-172Z/inputs.json
```

Replay this capture without network requests:

```powershell
node scripts/research-hyperliquid-pairs.mjs --replay .data/research/hyperliquid-pairs-2026-10-26T09-35-12-172Z/inputs.json
```

Input SHA-256 over the JSON representation, excluding its trailing file newline:

```text
aca4d6edf528ba8893f92861d347e9f8690b0c6a8a3d87459ca104a7ff06f624
```

Verified syntax, identical capture replay, input hash, and earlier-period betas/correlations independently using raw-sum formulas. Source validation checks market identities, complete candles, OHLC bounds, duplicate timestamps, funding pagination and book structure. The input hash checks local integrity, not authenticity or independent accuracy of the exchange data. Raw inputs are ignored local evidence and are not included in a repository clone.
