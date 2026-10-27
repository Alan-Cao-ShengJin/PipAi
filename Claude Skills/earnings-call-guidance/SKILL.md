---
name: earnings-call-guidance
description: Read an earnings call / investor call transcript (业绩会、电话会、交流会纪要, often Chinese A-share or HK companies, often AI-transcribed in traditional Chinese), fact-check names, policies and events that speech-to-text may have garbled, pull out the guidance and anchor figures that matter for a financial model, compress the core guidance into short simple-Chinese sentences (dropping items management calls 影响不大), and write them into the model's Guidance tab. Use this whenever the user drops a call transcript or meeting notes next to a company model and asks for guidance, key numbers, takeaways, 指引, 核心要点, 纪要整理, "what did management say", or asks to update the Guidance tab — even if they don't say "skill" or name every step.
---

# Earnings call → core guidance

The user is an analyst who keeps one folder per company: a call transcript, annual reports, and an Excel model with a `Guidance` tab (often also a `问题` tab of their own call notes). After each results call they want:

1. The guidance and anchor figures from the call, with names and policies checked so nothing garbled gets into their notes.
2. The core guidance boiled down to a short list of plain Chinese sentences.
3. Those sentences written into the model's `Guidance` tab.

Steps 1–3 are analysis shown in chat. Steps 4–5 produce the Chinese summary and write it to the workbook.

## 1. Find the inputs

- Transcript: `.txt`, `.pdf`, `.docx`, or pasted text. If several transcripts exist, use the one the user names or the latest quarter.
- Workbook: the user's own model `.xlsx` (usually named after the company plus a date, e.g. `宇通客车 1015.xlsx`). Broker files (e.g. `…【国信汽车】….xlsx`) and monthly trackers are not the file to write into. If it is unclear which workbook is the model, ask.
- Read the workbook's `问题` and `Guidance` tabs (or any tab of call notes) for the fact-check in step 2. `scripts/dump_workbook.py` prints every non-empty cell:

  ```bash
  PYTHONIOENCODING=utf-8 python scripts/dump_workbook.py "<model.xlsx>" > <scratchpad>/dump.txt
  ```

## 2. Read the whole transcript and fact-check it

