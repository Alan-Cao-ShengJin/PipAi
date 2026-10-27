---
name: pip-research-challenge
description: Challenge a research thesis, valuation or strategy before it influences a portfolio decision. Use to identify unsupported claims, alternative explanations, leakage, fragile assumptions and implementation failure modes.
metadata:
  version: 1.0.0
---

# Research challenge

Use a separate evaluation pass with the thesis, raw evidence, calculations and mandate. Its purpose is to find what would change the decision, not produce a ceremonial list of generic risks. A separate agent is optional only when delegation is available and authorised; the workflow does not require one.

## Challenge in five dimensions

1. **Evidence:** trace the decision-driving claims to accessible source locations and publication/availability dates. Check whether multiple sources are independent, quotations retain their qualifications and contrary evidence was considered. Missing or synthetic evidence cannot silently support a real-account claim.
2. **Economics:** explain the strongest alternative causal account. Is the proposed return actually market beta, a liquidity/credit premium, short-volatility risk or leverage? Why is it not already priced? What specifically could falsify the thesis?
3. **Numbers:** reproduce key unit/period/currency conversions, statement bridges, scenario arithmetic and valuation basis. Check whether adjustments are motivated by evidence or by the desired conclusion. Do not treat a zero check or a numerical round trip as economic validation.
4. **Testing:** inspect point-in-time availability, selection/survivorship bias, alignment, cost assumptions, sample size, repeated parameter search and reuse of a holdout. A held-out correlation check is not proof of tradable spread convergence.
5. **Implementation and portfolio:** challenge exact contract mappings, fill/legging assumptions, margin pools, collateral, liquidity in stress, pending actions and overlap with existing risks. Ask how the strategy can fail even when the underlying thesis is right.

Use issue classifications: invalid fact/calculation, critical missing evidence, sensitive assumption, implementation blocker, or nonblocking uncertainty. Materiality depends on the mandate and decision, not an arbitrary count or severity score.

## Resolve and hand off

Return the strongest counter-case, reproduced checks, unresolved issues, evidence that would settle each issue, and which upstream/downstream artifacts must be revised. State which issues block a candidate and which permit further paper observation.

After a material change, rerun the affected calculation and downstream interpretation. Do not mark an issue resolved merely because wording was softened. Preserve rejected cases and failed tests so the next cycle does not rediscover them.

If the result is no action, propose the next useful investigation or an observable watch with a review date. Do not force a bullish/bearish conclusion to satisfy a return ambition. This review does not approve any proposal or attest that a model's statements are all true.
