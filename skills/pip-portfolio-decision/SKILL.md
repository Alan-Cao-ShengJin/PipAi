---
name: pip-portfolio-decision
description: Translate challenged research into a portfolio-level candidate or no-action decision using an explicit sizing policy, aggregate exposures, collateral and implementation checks. Use before proposing allocations or position changes.
metadata:
  version: 1.0.0
---

# Portfolio construction and decision

Load the current approved mandate/version, fresh reconciled holdings, pending orders and reservations, allocation intent and available evidence. Retrieve observable account facts where connected. A broker balance is not permission to deploy all funds. An unconnected or synthetic allocation cannot be described as a real account.

## Qualify the evidence

Require a defined return source, tested rules when the strategy depends on a historical signal, economic/cost analysis and a completed [challenge](../pip-research-challenge/SKILL.md). Account for material unknowns and stale upstream versions. Company value, a correlation ranking, a stop price or a personal loss budget alone does not determine an allocation.

Compare with an appropriate simple baseline and taking no new risk. Venue coverage constrains implementation but does not establish suitability. A capital-preservation need may have no appropriate implementation within a derivatives venue; explain that mismatch without inventing an external account integration.

## Size from a stated policy

State the objective, risk measure/scenarios, inputs, constraints and why the sizing method is appropriate. Use a reviewed deterministic calculation for candidate weights. Keep return estimates uncertain, limit concentration and avoid precision driven by fragile forecasts. Do not invent an optimiser output or a fixed 15-percent allocation.

Assess the portfolio as a whole:

- cash/withdrawal availability, commitments and funds outside this mandate;
- signed direction and gross notional per leg; distinguish margin posted from economic exposure;
- common equity, sector, macro, FX, crypto and nonlinear factor risks;
- correlated losses under adverse regimes and changing hedge ratios;
- concentration by underlying, issuer, venue/deployer, collateral, oracle and custody/bridge;
- per-pool initial/maintenance margin and stress liquidity, including isolated legs;
- pending orders, partial fills, execution/legging risks, costs, lot sizes and minimums;
- funding shocks, gaps, liquidation/ADL and failures of supposed hedges.

An economical offset is not automatically a collateral offset. Equal-dollar legs are not necessarily factor neutral. A larger number of tickers does not guarantee diversification. A stop or a 20-percent planning threshold cannot guarantee a maximum loss.

## Decision artifact

Produce reject, continue research, watch, or candidate. A candidate includes exact proposed instruments/direction, sizing calculation and assumptions, portfolio before/after exposure, adverse scenarios, costs, validity/expiry conditions, thesis invalidation and outstanding independent checks. If sizing tools or necessary data are absent, return an unsized research candidate and name the blocker.

Keep actual positions, approved paper positions and proposed changes distinct. Research output is not approval. The host's independent risk service must revalidate the exact payload against fresh account state and the approved mandate; the relevant authenticated approval and execution service handles any later action. This skill cannot grant leverage, change a mandate, sign or submit orders.

## Continue the mandate

A no-action result states why the opportunity failed, what would change the decision, the next investigation or observation and its deadline. Do not leave an all-cash or unallocated placeholder unexamined: its actual instrument/currency, access and risks still matter. Pass the decision and proposed watches to [briefing](../pip-research-brief/SKILL.md) and [monitoring review](../pip-monitor-review/SKILL.md).
