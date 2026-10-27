# Optional company-workbook delivery profile

Use this only when the user requests a workbook. The analytical handoff can be delivered independently. Existing user layout and explicit instructions take priority over inherited formatting.

## Preserve the workbook

Identify the user's model, not a broker workbook or tracker. Inspect sheets, formulas, names, charts, external links, unsupported extensions and available writers. Preserve the original and create a dated output/backup. A file lock is evidence that a file may be open, not the only concurrency check: compare the last observed file fingerprint before writing and retain intervening user edits.

Use a writer appropriate to the workbook features and available environment. openpyxl does not calculate Excel formulas and may not preserve unsupported extensions; do not make a blanket claim that all charts/images are always lost. A Windows Excel COM workflow requires Excel and a reviewed automation path. Avoid writing an open file through a competing process; a supported live-session connector may have its own safe editing workflow.

Do not execute the imported company-specific scripts as generic tools. They contain hard-coded paths/cells, old company values, environment-specific COM operations and dependencies. Port only a reviewed operation after identifying its actual inputs, outputs and preservation tests. No automatic dependency installation on import.

## Existing profile to preserve when requested

- Keep the user's `3S`, `Revenue Projection`, `Data`, `Guidance`, questions and thesis tabs; map rows/columns by labels rather than fixed coordinates.
- Quarters are columns beside annual periods; actual/forecast and derived/source classifications remain explicit.
- For this legacy profile, Chinese labels use KaiTi, numerical cells Calibri 10; actuals blue, formulas black, editable assumptions purple on a light accent fill, reference rows grey. Preserve existing styling over imposing this on a different model.
- Each editable projection assumption has a visible source/rationale in the notes column. Other assumptions may use comments if that matches the workbook.
- Use blank spacing and restrained section bars; retain wrapping where required for readable question tables. Formatting does not replace semantic units/provenance.
- A historical P/E band is optional and requires dated forward EPS vintages. Exclude or explicitly handle nonpositive earnings and sparse coverage. A realised-earnings series is not historical point-in-time consensus.

The raw clean-template workbook is a reference asset, not a prevalidated model for every issuer. Review its periods, formulas, issuer-specific remnants, external links and recalculation before use. Do not change the user's target multiple or other retained judgement silently; flag an inconsistent or stale input and show its effect.

## Verification

Recalculate with an actual compatible engine and inspect key results. Setting fullCalcOnLoad requests future recalculation; it does not prove calculation happened. Cached values from a newly written file are not verification. Check statement identities, intended formula links, circular references, visible error cells and the formulas as well as displayed values.

Compare intended cells/sheets and preservation-sensitive package parts against the backup. Report unsupported/unverified features. Render material presentation changes using an available renderer and inspect the result when producing a deliverable. A textual check alone does not prove layout is readable.

Retain drafts and user-authored notes; replace or remove sheets only within the requested scope after reference checks. Mention the output, backup and any remaining validation gaps in the delivery note.
