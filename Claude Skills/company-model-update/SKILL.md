---
name: company-model-update
description: Run the user's full step-by-step update of a company model (<公司> MMDD.xlsx) after results or a management call — 3S quarters, Data tab, Guidance, Revenue Projection with the forecast quarter, 问题, 投资逻辑 and P/E band, an audit against consensus and the sell side, then a note to 郄总 — in the order and with the checks used on 宇通, 三江 and 隆鑫, logging every step. Use when the user says they need to update their model for a company, "do it step by step like 宇通/三江", "results are out, update the model", or names a new report/纪要 and the model to update.
---

# Company model update (the full workflow)

The user updates one company at a time, step by step, and approves each step before the next ("ok go ahead"). This skill is the order and the checks; each step has its own skill with the detail.

## 0. Set up

- **Model file:** copy the latest `<公司> MMDD.xlsx` to a new name dated today (e.g. `隆鑫通用 0630.xlsx` → `隆鑫通用 1025.xlsx`). The old file stays as the backup.
- **New company (no model yet):** start from the clean template `公司模型模板（clean）.xlsx` in the user's skills folder (`Desktop\Pip\Claude Skills\`). Save it as `<公司> MMDD.xlsx` and roll the period headers (3S row 1–2, RP row 1, Data row 1) to the current cycle. What the template contains:
  - **3S:** the user's full IS / CF / BS with schedules (working capital, PPE, ROU, intangibles, finance income), all formulas, no numbers. Blue actual columns are empty for `quarterly-3s`. Forecast years use the user's generic method (cost = ratio × revenue, purple ratios); 4Q E = same quarter last year's ratio × revenue; FY current year = 9M + 4Q E. Payout ratio (row 50) and peers (rows 58–60) are empty purple inputs.
  - **Revenue Projection:** a generic skeleton in the original RP look. Segments 业务A–C + 其他（倒算）, total row 12 → 3S row 4. Volume × price block for 业务A, segment GM (rows 22–25), segment GP (rows 29–33), cost row 35 → 3S row 6, and a profit block linked to 3S. Columns: FY C–I, gap J, quarters K–R, 重点 S, each purple row with a 来源 placeholder. Rename or add segments to fit the company.
  - **Data:** company volume (total / export / domestic / share) and industry share blocks.
  - **Guidance, 问题, 投资逻辑, 估值区间:** layout and formulas with placeholder text. The P/E band chart is in place, waiting for monthly data.
  - With no data entered, ratio rows show #DIV/0!; that's expected. A filled test balanced the BS in every year.
- **Workbook check:** if it has charts, images or x14 conditional formats (often a hidden prices tab), every write goes through Excel COM; openpyxl is for reading only. See `../revenue-projection-build/references/house-style.md`.
- **Step log:** create or append `<公司>\建模记录\<公司>建模步骤记录.md`. Add a short plan table (step → skill → this company's version) at the top. After each step, add an entry: what was done, sources, checks, the user's corrections, and a lesson tagged [general] / [A股季报] / [<公司>].
- **Read first:** the company's step log and any memory notes about it (trackers, earlier corrections).
- **Sources:** download missing reports from cninfo (`quarterly-3s` has the API) and save them in the company folder. Read every 纪要 of the latest meeting, not just one.

## 1–8. Steps, in order

| # | Step | Skill | Key checks |
|---|---|---|---|
| 0 | Monthly tracker (if the company has one) | — (company memory) | Check new data against history and identities before writing; note which broker's data is missing |
| 1 | 3S quarterly actuals + 1H/9M | `quarterly-3s` | Single quarters = cumulative differences, exact vs report single-quarter table and FactSet QTR; re-check old quarters |
| 2 | Data tab | `volume-data-tab` | Volumes only; identities sum; if the user says "literally from <tracker>", copy it as-is |
| 3 | Guidance | `earnings-call-guidance` | Fact-check names; every note of the meeting; flag stale guidance (YTD already beats it) |
| 4 | Revenue Projection + 3S forecast quarter | `revenue-projection-build` | Existing tab is the template; quarters as columns; 来源 line on every purple row; FY = YTD + forecast quarter |
| 5 | 问题 | `management-questions` | Not covered on the call; can change the view; simple to ask |
| 6 | 投资逻辑 + 估值区间 | `investment-thesis-tab` | Live links to 3S; own 5-year P/E band as a chart; peers at latest close |
| 7 | Audit vs consensus and sell side | `revenue-projection-build` §4 | See below |
| 8 | Note to 郄总 | `boss-update-note` | Every number checked; plain and short |

Show each step's result in chat (a small table of what changed and the key outputs) and wait for the user before the next step, unless they've said to run through.

## 7. The audit ("double triple check… fairly forecast, not under or over")

Run all of these, report each with numbers, and fix what's wrong:
1. **Consensus freshness:** last change date; consensus FY − YTD actual = implied remaining quarter, compared with every same quarter in history.
2. **Seasonality and cost timing:** is the remaining quarter structurally weak (year-end accruals, impairments)? Use the back-loaded cost method if so.
3. **Implied remaining quarter of every annual segment input** vs the YTD trend.
4. **Guidance vs YTD:** stale full-year guides; implied rest-of-year.
5. **Incentive plans:** expense schedule (our estimate unless disclosed), KPI definition, and consistency between the expense and forecast NI.
6. **Share count** for EPS (treasury/ESOP shares excluded as the company does; check against reported EPS).
7. **Sell side:** broker models in the folder and post-results notes. Decompose every gap (base year, growth, omitted costs, segment assumptions) and say who is likely wrong.
8. **Volume cross-check:** the Data tab's matched volume vs reported segment revenue.
9. **Fixed text** quoting model numbers (问题, 投资逻辑, RP notes): update after every change.

## Rules that hold across companies

- **Official numbers first**: reports and company tables anchor the forecast; forecasts move from the latest actual, sized with management quotes. Web spot prices are directional only, never a formula driver. Engineering recipes only if they reconcile exactly with the base year.
- **No sudden drops to zero**: when management says a line has no contribution for a period, keep the latest run-rate unless the user says otherwise.
- **Compact tabs** in the user's layout; detail goes in notes, not extra sections.
- **The user edits the workbook between steps**: diff their save before every write and keep their inputs (e.g. a typed target P/E).

## After the update

The user usually asks follow-ups: the verdict on the stock, consensus P/E, why we revised, what management said on a line, the incentive KPI. Answer from the model with numbers and sources; if the answer shows the model is wrong, say so and offer the fix.