Read every line, including the Q&A. The most useful numbers often show up in follow-up answers (e.g. a CFO explaining why a quarter's ASP jumped).

AI-generated transcripts have known failure modes; handle them deliberately:

- **Garbled numbers.** Speech-to-text mangles figures ("180 28個億" was really 128亿). Many transcripts end with an AI summary (会议要点 / Q&A recap). Use it to cross-check, and when the body and summary disagree, say which figure you used and why. Don't silently pick one.
- **Misattributed speakers.** Lines labelled "发言人6" or the wrong person are common. Attribute to a role ("management", "CFO office") when unsure.
- **Contradictions inside management's answers.** If two executives give different numbers (e.g. "below 4%" then "below 2%"), report the range and the more specific/later statement.
- **Several notes of the same meeting** (e.g. two people's 纪要 of the 隆鑫 1023 call): read all of them, record in the Guidance tab's source column which note each item came from, and list anything only one note has. They also catch each other's errors: one 隆鑫 note labelled the 9M ATV revenue (8.56亿, +85%) as "Q3". Check every period label against the report.
- **Guidance repeated from an earlier call.** Note when it was first given ("半年报交流会已给过…"). If YTD already beats it, say so and work out the implied rest-of-year. A stale guide shouldn't go into the model literally (隆鑫 ATV "全年约50%" against 9M +85%).

### Fact-check names, events and policies

Speech-to-text replaces proper nouns with similar-sounding words that are real but wrong. The result reads fluently, so the error is easy to copy into the notes and pass on. Before using any proper noun, check that it fits this company's business, markets and the time of the call.

List every person, organisation, law/policy, subsidy fund, data source, competitor and place mentioned, and test each one:

- **Does it fit the question?** If an analyst asks about EU–China trade talks and the answer talks about "中美" and the US "IRA", the answer was probably about 中欧 and the EU **IAA** (Industrial Accelerator Act). A US-subsidy answer to an EU question is a red flag.
- **Is it plausible for this company?** Check against the company's markets, products, suppliers and data sources. For example, "中国网数据" for a bus maker is almost certainly 中客网 (chinabuses), the industry data source.
- **Does it recur in different forms?** One fund called "I基金", "RM基金" and "L基金" in the same answer is a single garbled name. Work out what it is (here: the EU **RRF**, Recovery and Resilience Facility, whose milestones ended 31 Aug 2026).
- **Are people's names right?** Executives' surnames are often swapped for homophones (唐总 → 汤玉祥, Yutong's chairman). Check against the annual report or company website.

Check in this order, stopping when a source settles it:

1. The user's own notes in the workbook (`问题` tab, previous `Guidance` content). The user often wrote down the correct term during the call.
2. The AI summary at the end of the transcript, and the speaker list at the top.
3. Company filings in the folder (annual reports, the quarterly report) for executive names, subsidiaries, suppliers and segments. If PDF text extraction isn't available (no `pypdf`/poppler), use web search for the same facts.
4. Web search for policies, laws, funds and dated events. Search in the language of the policy (Chinese for PRC policy, English for EU/US). Web search also fills in facts the call left out, such as an effective date (e.g. the export VAT rebate cut on NEVs, 13% → 9% from 1 Apr 2027).

Report the result in chat as a short table: transcript says | corrected to | evidence | confidence. Use the corrected term everywhere downstream. If you can't settle a term, leave it out of the Guidance tab or mark it 待核实. Never write a guess as fact.

## 3. Extract guidance and anchors

Separate three kinds of statement, because the user weights them differently in a model:

- **Explicit guidance**: a number management commits to (full-year volume, export target, growth rate).
- **Directional color**: no number, but a clear direction ("Q4 margin stays relatively high", "full-year tax rate similar to last year", "dividend habit maintained").
- **Derived figures**: numbers you calculate from figures in the call (implied Q4 = FY guide − YTD; market share from company and industry volumes). Label these as derived and show the inputs.

Cover these areas when the call touches them; skip any the call doesn't mention rather than padding:

- Volumes/revenue by segment, region, product (domestic vs export, NEV vs ICE, etc.), plus YTD actuals and YoY.
- Industry data cited (total market, segments, growth), and what it covers (e.g. 大中型 only, excluding light buses).
- Gross margin drivers, and whether management calls a move structural or one-off.
- ASP / price per unit anchors and why they moved.
- Opex, tax rate, other P&L lines with commentary.
- Cash, operating cash flow, capex, dividend policy.
- Policy/tariff/subsidy impacts, quantified where management gives a basis.
- Input costs (batteries, raw materials) and how pricing contracts work.
- Next-year outlook and when formal guidance will be published. If it's tied to an event (e.g. "米兰展回来再定"), look up the event's date (EICMA 2026: 3–8 Nov).
- **Cost timing and incentive plans:** remarks such as "绩效等人力费用与去年节奏一样", ESOP/股权激励 expense and the vesting KPI. These often decide the next quarter's profit more than revenue does.
- Timing/seasonality of deliveries.

Present step 2's fact-check table and step 3 in chat in English, with Chinese terms in brackets where they help. Use tables for numbers. Keep it compact.

## 4. Compress into core guidance (simple Chinese)

Write the core guidance as short simplified-Chinese sentences, even if the transcript is in traditional characters.

**Keep only what moves the model.** The tab is a short reference the user checks while updating forecasts, so every line should change a number or a key judgement in the model. Drop:

- Items management says have little or no effect: 影响不大, 影响有限, 波动不大, 不会有影响. Policies, input costs and logistics risks usually end up here.
- Wait-and-see items with no action or number ("政策落地前不采取行动").
- General reassurance with no number or direction ("经营情况正常", "竞争良性").
- Strategy talk that repeats every quarter (高端化, 差异化) unless it comes with a new number.

Keep an item that management calls minor only if the user has asked for a risk list, or if it has a concrete figure that changes a forecast line, and say why. List the dropped items in one line in chat so the user knows they were considered.

This usually leaves roughly 8–14 sentences under 3–6 short section headings (e.g. 销量, 毛利率, 税率, 现金与分红, 明年展望). Fewer is fine for a quiet call.

Each sentence should:

- State one fact or one piece of guidance, with the number if there is one.
- Read plainly: no hedged filler, no stacked adjectives, no analyst jargon management didn't use.
- Keep management's own qualifiers when they matter ("属于阶段性波动，不能当作趋势", "大概率", "约").
- Leave out your derived numbers. This tab records what management said.
- Use the fact-checked names and policies from step 2, not the transcript's version.

Show the sentences in chat before writing them.

## 5. Write to the Guidance tab

Write the sentences when the user has asked for the tab to be updated (or the original request included it). Otherwise show them in chat and offer to write.

Build a JSON file in the scratchpad:

```json
{
  "title": "宇通客车 3Q26 业绩会核心指引（2026-10-15）",
  "sections": [
    {"heading": "销量（全年目标不变）", "items": ["总销量约5万辆，同比基本持平。", "..."]},
    {"heading": "毛利率", "items": ["..."]}
  ]
}
```

Then run:

```bash
PYTHONIOENCODING=utf-8 python scripts/write_guidance.py "<model.xlsx>" <scratchpad>/guidance.json --backup-dir <scratchpad>
```

What the script does, so you can explain it and handle its errors:

- Refuses to run if the workbook is open in Excel (a `~$` lock file exists). Ask the user to close it.
- Refuses if the workbook contains charts or images, because openpyxl drops them on save. Don't use `--force`; write through Excel COM instead (worked example: `references/longxin_write_guidance_com.py`, which also adds a source column C naming the note each item came from).
- Copies the workbook to the backup directory before touching it.
- Clears the `Guidance` sheet (creates it if missing), writes the title in B2, then each bold section heading followed by numbered items (numbering runs across sections), Arial 10, and widens column B.
- Re-opens the saved file and compares every other sheet with the backup, ignoring float noise in the 15th significant digit. It prints any real differences.

The write replaces whatever was in the tab, so tell the user that the old notes were replaced and where the backup is. Report the verification result plainly: other tabs unchanged, or exactly which cells differ.

## Final message

Keep it short: what was written, where, the backup location, the verification result, any terms left as 待核实, and the one-line list of dropped minor items.

See `references/example.md` for a worked example (Yutong 3Q26) showing the fact-check table and the level of detail for steps 3–4.
