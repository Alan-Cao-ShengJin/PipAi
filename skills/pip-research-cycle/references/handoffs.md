# Shared research handoffs

Every specialist should return a compact, versioned handoff. Reuse existing records rather than copying tables between documents. This is a research contract; it does not create execution authority.

## Common envelope

Use the JSON schema in [handoff.schema.json](handoff.schema.json) when a machine-readable handoff is needed:

- `id`, `kind`, `version`, `status`: stable identifier, artifact class, positive version and `complete`, `partial`, `blocked` or `not-applicable`.
- `mandateId`, `mandateVersion`, `scopeIds`: the mandate and instruments/entities this analysis actually covers.
- `asOf`, `producedAt`: information cutoff and generation time, with explicit offsets. Earlier publication/effective times remain on evidence records.
- `summary`: what was learned and its decision implication.
- `sources`: source id, location, locator, publication/availability/retrieval timestamps, access status and whether synthetic. Use null for genuinely unknown dates; unknown availability limits historical testing.
- `claims`: classification (`reported`, `derived`, `guidance`, `estimate`, `assumption`, `inference`), supporting source ids and, for derived numerical claims, a calculation/assumption record. Material unsupported claims remain explicitly uncertain.
- `dependencies`: upstream artifact id/version and whether its content changed since this output was produced. An affected downstream artifact is stale until recalculated/reviewed.
- `checks`: meaningful tests, their results and which failures block a candidate.
- `criticalUnknowns`: missing facts, conflicts or capability gaps that can change the decision.
- `nextActions`: ranked task, action kind, completion condition and review/due time or observable trigger. For a proposed watch, distinguish `planned` from `active`; active requires a host acknowledgement.

`not-applicable` requires a reason. It does not mean a dependency silently passed. `complete` means this artifact's scoped research is complete, not that a candidate is approved or live monitoring works.

## Evidence and numerical identity

Keep these fields with observations when relevant: entity/contract id; metric definition; value; currency; scale; period start/end or snapshot time; stock/flow/per-share type; consolidated/parent and reported/adjusted basis; segment coverage; restatement vintage; source locator. Store raw observations separately from normalised or derived data.

An arithmetic identity does not identify which source value is wrong. Record a residual and investigate scope, definitions, timing, rounding and missing categories. Do not alter source values to obtain a zero check. Two notes from the same call or two feeds republishing one filing are not independent confirmations.

Forecast assumptions cite their basis and uncertainty. A management target is guidance, not an observed actual or a forecast that must be hit. Historical quarterly derivations remain traceable even if a workbook displays hard values as actuals.

## Stage-specific artifacts

| Kind | Required substantive content |
| --- | --- |
| `research-brief` | Decision, horizon/deadline, mandate, capital scope, baseline, capabilities and budget |
| `evidence-pack` | Source register, reconciled observations, conflicts and freshness/coverage gaps |
| `hypothesis` | Economic return source, baseline, support/counterevidence and falsifiable failure conditions |
| `company-model` | Historical/forecast distinction, statement/driver maps, assumptions, reconciliations and affected cells |
| `financial-quality` | Earnings-to-cash, balance-sheet and financing bridges, material anomalies, alternatives and follow-up tests |
| `valuation-thesis` | Method/basis, conditional scenarios, sensitivity, expectations gap and observable invalidation |
| `investment-conclusion` | Audited-model/valuation/validation references, supported view, return scenarios, catalysts, invalidation and action conditions |
| `strategy-test` | Frozen rules, sample/cutoff, out-of-sample design, costs, results, stress and implementation limits |
| `challenge` | Strongest counter-case, reproduced key calculations and unresolved blockers |
| `portfolio-decision` | Portfolio snapshot/authority versions, candidate or no action, sizing policy, aggregate risks and required independent checks |
| `management-questions` | Unresolved decision-sensitive questions, available facts already checked and answer-to-model implications |
| `brief` | What changed, evidence, implications, uncertainty, proposed action and next task |
| `monitor-review` | Watch specifications/activation status, health, due times, material changes and attribution |

Before calling a candidate decision-ready: require relevant upstream artifacts, current versions, source support for material claims, passed blocking checks, resolved critical unknowns and freshness compatible with the intended action. Those checks are necessary, not proof of suitability or profit. An authenticated risk/approval service still independently validates the exact proposal.

Company actuals, operating data and forecasts use separate IDs even though their kind can be company-model. Likewise, model audit and post-valuation thesis validation use separate financial-quality IDs. A valuation-thesis is provisional; the investment-conclusion comes after validation/challenge. Portfolio proposals are a further downstream artifact, not another name for a company research conclusion.

If a source or necessary tool is unavailable, return a useful partial handoff and a concrete next task. Do not fabricate a successful download, recalculation, broker comparison, market fill or alert activation.
