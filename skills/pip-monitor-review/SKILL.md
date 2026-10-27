---
name: pip-monitor-review
description: Convert research decisions into explicit watch specifications and scheduled reviews, distinguish active monitoring from plans, and update theses and portfolio decisions from new evidence and outcome attribution.
metadata:
  version: 1.0.0
---

# Monitor, review and learn

Load the current mandate, decision version, positions, hypothesis backlog, prior review and monitoring acknowledgements. Keep actual, simulated and proposed positions separate. Follow the [shared handoff contract](../pip-research-cycle/references/handoffs.md).

## Specify meaningful watches

For each proposed watch, define the underlying decision/thesis, source and exact metric/contract, baseline, threshold/operator/unit, observation cadence, data-freshness limit, expiry/review date, materiality, deduplication/cooldown and the action a change would trigger. Include data/feed/worker health and missing updates, not just market direction.

Examples to adapt: a forecast driver breaches the thesis range; net carry changes enough to invalidate a trade; a hedge ratio/regime changes materially; liquidity deteriorates; a margin/oracle/contract setting changes; a withdrawal deadline approaches; required data becomes stale. A price change need not be a thesis change.

Distinguish **planned**, **active**, **triggered**, **expired**, **disabled** and **health-unknown**. Only a real reviewed monitoring service can return the acknowledgement that makes a watch active. A skill-generated condition, a CLI printout or a saved schedule is not evidence of real-time observation or notification delivery.

## Separate observation from reasoning

Use deterministic data refresh and alert rules for frequent checks. Invoke paid model research at the configured daily/on-request cadence; event-driven model work requires an explicitly supported and budgeted policy. Do not turn every tick into a model call. Preserve essential visibility, pause/revoke controls and health alerts when discretionary research reaches its limit.

At a review, check freshness and health first. Refresh affected evidence; classify what changed; update dependencies and recompute the relevant model, strategy costs or portfolio risk. Ask for approval only when the actual mandate/action requires it, not for each ordinary research step.

If a dependency fails, record its scope, last successful observation and the next recovery task. Do not conclude a portfolio is safe from silence. Time-sensitive pending approvals/candidates expire or require rechecking when their evidence or mandate changes.

## Learn without hindsight

Record the original prediction/assumption, its information cutoff, metric/horizon and what would count as success or failure. At the relevant date compare actual evidence with the original version, not a rewritten thesis. Label unobservable or unresolved outcomes rather than manufacture a score.

Attribute paper/actual outcomes separately. Distinguish cash flows, realised/unrealised P&L, market/factor exposure, selection, sizing, timing, fees/funding, FX and data/execution problems where the evidence permits. Use a consistent benchmark and capital basis; paper fills do not establish live fill quality.

Update confidence and research priorities in proportion to evidence and sample size. Do not optimise rules on the same evaluation window and call the result independent validation. Retire repeatedly failed hypotheses, record why, and preserve their history.

## Handoff

Return monitoring status and health, material changes, affected artifact versions, current candidate/position implications, outcome attribution and the next concrete task/review. A no-trade finding remains an active research backlog with a deadline; it does not justify constant notifications or an endless unproductive loop.
