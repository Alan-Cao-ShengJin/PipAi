# Claude skills: company model updates

The skills Claude uses to update a company model (`<公司> MMDD.xlsx`) and write the note to 郄总. Built on 宇通客车 and 三江化工, and updated after the 隆鑫通用 3Q26 update (October 2026).

**This folder is a copy.** The live versions Claude reads are in `C:\Users\Alan Cao\.claude\skills\`. Editing a file here changes nothing until it is copied back there.

## Order of use

| # | Skill | What it does | Output |
|---|---|---|---|
| — | `company-model-update` | The whole workflow: order of steps, checks between them, the audit, the step log | Runs the skills below |
| 1 | `quarterly-3s` | 3S single quarters, 1H, 9M from reports (cninfo), verified against FactSet | 3S interim columns |
| 2 | `volume-data-tab` | Volumes from trackers/brokers into one Data tab; identities sum | Data tab |
| 3 | `earnings-call-guidance` | Fact-check the 纪要, extract guidance, short Chinese sentences | Guidance tab |
| 4 | `revenue-projection-build` | Segment forecast in the user's RP layout, 3S forecast quarter, assumption review and sell-side audit | Revenue Projection, 3S 4Q E |
| 5 | `management-questions` | Few, view-changing, easy-to-ask questions | 问题 tab |
| 6 | `investment-thesis-tab` | Why we invest, target price, own 5-year P/E band chart, peers, sell-side targets | 投资逻辑, 估值区间 |
| 7 | `boss-update-note` | Plain short note to 郄总, every number checked; saved copies | `建模记录\给老板的笔记\` |

`revenue-projection-build/references/house-style.md` holds the Excel conventions every skill follows (KaiTi, purple-on-nude inputs, no borders, notes in 重点, lock-file and backup rules, when to write through Excel COM).

## Worked examples inside each skill

- `yutong_*`: 宇通客车, built from scratch (openpyxl).
- `longxin_*`: 隆鑫通用, rebuilt on the user's existing tabs through Excel COM (the workbook has x14 conditional formats). Includes the ESOP expense / Q4 cost cap, segment re-split from broker data, and the P/E band chart.
- `boss-update-note/references/`: the final 隆鑫 3Q26 note and a monthly data note.

The scripts are patterns: reuse the structure, not the numbers or hard-coded paths.

## Clean model template

`公司模型模板（clean）.xlsx` is the starting model for a new stock: your 隆鑫 model with every company number, company-only row and tab removed, keeping your formats, formulas and the P/E band chart.

| Tab | State | Filled by |
|---|---|---|
| 3S | Full IS / CF / BS + schedules, formulas only; forecast = ratio × revenue; 4Q E and FY = 9M + 4Q E wired up | `quarterly-3s` (actuals), purple ratios by hand or `revenue-projection-build` |
| Revenue Projection | Generic skeleton in the original RP look: 业务A–C + 其他, volume × price, GM, GP, cost → 3S | `revenue-projection-build` (rename/add segments) |
| Data | Company volume and industry blocks | `volume-data-tab` |
| Guidance / 问题 | Layout with placeholder lines | `earnings-call-guidance`, `management-questions` |
| 投资逻辑 / 估值区间 | Valuation table linked to 3S; band chart waiting for monthly data | `investment-thesis-tab` |

To use it: Save As `<公司> MMDD.xlsx`, roll the period headers (3S rows 1–2, RP row 1, Data row 1) to the current cycle, then run the skills in order. With no data in it, ratio rows show #DIV/0!; that's normal. In a test filled with real 3S numbers, the balance sheet balanced in every year.

## Step logs per company

Each update is logged in `Companies\<公司>\建模记录\<公司>建模步骤记录.md` (e.g. 隆鑫, 三江). These are the source for future skill changes.
