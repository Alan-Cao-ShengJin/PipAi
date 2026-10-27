---
name: quarterly-3s
description: Fill the quarterly, 1H and 9M columns of a company model's 3S (three-statement) income statement from A-share/HK periodic reports (一季报、半年报、三季报、年报), with single-quarter figures (2Q = 1H − 1Q, 3Q = 9M − 1H, 4Q = FY − 9M) written as verified actuals and checked against FactSet quarterly data and the report's own single-quarter table. Use this whenever the user asks to fill, update or extend quarterly / 单季 / 1Q 2Q 3Q 4Q / 1H / 9M / 前三季度 columns in 3S or an income statement tab, drops a new quarterly report next to a model, or asks to "pick out 2Q from 1H" or add 3Q/9M data — even if they only say "update 3S with Q3".
---

# Quarterly 3S fill

The user keeps a model workbook per company (e.g. `宇通客车 1015.xlsx`) with a `3S` tab: annual columns (ACT/EST), then interim columns. They want the interim block laid out as:

```
… FY columns | gap | 1Q25 2Q25 3Q25 4Q25 1Q26 2Q26 3Q26 | gap | 1H25 1H26 | gap | 9M25 9M26
```

Every quarter column must hold **actual figures, labelled `ACT实际`**. The user does not want quarters shown as `推算` (derived) formulas. Chinese companies only publish full cumulative statements, so single-quarter lines are cumulative differences. FactSet produces its quarterly data the same way. Compute them, verify them against FactSet and the report, and write them as hard values with a source comment.

**Forecast quarter column:** the quarter block may end with a forecast quarter (e.g. `4Q26E`, row 2 `EST预测`) whose inputs link to Revenue Projection and whose FY column = 9M actual + that quarter. When the actual for that quarter arrives:
- replace the forecast column's values with actuals and relabel it `ACT实际`;
- rebuild the FY column links: actual FY = the annual report, not 9M + forecast;
- add the next forecast quarter if the user wants one.

The purple cells in that column are 4Q assumptions, so don't overwrite them silently.

## 1. Gather inputs

- **Model**: the user's own workbook, not broker files. Read the 3S tab first (`PYTHONIOENCODING=utf-8 python scripts/dump_workbook.py "<model.xlsx>" --formulas`). Note:
  - which columns already hold interim periods (row 1 labels such as `1Q25`, `1H26`);
  - the FY columns (e.g. `G` = 2025);
  - which interim column has every row populated, including ratio formulas. This is the `template_col`; it is usually the latest 1Q column.
- **Reports**: the PDFs in the folder (e.g. `宇通客车：2026年第三季度报告.pdf`). Extract each one's income statement:

  ```bash
  PYTHONIOENCODING=utf-8 python scripts/extract_is.py "<report.pdf>" <scratchpad>/is_<period>.json
  ```

  It prints every 合并利润表 line with [current, prior-year] values in 元, plus the single-quarter key data (本报告期 营业收入/利润总额/归母净利润/扣非/经营现金流) when the report has it. Q1 and Q3 reports have it. Read the printout and compare a few lines against the PDF before trusting it.
- A Q3 report gives both 9M of this year and 9M of last year, so one PDF fills two 9M columns. A half-year report gives 1H for both years; an annual report gives FY for both years.
- **Reports not in the folder:** download them from cninfo. POST `http://www.cninfo.com.cn/new/hisAnnouncement/query` with `stock=<code>,<orgId>` (隆鑫: `603766,9900023200`), then fetch the PDF from `static.cninfo.com.cn/<adjunctUrl>`. Save the reports the user will keep in the company folder.
- **Check the existing quarter columns too**, not just the new ones. Compare every old single quarter against FactSet QTR. 隆鑫's 0630 model had 1Q25/1Q26 tax lines swapped.
- **Segment revenue by quarter** isn't in the income statement. Half-year reports give segment text (e.g. "自主摩托车发动机产品实现销售收入16.03亿元，同比增长31.16%"). Q1/Q3 segment splits come only from the call or broker notes. Record which is which.

## 2. Write the config and run the fill

**Workbooks with charts or x14 conditional formats** (check first): `fill_quarters.py` writes with openpyxl, which would drop them. Compute the values the same way (cumulative differences, sign conventions below), then write them through Excel COM. Worked example (隆鑫, whose 商品价格 tab has x14 formats): `references/longxin_q3s_values.py` builds the values from the reports and `references/longxin_q3s_write_com.py` writes the layout via COM. The rest of this section describes the openpyxl path.

Build `<scratchpad>/q3s_config.json`:

