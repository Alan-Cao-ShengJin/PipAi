---
name: revenue-projection-build
description: Build or rebuild a company model's Revenue Projection tab as a quarterly, segment-level waterfall (guidance anchors → industry → volumes → unit prices → revenue → gross margin → per-vehicle/unit profit → annual-report calibration) that links into 3S, add the next forecast quarter (e.g. 4Q26E) to 3S with FY = YTD actual + forecast quarter, and review every purple assumption for logic against guidance, history and consensus. Use whenever the user asks to rebuild/redo/extend the revenue projection or 收入预测, make the forecast quarterly, compute 单车利润/unit economics, add a forecast quarter to 3S, or "check the purple assumptions" — even if they only say "rebuild the projection using the data and guidance".
---

# Revenue projection build (quarterly, segment-level)

The goal the user set: the tab is **a logical melting pot of guidance and existing data, broken into segments fine enough to assume at a logical level, then built back up into revenue**, so a PM can verify how the forecast is derived. It must be quarterly (quarters add up to the full year) and formatted cleanly.

Read `references/house-style.md` first and apply all of it. Two worked examples; reuse their structure, not their numbers:
- **宇通客车** (built from scratch): `references/yutong_build_rp.py` (the builder) and `references/yutong_build_3s_forecast_quarter.py` (the 3S forecast quarter).
- **隆鑫通用** (rebuilt on the user's existing tab, Excel COM because the workbook has x14 conditional formats):
  - `references/longxin_build_rp.py`: lean RP in the original tab's look; FY C–I, gap, quarters K–R, 重点 notes;
  - `references/longxin_audit_esop_q4cost.py`: ESOP expense row, back-loaded Q4 cost method, 2027 operating leverage;
  - `references/longxin_segment_resplit_kpi_cap.py`: segment re-split from half-year report + broker quarterly split; Q4 admin capped at the ESOP-KPI threshold.

**If the user already has a projection tab, it is the template.** Keep its row order, labels ("…增长" rows under each line), colours and section fills; put quarters in **columns** (FY block, gap, quarter block), never as extra row sections; keep it lean (no guidance-anchor/check/consensus/implied-ratio sections unless asked). The user rejected a detailed rebuild of 隆鑫 as "too much unnecessary stuff… follow the line, colour and overall theme of the original RP". The full 8-section architecture below is for a tab built from scratch.

## 1. Study before building

- Read the existing projection tab with formulas and styles. Note:
  - how assumptions are marked (purple + nude fill);
  - the section order and formats;
  - every link **into** the tab from other sheets (3S revenue/cost rows, Data reconciliation). They must be relinked after the rebuild.
- Read the inputs:
  - **Data tab:** quarterly volumes by segment.
  - **3S:** quarterly actuals for revenue, GP, expenses, ETR and NI.
  - **Guidance tab:** management's numbers and comments.
  - **Annual-report figures:** regional revenue and cost, volumes by length and region, NEV units. These are often in the old tab.
  - **Broker model in the folder:** look at how the broker segments the business and what unit profits it assumes.
- Get **FactSet consensus**:
  - `FactSet_EstimatesConsensus`, `consensus_fixed`, for `SALES` and `NET_INC` FY1–FY3;
  - `consensus_rolling` for `PRICE_TGT`, periodicity `NTMA`.

  Also pull the latest price (`FactSet_GlobalPrices`) and any quarterly revenue/NI the 3S tab lacks (`FactSet_Fundamentals` QTR `FF_SALES`, `FF_NET_INC`).
- **Check how fresh consensus is** (`consensus_fixed` with `startDate`/`endDate`, weekly): note the last change date and the `up`/`down` counts. Right after results it is usually pre-results. Compute **consensus-implied next quarter = consensus FY − YTD actual** and compare it with every same quarter in history (隆鑫: consensus implied 4Q26 NI 5.3亿 against 4Q of −2.7/−2.1/+2.2/+0.7亿 in 2022–25).
- **Broker notes after results** often give single-quarter segment revenue the company only discloses half-yearly (e.g. 天风's 3Q split for 隆鑫). Use them to build 9M by segment: half-year report + broker quarter. Check the broker's buckets sum to reported revenue and rebuild the prior-year base the same way.
- **Management incentive plans** (员工持股/股权激励 草案 and allocation announcements on cninfo): total expense, vesting tranches, and the KPI definition (often NI **before** share-based payment). Both feed the forecast (section 4).

## 2. Architecture

Columns: label, unit, FY columns (history → FY+2), gap, quarterly columns (≥ 2 years of history + forecast), gap, notes at the far right.

Sections, each feeding the next:
1. **指引与管理层锚点**: guidance numbers as purple inputs (FY volume targets, management price/margin remarks). The note links live to the Guidance tab (`=Guidance!B5`).
2. **行业**: annual industry history, the company's share, and the latest YTD industry data in notes.
3. **销量拆分**: the segments that drive economics (e.g. domestic 大中 / light, conventional exports, NEV exports).
   - **History:** links to Data.
   - **Current-year remaining quarter:** = FY guidance − YTD actual. Guidance is hit exactly, and a check row shows the gap to the total guide.
   - **Next years:** FY = prior × (1 + growth); the growth is a purple input with a note citing the guidance item or source.
   - **Forecast quarters:** = FY × seasonality, where seasonality is the average same-quarter share of the last three years. A purple formula.
4. **单价**: back-solve history from annual-report revenue split ÷ annual-report units.
   - Where a segment isn't disclosed, use a labelled guess.
   - Management's price remarks become quarter-level inputs.
   - FY = volume-weighted average of the quarters.
5. **收入**: volume × price per segment, plus "其他业务及口径差".
   - **History:** that line = actual revenue − segments, so it acts as the plug.
   - **Forecast:** a purple ratio of segment revenue, taken from the same quarter last year to keep seasonality.
   - **Total:** links to 3S.
6. **毛利**: segment GM, history back-solved from the annual report. The quarter-level inputs reflect management remarks.
   - Show "实际毛利（3S）" and a **差额（实际−模型）** calibration row. History residuals should be small; if not, fix the calibration.
   - GP total and cost link to 3S.
7. **计算单车利润** (the PM question):
   - per segment: unit revenue (reference the price row), unit GP, then unit opex = price × 3S expense ratio (allocated by revenue);
   - unit NP = (GP − opex) × (1 − ETR);
   - profit contribution = unit NP × volume.
   - Sum it, reconcile to 3S NI (the residual is other income, investment, FV, impairment and minorities), and show the broker's unit-profit assumptions alongside as reference.
8. **年报校准数据**: the annual-report inputs used above. Other tabs may link here.

Add grey reference rows for consensus revenue and NI.

## 3. 3S forecast quarter

Insert the next forecast quarter (e.g. `4Q26E`, row 2 `EST预测`) after the last actual quarter. Shift the 1H/9M blocks right and repoint every formula that referenced the moved columns.

- Revenue/cost: link to the projection's quarter column.
- Q4-seasonal costs (taxes & surcharges, selling, admin, R&D, impairments, non-operating): same quarter last year as a ratio of revenue, **unless costs are back-loaded** (bonus/performance accruals booked at year end, so 9M is low and Q4 heavy). Then a ratio understates Q4: use FY = last FY × (1 + YTD growth) and Q4 = FY − YTD (`=G14*Y14/X14-Y14`), and check it against management's remark on cost timing (隆鑫 1023: "绩效等人力费用与去年节奏一样").
- **Share-based payment:** put the expense on its own row (e.g. 3S row 233) with a schedule by year, worked out from vesting tranches and grant date. Graded vesting front-loads it: 隆鑫 3.70亿 over 40/30/30 tranches came to 1.11 / 1.88 / 0.61 / 0.10亿 for 2026–29. Say it is our estimate unless the company gives annual amounts; straight-line gives a lower first full year.
- Steady items (other income, investment gains, finance cost, JV income): YTD ÷ number of quarters.
- Fair value changes and disposals: 0.
- Tax: solved so the FY rate meets guidance (e.g. "全年税率和去年差不多").
- FY current year = YTD actual + forecast quarter for each flow line. Ratios become outputs.
- Purple font and a cell comment for each assumption in **3S**. In the **Revenue Projection** tab, never use cell comments: write the reasoning as text in the 重点 notes column on the same row (see house style).

## 4. Assumption logic review

Check every purple cell for the forecast years, and say what you changed and why. Typical traps:
- **One-offs carried forward:** FV gains/losses, credit-impairment reversals and asset disposals copied into later years. Set them to 0.
- **Stale halving or doubling:** "1H × 2" used when YTD actuals exist.
- **Tax rate:** not matching guidance.
- **Policy dates:** applied for the whole year when they start mid-year. Make them quarter-level (e.g. the export rebate cut from April).
- **Rebound after decline:** growth that bounces after a decline with no evidence. Prefer stabilisation.
- **Flat ratios:** ratios that destroy seasonality. Prefer same-quarter-last-year.
- **Consensus gap:** compare FY revenue/NI with consensus and explain the gap. Consensus can be stale right after results.
- **Implied remaining quarter of every annual input.** When the current-year FY is built from annual segment inputs and the last quarter = FY − YTD, a stale growth rate silently sets that quarter. For each segment, compute the implied quarter's YoY and compare it with the YTD trend. 隆鑫: 通机 −12% implied 4Q +36% while 9M was −26%; 发动机 +20% implied 4Q −17% while 9M was +32%.
- **Stale full-year guidance.** If YTD already exceeds the full-year guide, a literal reading implies a collapse in the last quarter. Check when the guide was set and whether anything supports a collapse; otherwise use the latest run-rate and say so in the note. 隆鑫 ATV: "全年约50%" was set at the interim call, 9M was +85%, so the literal guide meant 4Q −34%.
- **Incentive-plan consistency.** If the model expenses share-based payment on the assumption that it vests, forecast NI must meet the vesting KPI. Otherwise the model contradicts itself (either the KPI is met, or that tranche's expense isn't booked). Where management controls a year-end accrual, cap it at the KPI threshold (`=MAX(uncapped, threshold)`). Keep the trimmed amount on its own row and leave it out of next year's cost base.
- **Sell-side gap decomposition.** When the sell side is higher, split the gap into: base year (usually the remaining quarter), growth rate, items they leave out (share-based payment, year-end costs), and segment assumptions vs guidance. Say who is likely wrong on each point.

## 5. Verify and report

- Run `scripts/calc_check.py <model> --sheet "Revenue Projection" --cols C:I,K:AD --backup <backup>`. Require 0 errors in every sheet, and a diff showing only the intended tabs and relinks changed.
- Render the tab to PDF after each rebuild and look at it (house style). A 街车 volume ↔ share circular reference on 隆鑫 was caught this way.
- **Fixed text quoting model numbers** (问题 "模型当前假设", 投资逻辑 bullets, the RP notes) goes stale when the numbers move. Grep for the old values after every change and update them in the same write.
- Report briefly:
  - the structure;
  - the assumptions changed, as a table;
  - FY outputs vs consensus;
  - unit profit per segment vs the broker;
  - the residual quality;
  - what was relinked;
  - the backup path.
