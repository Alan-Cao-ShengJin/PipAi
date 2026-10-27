---
name: management-questions
description: Write a short list of questions for company management / IR that could change the model's key assumptions or the investment view, filtered against what the latest earnings call already covered, phrased so management will actually answer (direction and comparison, not order-level numbers), and lay them out in the model's 问题 tab as a table with the current model assumption and how to read each answer. Use whenever the user asks for questions to ask management, IR or the company, a 问题清单, "what should we ask", gaps in the model to clarify, or prep for a management meeting or call.
---

# Management questions

The user asks management few questions and wants every one to count. Each rule below came from the user rejecting an earlier draft.

## Selection rules

1. **Not already covered.** Read the latest call transcript and drop anything asked or answered there, including partly answered topics (e.g. the export rebate impact, US/EU policy, Q4 delivery confidence, next-year outlook, battery pricing, dividend policy). If the user's own notes in the 问题 tab answer part of a question, narrow it to the remaining gap.
2. **Must be able to change a key assumption or the view.** Rank by model sensitivity, using the model itself:
   - volume × unit profit;
   - GM points × segment revenue;
   - share of operating profit.

   Drop anything whose answer can't move FY+1 profit materially.
3. **Must fit the company's narrative.** Ask about what drives the equity story (e.g. overseas premium expansion, Europe as the profit engine, the domestic margin-over-share strategy). Skip accounting or balance-sheet line items (warranty provisions, contract liabilities, receivables discounting) and other obvious or time-wasting checks.
4. **Phrase it so management answers.** Management will say "每个订单都不一样" to requests for specific numbers. So:
   - ask for direction, comparison or trend on a full-year basis;
   - offer explicit options: 接近X还是明显低于X？提升、持平还是下降？比去年同期更好还是差不多？
   - comparing with an internal benchmark works well (e.g. "更接近国内业务，还是更接近出口新能源？").
5. Usually 3–5 questions. Fewer is better than padding.
   - Where the model and consensus differ most, that gap is usually question #1. For 隆鑫 3Q26 it was Q4 costs: whether the year-end accrual and the ESOP expense follow last year's pattern, against a consensus that implied no year-end costs. Ask it as a comparison with last year ("四季度费用和去年四季度比，多、差不多还是少？").
6. **Consequential and checkable at high frequency.** If the user has a recurring IR call (e.g. monthly for 三江), every question must be answerable each call: run-rate profit, input costs and freight, realised prices vs last month, operating mix, milestones on plan. Give each a per-month sensitivity and the model row it changes, and add month columns (purple inputs) for recording the answers. One-off strategic questions (placements, relocation plans) only count if they can be tracked as a monthly status.
7. **Simple to ask.** Write each question as one short spoken sentence with at most two asks (e.g. "聚丙烯现在赚钱吗？MTBE每吨还能赚500元左右吗？"). Numbers, answer options and sensitivities go in the 模型当前假设 / 怎么解读 columns, not in the question. Skip anything a market-data feed already shows.

## Output: the 问题 tab

Overwrite the tab only when asked. First read what's there, because it is often the user's own call notes. Mention that they're in the backup, and use any facts they contain.

Lay it out as a table, styled per `../revenue-projection-build/references/house-style.md` (KaiTi, blue header bar, alternating band, no borders, gridlines off, uniform row height with text wrapped inside cells):

| # | 主题 | 问题（问方向/对比，不问具体数字） | 模型当前假设 | 怎么解读答案 → 调整哪个假设 |

- **模型当前假设:** the specific number from the model, plus the broker's figure if it differs.
- **怎么解读答案:** map each likely answer to an action and a size, e.g. "接近→维持；明显低于→下调2028E新能源毛利，每1个点约-1.6亿毛利".
- **Title and source lines:** a one-line title and a grey source line explaining the filter.
- The 模型当前假设 column quotes model numbers, so update it whenever the model moves.

Check for the Excel lock file and back up before writing, and confirm no other sheet changed. If the workbook has charts or x14 formats, write through Excel COM (worked example: `references/longxin_write_questions_com.py`). In chat, show the table and say what was dropped and why, in one line.
