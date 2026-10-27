# `_shared/` — utilities shared across skills

This is not a skill; it is a library that the skills call. Everything here exists **in one copy only**: changing it changes every report.

Note: these modules generate Chinese-language reports and check for Chinese section headings; literal Chinese strings in the code examples below are kept in the original with English glosses.

| File | What it does | Who uses it |
|---|---|---|
| `preflight.py` | Pre-work health check: dependencies / Chinese font / shared modules / DCF regression / **AlphaPai (Alpha派) authentication** / whether the target company has a 3S (three-statement) model and local call notes | Run manually before starting each company |
| `report_emit.py` | `Report` object: blocks → DOCX + HTML. **The only implementation of the house style** | Steps ③④ when producing reports |
| `report_check.py` | Turns the HARD RULES in each SKILL.md into assertions that can fail | Steps ③④ before and after saving to disk |
| `report_charts.py` | Charts (up = red, down = green; Microsoft YaHei 微软雅黑), returns PNG bytes | Steps ③④ when a chart is needed |

## Why this directory exists

The layout rules (Microsoft YaHei / body 10pt / tables 9pt / 3pt before and after each paragraph / no empty paragraphs) used to be **written as prose in two SKILL.md files**, and a new renderer was written from scratch for every report. The result:

- The same bug ("empty table runs pollute the font check") was hit independently twice (the second time with 898 occurrences);
- The Penetrating Narrative `generate_report.py` set the font to SimHei/KaiTi 9.5pt, **contradicting its own SKILL.md**;
- Word-count minimums, source markers and paragraph length were all checked by eye, and non-compliance was found only just before delivery every time.

Rules written as prose drift; rules written as code do not. So: **SKILL.md explains "why"; `_shared/` guarantees "what".**

## Minimal usage

```python
import sys; sys.path.insert(0, '<...>/.claude/skills/_shared')
from report_emit import Report
from report_charts import bar_yoy
from report_check import check_blocks, check_docx, report

R = Report('某公司 000000.SZ 穿透叙事分析', '截至 2026-08-06 收盘 · 人民币亿元')
R.h1('摘要'); R.p('……')
R.cap('表1  基础信息'); R.table(['项目','数值'], [['收盘价','8.86']])
R.p('【表1 论证】……')
R.chart(bar_yoy(['FY24','FY25'], [12.3, -4.1], pct=True), '图1  归母净利润同比')

bad = check_blocks(R.blocks, core_tables={'表2','表3'})
if bad: report(bad); raise SystemExit(1)
R.docx('out.docx'); R.html('out.html')
report(check_docx('out.docx'))
```

(Glosses: 某公司 … 穿透叙事分析 = "Company X 000000.SZ Penetrating Narrative analysis"; 截至 … 收盘 · 人民币亿元 = "as of the 2026-08-06 close · RMB 100 million"; 摘要 = Abstract; 表1 基础信息 = Table 1 Basic information; 项目/数值/收盘价 = Item / Value / Closing price; 【表1 论证】 = [Table 1 argument]; 图1 归母净利润同比 = Figure 1 YoY net profit attributable to parent.)

Penetrating Narrative uses `penetrate-narrative-stock-analysis/scripts/build_report.py` directly; it already wires the above together, and **refuses to write to disk if the self-check fails**.

## Block types

`h1` `h2` `h3` `p` `quote` `cap` `note` `table` `chart` `pagebreak`

- `cap` is a table/figure caption. `report_check` uses it to split sections and decide whether "this table's argument has enough words", so **every table must be preceded by a `cap`**, otherwise that table is not checked.
- `quote` also counts as a "table" (among the 17 tables in SKILL.md, Tables 4/7/9/11/15 are quote blocks) and has the same 300-character argument minimum.
- `note` holds restated calculations (`市值 = 8.86 × 5.5963 = 49.58 亿元`, i.e. market cap = 8.86 × 5.5963 = RMB 4.958bn), in 8pt grey text.

## Three pitfalls to avoid

1. **Do not write Markdown.** The renderer does not parse it; `**bold**` is printed literally. The checker blocks it.
2. **Do not write `[source:N]` / institution name · title · date.** From v3.0.0 reports show no sources anywhere. The checker blocks it.
3. **One table, one argument.** Two tables sharing one argument paragraph is non-compliant.

## Before changing anything here

The font / font size / spacing in `report_emit.py` are HARD RULES for four skills. Before changing them, make sure the corresponding clauses in each SKILL.md are changed too; otherwise code and documentation will conflict again — which is exactly the problem this directory exists to eliminate.
