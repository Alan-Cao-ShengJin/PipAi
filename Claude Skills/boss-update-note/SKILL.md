---
name: boss-update-note
description: Draft a short plain-Chinese update note to the user's boss 郄总 on a company — results and the management call, monthly industry data, or a call with management — with every number checked against the model and sources, kept to the points that decide the view, and saved in the company's 建模记录\给老板的笔记 folder. Use whenever the user asks for a note, write-up, summary or 汇报 for 郄总 (or "my boss"), or asks to check, tighten or redo a note they're writing to him.
---

# Note to 郄总

The user sends short Chinese update notes to their boss. They edit the draft heavily, so the job is a clean, correct first draft, then fast, careful checking of each version they paste back.

## Save every version

- Path: `<公司>\建模记录\给老板的笔记\YYYY-MM-DD_致郄总_<主题>.md`.
- Drafts: title line marked 草稿 (and v2, v3… for rewrites), then a `>` source line listing every source and how any derived number was calculated.
- The user's final text: saved word for word as `…_定稿.md`, even where you suggested changes.

## Tone

- Plain first-person paragraphs; no headings or bullet lists in the note itself.
- Opening: "郄总，<公司>三季报和<时间>的交流会和您汇报一下。" (for a call: "郄总，我和<公司>的<人>聊了一下"). A one-line conclusion is optional; if you include one, the body must support it.
- Paragraph lead-ins the user uses: 三季度… / 四季度方面 / 2027年方面 / 估值上 (or 成本方面 / 收入和盈利方面 / 展望).
- One step per sentence. The user rewrote dense passages as "too dense, too long, too hard to understand": say "今年利润（不算这笔费用）增长10%", not "扣除股份支付前归母+10%（约18.1亿元）".
- Lead with what happened and what management said. Don't turn every paragraph into "模型里……" commentary.
- Minor lines get a brief aside or are cut.

## Content (results note)

Keep only what decides the view ("only the most important deal breaker items"):
1. **The quarter:** revenue, NI, GM with YoY; what drove growth and what dragged, with one number each. If the user has a data tracker, add **one matched pair**: what the data showed before the results vs the reported figure for the same thing (e.g. "商会数据（10月21日）：250cc以上三季度出口+46%；对应三季报实际无极出口收入同比+40%"). Don't add explanations of the gap.
2. **The swing item for this year** (often the last quarter): last year's same quarter and why; what management said about this year; what anchors our forecast (e.g. an incentive KPI); our full-year number with the YTD actual so the quarter can be worked out.
3. **Next year, forward-looking only:** management's stated direction and timing (look up event dates); the two or three biggest profit contributors (rank them by contribution to the GP increase in the model); for each, management's expectation, then our model assumption split into volume and price; our NI and growth, with what's deducted (e.g. the incentive expense, labelled as our estimate if the company didn't disclose it).
4. **Valuation:** price and date; P/E FY1/FY2; dividend yield at the payout ratio; the nearest peer's multiple; position on the stock's own 5-year band; the price move behind the view (from FactSet daily data); sell-side gap with the real reason.

Monthly data notes: lead with exports and the company, compare the peers on the same basis (month, quarter, YTD; YoY and share), and flag data gaps (which broker hasn't updated) in one line.

## Check every version the user sends back

Recompute each number from the model or the source before saying it's fine. Things that went wrong before:
- **Rounding that breaks arithmetic:** "前9个月为15亿元" next to "四季度1.6亿、全年17亿" (use 15.4).
- **Close vs intraday lows:** "回弹约40%" holds from the intraday low (10.84) but is 35% from the closing low (11.30); say which.
- **Understated claims:** "有些卖方…更高" when all brokers are about 20% higher.
- **The wrong main reason:** the incentive expense explained only about a third of the gap to consensus; the base year explained the rest.
- **An opening claim the body no longer supports** after the user cut a paragraph.
- **Typos and stray line breaks** from pasting (e.g. "会的利润会").
- **Management quotes:** don't drop qualifiers that change the meaning ("在基数小的时候保持50%增速").

Reply with: the full current text first, then a short list of fixes, each with the number it's based on. Save the file before replying.

## Example

- `references/longxin_3q26_final.md`: the user's final 隆鑫 3Q26 results note (the target format and length).
- `references/moto_monthly_data_example.md`: a monthly industry-data note (250cc以上 exports, three companies, 隆鑫).
