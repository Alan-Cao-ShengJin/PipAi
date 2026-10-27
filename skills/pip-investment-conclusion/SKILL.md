---
name: pip-investment-conclusion
description: Synthesize an audited company model, valuation expectations and thesis validation into a researched investment view, return scenarios and action conditions. Use after those inputs exist; portfolio sizing remains a downstream task.
metadata:
  version: 1.0.0
---

# Investment conclusion

Reach the view after the model, valuation and evidence checks. This supplies the missing conclusion stage referenced by the original collection's absent conclude-valuation-action skill. Follow the [company sequence](../pip-research-cycle/references/company-sequence.md) and [handoff contract](../pip-research-cycle/references/handoffs.md).

## Required inputs

Load the current model/forecast and assumption versions, model audit, conditional valuation/market-expectations analysis, targeted financial/thesis validation and counter-case. Confirm that material model revisions propagated through valuation and all quoted numbers. If a critical input is missing, return a qualified or partial conclusion and a concrete next investigation.

## Synthesis

Explain the business/economic thesis, where the model differs from priced expectations and why that difference could resolve over the relevant horizon. Separate supported observations, analyst assumptions and remaining uncertainty. Do not claim a market belief was uniquely observed from a reverse valuation.

Show conditional adverse/base/favourable value and return scenarios using a consistent share/currency basis. Separate price change, distributions, FX and costs. State catalysts or evidence milestones, downside mechanisms and observable thesis breakers. If discussing entry/exit levels, tie them to a dated scenario and invalidate/recheck them when evidence changes; they are not guaranteed fills or loss limits.

State a supported view: favourable, neutral, unfavourable or insufficient evidence, with its scope and confidence basis. Avoid a precise probability without a defensible basis. The desired return does not determine the conclusion, valuation input or permissible risk.

Provide the few management/research questions that could still change the view, ranked by sensitivity. Use [management questions](../pip-management-questions/SKILL.md) to draft them when useful, and [research brief](../pip-research-brief/SKILL.md) to communicate the result.

## Boundary and continuation

This is an investment-research conclusion, not an approved position, portfolio weight or order. If implementation is requested, send it to [strategy research](../pip-cross-asset-strategy/SKILL.md) and [portfolio review](../pip-portfolio-decision/SKILL.md) with the exact instrument and mandate constraints. An underlying share valuation does not transfer unchanged to a perpetual contract.

Return an investment-conclusion handoff with the view, supporting/counterevidence, scenario assumptions, catalyst/invalidation conditions, material gaps and next task/review date. Keep prior versions for later learning and attribution. A no-action view still has a useful follow-up; it does not require manufacturing a trade.
