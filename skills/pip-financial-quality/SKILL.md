---
name: pip-financial-quality
description: Assess issuer financial quality by reconciling earnings, assets, cash flows and financing, and test whether disclosures support a research thesis. Use before relying on forecasts or when new results raise accounting concerns.
metadata:
  version: 1.1.0
---

# Financial quality and statement challenge

Use reconciled issuer actuals and notes from the [company-model branch](../pip-company-model/SKILL.md). Return a [financial-quality handoff](../pip-research-cycle/references/handoffs.md). This branch does not apply a corporate-accounting template to a commodity, currency or token.

## Choose the pass

- **Model audit, before valuation:** review the assembled actuals/forward model, its cash/financing consistency, assumptions and comparable consensus differences. Historical source and identity checks already occur during model construction. Fix material model errors before passing forecast outputs into valuation.
- **Thesis validation, after valuation:** test the specific priced expectations and provisional thesis against financial, operating and industry evidence. Reuse the model audit and expand only the matters that could support or disprove that thesis.

Use distinct artifact IDs for these passes. Do not write two complete financial reports or require a finished valuation thesis merely to audit the model.

## Review material drivers and anomalies

Identify material changes in amount and business significance, not just a universal percentage threshold. Small bases can make a large percentage unimportant; a stable but large liability can matter greatly. For each important issue explain: observation and period, plausible causes, supporting/counterevidence, historical/peer context, decision impact and next verification.

Cover the statements as a connected system:

- **Revenue and working capital:** recognition policy, receivables/contract assets, cash receipts, customer concentration, inventories and supplier terms. Distinguish cash collection, recognition and indirect taxes.
- **Profit and earnings quality:** price/mix/cost bridges, recurring versus adjusted earnings, associates, minorities, incentives, impairments and tax. Reproduce the issuer's adjustment bridge before adopting an alternative definition.
- **Productive assets and investment:** capex, construction-to-PPE transfers, utilisation, depreciation, capitalised R&D, acquisitions, goodwill and impairment assumptions.
- **Cash flow:** bridge net income to operating cash through noncash items and working capital; distinguish maintenance/growth capex where evidence permits; reconcile investing/financing cash and FX to the reported cash definition.
- **Financing and obligations:** unrestricted versus restricted cash, debt maturities, covenants, lease obligations, guarantees, refinancing dependence and contingent claims. Profit does not establish liquidity.
- **Equity and per-share claims:** changes in ownership, issuance/buybacks, dilution, payout and related-party transactions.

Ratios and heuristics are investigation triggers, not automatic quality scores or proof of fraud. Banks, insurers and other specialised businesses need sector-appropriate statements and valuation methods. Read the issuer's applicable accounting framework rather than forcing a universal chart of accounts.

## Connect to the thesis without confirmation bias

Perform the model audit before relying on its outputs in valuation. After valuation, ask which specific thesis assumptions are supported, contradicted or untested. Avoid declaring every financial change a narrative confirmation. Preserve an alternative benign explanation and an adverse explanation for suspicious patterns.

Cash flow is not immune to classification or timing effects. Higher operating cash than net income is not automatically superior; working-capital release or delayed supplier payment can be temporary. A receivable increase or large impairment does not, by itself, establish manipulation.

Do not force expenses, reserves, provisions or segment data to fit an investment conclusion or incentive threshold. Material unresolved issues become forecast constraints and decision blockers, with a concrete follow-up test.

## Handoff

Provide the key statement/cash bridges; material findings and evidence; the strongest alternative explanations; forecast constraints; available sensitivity estimates; unresolved questions; and downstream artifacts needing revision. Include a cash-flow section even when the raw template emphasises balance sheet and income statement.

A balanced workbook or a completed checklist is insufficient evidence of financial quality. Do not claim a fraud finding without adequate corroboration. The analysis can be complete while the investment case remains unproven.
