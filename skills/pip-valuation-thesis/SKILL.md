---
name: pip-valuation-thesis
description: Analyse conditional company value and market-implied expectations using an audited forecast, producing a provisional thesis for subsequent validation. Use for valuation research; synthesise the final view with pip-investment-conclusion after challenge.
metadata:
  version: 1.1.0
---

# Valuation, expectations and provisional thesis

Use a completed, audited forecast and [model-audit findings](../pip-financial-quality/SKILL.md). Produce a [valuation-thesis handoff](../pip-research-cycle/references/handoffs.md) for subsequent validation, not a final investment verdict or executable recommendation. Choose a method suitable for the underlying; this is primarily the company branch.

## Establish the valuation basis

Record price/time, share class and share count, currency/scale, dilution, cash/debt and minority/preferred claims where relevant. Distinguish equity value from enterprise value and current shares from period-weighted EPS shares. A stock-linked perpetual is a separate instrument; ownership dividends and total-return assumptions do not transfer automatically.

Choose cash-flow, residual-income, asset, multiple or another justified method. Preserve an explicitly user-chosen method/input while explaining limitations; do not silently replace a typed target multiple. Negative earnings make many P/E comparisons inapplicable. Sector-specific businesses may require a different valuation structure.

## Market expectations versus own assumptions

Show the forecast drivers implied by today's price and compare them with the analyst model under comparable assumptions. When usable consensus exists, record its vintage/contributor coverage and run a separate comparison. Do not relabel an old broker forecast as current consensus or fabricate coverage to satisfy a fixed broker count.

Reverse DCF is a conditional consistency calculation: many combinations of growth, margin, reinvestment and discount rate can explain a price. It is not a uniquely observed market belief. Read [valuation-method.md](references/valuation-method.md) before using the included FCFE calculator or adapting the legacy terminal-profit model.

Cash flows and discount rates must match. Distinguish net income, FCFE and FCFF; reconcile reinvestment, working capital, financing and dilution. A net-income-as-cash-flow approximation requires explicit justification and sensitivity. Do not fix a weak cash-conversion model by an arbitrary qualitative adjustment to terminal profit.

Use an explicit fiscal anchor and economically justified transition/steady-state horizon. Select discount-rate and terminal-growth scenarios from the business, currency and financing assumptions; 2035 and 8/10/12 percent are optional legacy examples, not defaults for every company. Explain terminal reinvestment and require a mathematically valid rate/growth relationship.

## Build the thesis and range

Explain the causal path: operating change -> financial/cash-flow effect -> expectations gap -> possible repricing/cash return, with supporting and contradictory evidence. Narrative changes are one hypothesis for returns, not the only possible source of excess return. Relative price moves or volume correlation do not identify a narrative cause by themselves.

Build coherent adverse/base/favourable scenarios, with driver assumptions, catalysts, horizon and falsification conditions. Scenario ranges are not statistical confidence intervals. Use probabilities only if their basis is defensible and labelled; do not invent precise probabilities to obtain a neat target price.

If using TAM x share x margin, align market definition, period and currency; avoid overlapping segments and reconcile arithmetic. Mathematical consistency does not establish economic feasibility. Do not backfill assumptions to reach a desired valuation.

Historical multiples and peer comparisons require comparable accounting, growth, capital intensity, share classes and estimate vintages. Explain sparse/stale coverage and exclude meaningless ratios; a five-year band is not a valuation law or a mandatory deliverable.

## Handoff

Return the valuation basis, scenario inputs, numerical consistency/round-trip checks, sensitivities, own-versus-market assumptions, expected return components, counter-case, catalysts and observable thesis breakers. Separate price upside, dividends, FX and implementation costs on a consistent horizon; avoid double counting distributions already included in a total-return assumption.

Map unresolved assumptions to [management questions](../pip-management-questions/SKILL.md). Pass the provisional thesis to the [post-valuation financial validation](../pip-financial-quality/SKILL.md) and [challenge](../pip-research-challenge/SKILL.md) passes, then synthesise it through [investment conclusion](../pip-investment-conclusion/SKILL.md). If validation changes a material forecast, rerun its audit and valuation before concluding. Conditional value alone does not determine portfolio size or entry timing.
