# Model house style (the user's Excel conventions)

Apply to every tab you build or rebuild in the user's company models. The user has corrected each of these
points explicitly; deviating from them costs a round-trip.

## Existing tabs come first
- When the user already has the tab, its look is the template: row order, labels, header bar, sub-section
  fills, number formats. Read the old tab's styles (fills, fonts, formats) before writing and mirror them.
- The rules below apply to new tabs and to new rows added to an existing tab.

## Fonts
- Every cell containing Chinese text uses **KaiTi (楷体)**: labels, units, notes, headers, ACT实际/EST预测
  flags, legends and formula cells that return Chinese text (e.g. `=Guidance!B5`).
- Numbers use Calibri 10. Size 10 throughout; titles 11–12 bold.

## Colours
- **Assumptions (anything the user can change)**: purple font `FF7030A0` on the "nude" fill = theme
  colour 9 (accent6) with tint 0.8. Assumptions that are formulas (e.g. `=prior year`, `=AVERAGE(...)`)
  are still purple, because the choice is the assumption.
- Actuals typed from reports: blue `FF0070C0`. Formulas: black.
- Section bars: fill theme 4 (accent1) tint −0.25, white bold text (theme 0); the years / quarter labels
  are repeated on every bar.
- New tabs only: alternating band `FFF5FBFD` per metric group (a metric and its indented 同比/占比/假设 rows
  share a band). Don't add banding to a tab that didn't have it.
- Ratio / YoY / check rows: grey text (theme 1, tint 0.5). Reference rows (broker or consensus): grey.

## Layout
- **No borders at all**, including no dotted/hair lines, no vertical separators (they break at spacer rows)
  and no borders on section bars. Separate blocks with a **blank spacer row** between metric groups.
- **One-line rows**: no wrapped text and no custom row heights. Long notes go in a notes column at the far
  right where they can overflow freely. Exception: the 问题 table wraps text inside cells with a uniform
  row height.
- **Uniform column widths** for all number columns (e.g. 10); narrow (2–3) gap columns between FY and
  quarterly blocks; label column ~36.
- Quarters go in **columns** (FY block, gap, quarter block), never as extra row sections at the bottom.
- Freeze panes below the header rows and right of the label/unit columns; gridlines off on presentation
  tabs (问题, 投资逻辑, 估值区间) and on rebuilt projection tabs.
- Waterfall order: each block feeds the next and reuses elements by reference (e.g. unit-profit block
  references the ASP rows instead of retyping them).

## Notes and sources
- **Revenue Projection: no cell comments.** Reasons go as text in the 重点 notes column on the same row.
  One line per row: `来源：<report / 纪要日期 / 调研 / 原模型假设 / 卖方推测>（key quote or number）；<how the
  input was set>`, or `计算：…` for derived rows. **Every purple row needs a 来源 line.** Clear stale memos
  from the live tab (they stay in the old-version tab).
- 3S and other tabs: a short cell comment on each assumption is fine.
- Charts (e.g. the P/E band) are real Excel charts, not tables, when the user asks for a "graph".

## Writing to the workbook
- **Never write while the workbook is open**: check for the `~$<name>.xlsx` lock file. If it's open,
  preview the change on a scratch copy (scripts take the model path from an env var, e.g. `LX_MODEL`),
  report the preview's numbers, and apply to the real file once the user closes Excel.
- **Back up before every write** to the company's `work\` folder (`<name>.backup-YYYYMMDD-HHMMSS.xlsx`);
  after writing, prove that only the intended cells/sheets changed and that no new `#` errors appeared.
- **The user edits while you work** (inserts columns, types their own inputs such as a target P/E).
  Before every write, diff the file as the user saved it against the last backup taken *before* their
  save (not against your own preview copy) and carry their edits. Locate rows and columns from header
  labels, never hard-coded letters.
- **openpyxl vs Excel COM.** openpyxl drops charts, images and x14 conditional formats on save, and drops
  cached values. If the workbook has any of these, write through Excel COM (`win32com.client.DispatchEx`,
  hidden instance, `DisplayAlerts=False`, `CalculateFull()` before `Save()`) and use openpyxl only to read.
  With openpyxl writes, set `wb.calculation.fullCalcOnLoad = True` and verify with `scripts/calc_check.py`,
  never by reading data_only from a file openpyxl wrote.
- COM gotchas: text that starts with "=" needs a leading "'"; renaming a tab silently repoints formulas in
  other tabs that referenced it, so check external references after a rename.
- Formula gotchas: `AVERAGE`/`STDEV` fail over chart series with `NA()` gaps, so use
  `AGGREGATE(1,6,…)` / `AGGREGATE(8,6,…)`; a `LEFT(text,n)` test must match the label's character length.
- After a rebuild, render the tab to PDF and look at it: circular references show as tracer arrows.
