---
name: pip-company-model
description: Reconcile a company's historical statements and operating drivers, extract management guidance and build auditable driver-based forecasts. Use for issuer research or company-model updates, with an optional workbook deliverable.
metadata:
  version: 1.1.0
---

# Company actuals, drivers and forecasts

This branch applies to a company underlying, not every tradable market. Work from the [evidence pack](../pip-evidence-intake/SKILL.md) and return a versioned [company-model handoff](../pip-research-cycle/references/handoffs.md). A workbook is optional; the analytical method does not depend on a particular layout or vendor.

## Select the requested mode

- **Historical update:** inspect the current model and source periods; follow [actuals.md](references/actuals.md). Produce a reconciled historical baseline before forecasting.
- **Operating-driver update:** follow [drivers-guidance.md](references/drivers-guidance.md) for tracker and transcript analysis.
- **Forecast build/revision:** combine reconciled actuals, operating data and guidance using [forecast-audit.md](references/forecast-audit.md). Incorporate any existing quality findings, and audit the completed forward model before valuation.
- **Workbook output:** additionally read [workbook-profile.md](references/workbook-profile.md). Preserve existing user edits and use a supported writer; unavailable Excel automation does not block analysis in a different format.

For a full company cycle, run historical actuals -> operating data -> guidance -> forward model -> model audit -> valuation/expectations -> thesis validation/challenge -> investment conclusion. Historical reconciliation is part of building the model; targeted validation of a valuation thesis is a later, distinct pass. A focused quarterly update does not require a full valuation report. Continue authorised stages without repeated permission requests unless the user specifically wants stepwise review.

## Modelling principles

Map metrics by meaning and reporting basis before identifying cells. Treat reported actuals, derived actuals, management guidance, broker estimates and analyst assumptions as distinct. Preserve provenance when displaying derived quarters as hard values.

Choose business drivers that explain the company's economics: units/price/mix, capacity/utilisation, users/monetisation or another suitable decomposition. Reconcile segment totals and cash requirements; do not impose a volume model on a business where it is misleading.

Forecast from a reconciled baseline with explicit assumptions, constraints and scenarios. A guide is an input to assess, not a total that must be reached. Explain differences versus fresh consensus and isolate source/vintage differences before judging a broker wrong.

Never cap costs to manufacture an incentive KPI, force segment values to make a total, or keep a stale run-rate in defiance of newer evidence. Reassess unusual costs, tax, impairments and share-based payments using applicable accounting and company disclosures.

## Handoff

Provide the period/metric map; statement reconciliations; operating-driver map; guidance register; actual/forecast boundary; assumption table with sources and sensitivity; current outputs versus comparable consensus; changed cells/records and dependent artifacts; unresolved questions and next task.

Assertions that a workbook was calculated, preserved or visually verified require actual evidence of those checks. A zero balance-sheet check alone does not validate the model or its cash flow. If assumptions move, invalidate dependent valuation, thesis, questions and quoted numbers in briefs.