```json
{
 "model": "C:/…/宇通客车 1015.xlsx",
 "backup_dir": "<scratchpad>",
 "sheet": "3S",
 "template_col": "N",
 "first_col": "L",
 "fy": {"FY25": "G"},
 "cumulative": {
   "1Q25": {"col": "L"}, "1H25": {"col": "M"}, "1Q26": {"col": "N"}, "1H26": {"col": "O"},
   "9M25": {"json": "<scratchpad>/is_9m.json", "which": 1},
   "9M26": {"json": "<scratchpad>/is_9m.json", "which": 0}
 },
 "quarters": {"2Q25": ["1H25","1Q25"], "3Q25": ["9M25","1H25"], "4Q25": ["FY25","9M25"],
              "2Q26": ["1H26","1Q26"], "3Q26": ["9M26","1H26"]},
 "layout": ["1Q25","2Q25","3Q25","4Q25","1Q26","2Q26","3Q26","|","1H25","1H26","|","9M25","9M26"],
 "yoy": {"1Q26":"1Q25","2Q26":"2Q25","3Q26":"3Q25","1H26":"1H25","9M26":"9M25"},
 "checks": [["rev","FY25",["1Q25","2Q25","3Q25","4Q25"]], ["ni","9M26",["1Q26","2Q26","3Q26"]]],
 "comments": {"3Q26": "单季实际数（2026三季报单季数）。已与FactSet单季数据核对：…"}
}
```

- `cumulative` entries use `{"col": X}` for a period already in the sheet, where X is its column **before** the rewrite. Use `{"json": …, "which": 0|1}` for a period taken from an extracted report: 0 = current year, 1 = prior year.
- The layout must start at a column that leaves one blank gap after the last FY column (e.g. FY ends at J, gap K, so `first_col` is L). `"|"` is a narrow gap column.
- Add a 4Q column for any year whose FY column is actual. It completes the year and the user has accepted it before.

Dry-run first, then run for real:

```bash
PYTHONIOENCODING=utf-8 python scripts/fill_quarters.py <scratchpad>/q3s_config.json --dry-run
PYTHONIOENCODING=utf-8 python scripts/fill_quarters.py <scratchpad>/q3s_config.json
```

What the script does, so you can explain and debug it:
- **Rows**: finds the input rows by their English labels in column B (Revenue, Operating costs, Business Tax and Surcharges, … Equity shareholders of the Company). If a model labels them differently, add `"rows": {"rev": 4, …}` to the config.
- **Signs**: maps report lines to the model's convention:
  - costs, 财务费用 and 所得税 are stored as negatives;
  - 信用/资产减值损失 and 公允价值变动 keep the sign printed in the report;
  - "Other investment gains" = `=投资收益 − JV row`, because the JV share has its own row;
  - non-operating = `=营业外收入 − 营业外支出`;
  - finance income = 利息收入.

  Units are RMB '000.
- **Moved periods**: keeps existing interim periods, moving their formulas with Excel-style translation.
- **Quarters**: writes single quarters as **hard values** (period A − period B).
- **Formula rows**: copies ratio and subtotal rows (GP, margins, % of revenue, PBT, ETR, PAT, minority share) and YoY rows from `template_col`.
- **Repointing**: re-aims formulas elsewhere in the sheet that pointed at a moved interim column. For example, 2026E assumptions `=O18*2` became `=U18*2` when 1H26 moved from O to U. Every repoint is listed in the output; read the list.
- **Safety**: refuses if the workbook is open, backs it up first, sets Excel to recalculate on open (openpyxl drops cached values), and prints a reconciliation table plus the `checks`.

## 3. Verify, then label

The fill isn't done until the quarters are verified. Do both of these:

1. **Against the report's single-quarter table** (Q1/Q3 reports, from `single_quarter` in the extract JSON): 营业收入, 利润总额 and 归母净利润 must match the model's 3Q (or 1Q) column to the yuan.
2. **Against FactSet quarterly data** (FactSet MCP; call `FactSet_Metrics` before `FactSet_Fundamentals`, `periodicity: "QTR"`, id like `600066-CN`). Use the metrics that are comparable:

   | FactSet | Model row | Note |
   |---|---|---|
   | `FF_SALES` | Revenue | exact |
   | `FF_TAX_NON_INC` | Business tax & surcharges | exact |
   | `FF_INC_TAX` | Income tax | exact |
   | `FF_NET_INC` | Equity shareholders (归母) | exact. `FF_NET_INC_PARENT` errors with the other metrics, so don't use it |
   | `FF_PTX_INC` | PBT − JV share | FactSet excludes equity-method income, so add the JV row back before comparing |
   | `FF_COGS`, `FF_RD_EXP`, `FF_GROSS_INC` | — | **not comparable**: FactSet reclassifies them. Don't treat differences as errors |

   Values are in millions; the model is in thousands.

If anything differs beyond rounding, find out why before keeping the figure. Common causes are a wrong `which`, a mislabelled row, a restated prior-year comparative, or a garbled PDF extraction. Don't paper over it.

Then put a short comment on each quarter's row-1 header cell. Pass it via `comments` in the config and re-run, or add it with openpyxl. The comment states the source (e.g. `2Q26 = 2026半年报 − 一季报`) and what it was checked against. Row 2 stays `ACT实际`.

## 4. Report back

Tell the user:
- the new column layout;
- which periods came from which report;
- the verification results (state that the matching lines are exact, and name any line that couldn't be checked);
- any repointed formulas;
- the backup path.

A quarterly summary table (revenue in 亿, GPM, ETR, NI) helps the user sanity-check the numbers. Mention anything odd, such as an unusually low quarterly tax rate.

If the user also wants interim balance sheet or cash flow columns, say so and ask. Those are separate sections of 3S, and the existing interim columns usually cover only the income statement.
