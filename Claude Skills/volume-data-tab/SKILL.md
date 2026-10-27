---
name: volume-data-tab
description: Consolidate sales-volume data (monthly/quarterly/annual production and sales by size, domestic vs export, NEV vs conventional, industry exports, customs NEV exports by country, regional export splits) from broker models, monthly trackers and the user's own tabs into one clean Data tab in the company model, fact-check company totals against FactSet StreetAccount monthly announcements and the web, make every identity sum (domestic + export = total, 大+中 = 大中, quarters = months), reconcile annual sums to the annual report, and retire the old Monthly/Quarterly tabs. Use whenever the user asks to consolidate/clean/merge volume or 销量 data, build or fix a Data tab, "make it sum up properly", or fact-check monthly sales — even if they just name the source files.
---

# Volume Data tab

The Data tab holds **sales-volume figures only**: no profit, revenue, value, price or margin lines. If a source has customs value or ASP, keep only the units. Broker *volume* forecasts may stay as grey reference rows.

Apply the house style in `../revenue-projection-build/references/house-style.md`. Worked examples; treat them as patterns, not numbers to reuse:
- **宇通客车** (consolidating many sources): `references/yutong_build_data.py` builds the tab and `references/yutong_style_data.py` styles it.
- **隆鑫通用** (one tracker copied as-is): `references/longxin_build_data.py`. The user's instruction was "data tab is literally from 摩托车三公司_月度出口内销_更新至26年9月": copy the tracker's 大排量/小排量/电动 pages in unchanged, and build the Data tab (monthly → quarterly → annual sums, 同比/占比 in grey, missing months "—") from them. Don't re-source or "correct" the tracker in that case.

**Use the Data tab as a pre-results read.** Volumes usually arrive before the report (国联 商会 data on 10-21, results on 10-23). Map each volume bucket to the revenue segment it drives (隆鑫: >250cc export → 无极出口; >250cc domestic → 无极国内; ≤250cc → 代工). After results, compare one matched pair per segment. 隆鑫 3Q26: >250cc export +46% vs 无极出口 revenue +40%; the gap is mix (growth in cheaper 250–400cc). Domestic volume +8% vs revenue +20% shows price/mix, so volume alone understates. Note what the data can't see (通机).

## 1. Inventory the sources

Dump every source workbook (all sheets) and the model's existing Monthly/Quarterly/Data tabs. For each series, note where it comes from, the period it covers and the basis it uses:
- **company announcement:** monthly production and sales by length;
- **third-party split:** domestic/export/NEV, e.g. 中客网 via broker or tracker;
- **customs:** declaration basis, which leads deliveries;
- **annual report.**

Check which formulas elsewhere reference the old tabs before planning to delete them.

## 2. Fact-check

- **Company monthly totals:**
  - search FactSet `FactSet_UnstructuredContent` (sources `ALL_NEWS`, ids like `600066-CN`) for "monthly vehicle sales and production". StreetAccount headlines give sales, and the content gives production, both with year-ago figures;
  - page through all years, since a result set can be truncated and saved to file;
  - every month must match, or the difference must be explained.
  - **Known quirk:** a FactSet headline can swap sales and production (it happened for Jan-2024). Confirm it with the next year's year-ago figure and the company announcement, then note it.
- **Gaps:** fill missing months from FactSet, and note it. Where only YTD totals exist, derive a month as YTD − prior months, mark it orange as calculated, and check it against the monthly total.
- **Third-party splits** can't be verified by FactSet. Fix them so they sum:
  - **domestic = total − exports, as a formula.** Note where the source's original domestic figure differed;
  - if one figure breaks an identity across several series (e.g. exports vs 大中 − domestic 大中), correct the single inconsistent number and note why.
- **Web:** use it for half-year and quarterly totals published in broker monthly reviews (e.g. gelonghui), and for annual-report export totals.

## 3. Build

Blocks, each with a title bar and a source line:
1. **Monthly production and sales.** Columns: total, by length, domestic, domestic 大中, exports, NEV, conventional exports (formula), shares (formula), industry exports. Then FactSet sales and production, and a difference column (formula).
2. **Quarterly:** SUM formulas over the monthly block.
3. **Annual reconciliation vs the annual report** (formula links to the annual-report figures). Total sales should show 0 difference. Third-party export and NEV differences are shown, not spread across months.
4. **Regional or customs data:** totals are SUM formulas of the parts, with a note where the source total was rounded.
5. **Broker volume forecasts:** grey, as reference.

Number colours: blue = source, black = formula, orange italic = calculated by you, grey = third party. Difference columns use green/red conditional formatting.

## 4. Retire old tabs, verify, report

- Delete the old Monthly/Quarterly tabs only when all of the following hold:
  - every series is in the Data tab;
  - nothing references them;
  - you've told the user where their old figures differed from the consolidated ones.
- Check for the Excel lock file, back up, then save.
- Verify by evaluating the identities in Python (or with `../revenue-projection-build/scripts/calc_check.py`): 0 breaks, and only the intended sheets changed.
- Report:
  - the blocks;
  - which sources won each conflict;
  - the FactSet match count;
  - what was calculated or derived;
  - what can't be verified (third-party splits);
  - the backup path.
