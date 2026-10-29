---
name: pip-cross-asset-strategy
description: Research and test tradable strategies across equities, indices, commodities, FX and crypto, including factor hedges, relative-value pairs and carry. Use to turn a thesis into testable rules and assess actual contract economics.
metadata:
  version: 1.0.0
---

# Cross-asset hypotheses and strategy tests

Use the [research brief and evidence pack](../pip-research-cycle/references/handoffs.md). Produce a hypothesis first and a separately labelled strategy-test artifact later. Listing availability, correlation and a loss budget do not establish an edge.

## Map the opportunity set

Discover currently supported markets dynamically through approved sources. Identify exact venue/deployer namespace, contract id, underlying reference and units, collateral, oracle, margin pool/mode, funding, fees, precision/minimums, session/holiday/roll rules and settlement/ADL risks. Record source/time; do not identify a contract solely by its display ticker.

Use underlying-appropriate economics:

- Company shares: company-model/quality/valuation branch, followed by the actual product mechanics.
- Indices: construction, concentration, constituent/factor exposure and macro/earnings expectations.
- Commodities: physical demand/supply, inventories, supply response and reference/roll structure; separate monetary-metal drivers from industrial demand.
- FX/rates: quote convention, policy/rate differentials, flows and how the quoted reference maps to P&L.
- Crypto: protocol/token economics, supply/unlocks, usage/value capture, concentration/liquidity and custody/bridge risks. A token is not automatically equity.

Use the supported broker's actual instrument and exchange specifications. Distinguish shares, ETFs and dated futures from their underlying references; a continuous futures chart is not an executable contract. Verify multiplier, tick value, margin, session, settlement, expiry and first-notice terms where applicable. Missing instrument coverage remains explicit.

## Specify the return source

Distinguish diversification, directional exposure, a factor hedge, relative performance, spread convergence and carry. For each candidate state the economic mechanism, who/what supplies the return, why the opportunity may persist, what is offset, remaining exposures, evidence, strongest alternative explanation and falsification condition.

A long-equity-index/gold combination is a diversification hypothesis, not an automatic hedge. Same-sector securities may have very different risks. Equal dollars long/short need not be neutral; a hedge ratio depends on the chosen exposure, estimation window and objective. High return correlation does not prove a stationary or mean-reverting price spread.

For carry, distinguish quoted funding from net expected carry. Funding can change sign; the spot/short legs may differ in custody, collateral and liquidation behaviour. For relative value, explain why a relationship should converge rather than assume an unusual ratio must revert.

## Predeclare and test

Before evaluating a signal, record the hypothesis, eligible universe and selection rule; data/vintage window; decision frequency and holding horizon; estimation/lookback; entry/exit/expiry; hedge-ratio update; sizing rule; benchmark; and acceptance/rejection criteria. Freeze those choices before inspecting the evaluation window.

Use only information available at each historical decision time. Align sessions/calendars, corporate actions, quote conventions, reference contracts and economic release vintages. Include delistings/unavailable intervals and account for the number of hypotheses/parameter choices tried. Separate formation, validation and genuinely held-out evaluation; changing a rule consumes the holdout and requires new validation.

Calculate net results after both legs' funding/fees, bid/ask, slippage, rounding/minimums, rebalancing, borrow/roll/custody costs where relevant. Model partial fills, legging, gap moves, market closure, oracle dislocation, collateral segmentation, liquidation and ADL. Daily closes do not establish intraday survivability.

Report sample size, exposure/turnover, drawdown and tail scenarios, net returns versus the baseline, parameter/regime sensitivity, limits of coverage and implementation failures. A numerical backtest is not a guarantee or proof of causality. Correlation and pair-screen diagnostics are not completed strategy backtests.

## Handoff

Classify the outcome as rejected, needs evidence, eligible for paper evaluation or candidate for independent review. Preserve failed tests and a ranked next investigation. Send retained candidates to [challenge](../pip-research-challenge/SKILL.md) and [portfolio review](../pip-portfolio-decision/SKILL.md); do not assign arbitrary portfolio percentages from a pair ranking.
