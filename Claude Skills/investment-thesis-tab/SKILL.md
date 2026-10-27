---
name: investment-thesis-tab
description: Add or refresh a concise 投资逻辑 (investment thesis) tab in a company model covering why we invest, target price, upside (plus dividend yield and total return), and what would invalidate the thesis, with the valuation table linked live to the model's EPS/DPS and the latest price from FactSet. Use whenever the user asks for an investment thesis, 投资逻辑, why we own it, target price/upside, bull case, thesis breakers or kill criteria for a stock they model — even phrased as "add a tab for why we invest".
---

# Investment thesis tab

The user wants it **very concise**: short, specific Chinese sentences with numbers from the model, never generic claims. Style per `../revenue-projection-build/references/house-style.md` (KaiTi, blue section bars, purple-on-nude inputs, gridlines off).

## Inputs

- **Model outputs:** 3S EPS and DPS for FY1–FY2; the projection tab's segment shares, unit profits and margins; the cash position from the latest report or call.
- **Latest close:** `FactSet_GlobalPrices` (`prices`, the last few days). Note the date.
- **Consensus:** `FactSet_EstimatesConsensus` `consensus_rolling` `PRICE_TGT` (`NTMA`) for mean and range; `consensus_fixed` `NET_INC` FY1–FY2.
- **Valuation method:** use the target-price method already in the user's 3S (e.g. `Target Price = 15 × EPS`). Don't invent a new method or change their inputs. Flag stale inputs instead, e.g. a share price in 3S that is out of date.
- **Historical multiple context:** the stock's own **5-year forward P/E band** (mean, ±1SD, ±2SD), shown **as a chart** in a separate 估值区间 tab, not just a table. The user asked for the band "as a graph". Worked example (隆鑫): `references/longxin_pe_band_data.py` and `references/longxin_pe_band_chart.py`.
  - Monthly: FactSet month-end price (`GlobalPrices`, `frequency: AM`) ÷ consensus NTM EPS (`consensus_rolling`, `EPS`, `periodicity: NTMA`, PIT monthly).
  - Consensus NTM EPS can have gaps or come from a single broker in early years. Compute the band statistics from consensus months only, and show realized NTM EPS (actual quarterly EPS spread across months) as a reference series.
  - Plot the model's own NTM P/E as a marker and state its SD position. Stats use `AGGREGATE` because chart gaps are `NA()`.
- **Peer P/E** for FY1 and FY2 at the latest close ÷ FactSet consensus EPS (formulas like `=290.99/19.45538` so the inputs stay visible). Note peers with a single estimate.
- **Sell-side targets:** for each broker target, work out the multiple and year it rests on (target ÷ consensus EPS of each year, or the report's own "给予2026年19倍PE"). A broker saying a stock is "27年仅12倍" is quoting price ÷ its own EPS, not a target multiple, so check whose earnings it uses.
- **Recent price path:** pull daily FactSet prices for "rebounded X% from the low" claims. State whether the low is a close or intraday (隆鑫: June close low 11.30 → +35%, intraday 10.84 → +40%).

## Layout (three sections)

1. **一、为什么投资:** at most 5 numbered one-line points. Each states a driver and its number from the model: profit engine and its share of profit, structural growth runway, the margin strategy, cash and dividend support, and valuation vs history and vs consensus earnings.
2. **二、目标价与上涨空间:** a table with columns 项目 | 数值 | 说明:
   - current price (purple input, with date);
   - FY1/FY2 EPS (formulas to 3S);
   - target multiple (purple input). It may be a formula to the 3S peer average; the user may overwrite it with a typed number (隆鑫: 15x replacing the peer average). Never reset a typed multiple; say what it implies (SD position on the band, nearest peer);
   - **target price (formula);**
   - **upside (formula);**
   - FY1 DPS and dividend yield (management's announced total when given; otherwise EPS × payout). Add FY2 at the stated payout ratio;
   - total return = upside + yield;
   - current P/E;
   - grey reference rows for the consensus target price (mean and range) and consensus NI vs ours.
3. **三、什么会证伪我们的逻辑:** at most 5 numbered points. Each is observable and has a threshold, linked to a model assumption (e.g. "出口新能源毛利率跌破35% → 2027E净利润约−5亿元", "分红率降至70%以下", "全年出口指引未完成").

## Finish

- Check for the Excel lock file, back up, write the tab after Guidance, and set `fullCalcOnLoad`. With charts or x14 formats in the workbook, write through Excel COM (worked example: `references/longxin_write_thesis_com.py`; the 估值区间 band chart: `references/longxin_pe_band_chart.py`).
- Evaluate it with `../revenue-projection-build/scripts/calc_check.py` to read the computed target price, upside and yield, and confirm no other tab changed.
- In chat, give the three sections compactly with the computed numbers. Note any stale input you deliberately didn't touch.
