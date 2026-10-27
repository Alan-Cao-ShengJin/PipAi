# -*- coding: utf-8 -*-
"""共享报告渲染器 —— 四个报告类 skill 共用一套 house style，只此一份。

用法（skill 侧只负责产出 blocks，不碰排版）：

    import sys; sys.path.insert(0, '<skills>/_shared')
    from report_emit import Report

    r = Report('国光股份002749 穿透叙事', '截至 2026-08-03 收盘 · 单位：亿元')
    r.h1('摘要'); r.p('……')
    r.cap('表1  基础信息'); r.table(['项目','数值'], [['收盘价','8.86']])
    r.note('市值 = 8.86 × 5.5963 = 49.58 亿元')
    r.docx('out/x.docx'); r.html('out/x.html')

house style（HARD RULES，与各 SKILL.md 一致，改这里就是改全部报告）：
  · 全文微软雅黑，含 w:eastAsia 绑定（不绑定中文会回退宋体）
  · 正文 10pt / 表格 9pt
  · 每个正文段落 段前=段后=3磅，段落之间不留空段落
  · 每段 ≤6 行（≈150 汉字），超长由 validate() 报出
  · 表格 cell.text='' 留下的空 run 会污染字体校验，存盘前统一清除
"""
import base64
import html as _html
import io
import os
import re

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

# --- UTF-8 stdout (Windows cp1252 consoles mangle CJK without this) ---
import sys as _sys
try:
    _sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    _sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

FONT = '微软雅黑'
BODY, TBL = Pt(10), Pt(9)
HEAD = {1: Pt(17), 2: Pt(13.5), 3: Pt(11.5)}
ACCENT = RGBColor(0x1F, 0x3C, 0x5F)
GREY = RGBColor(0x66, 0x66, 0x66)
DARK = RGBColor(0x33, 0x33, 0x33)
ZEBRA = 'F2F5F9'
HDR_BG = '1F3C5F'

# 中国股市惯例：涨红跌绿。图表与文字标色都用这两个常量，不要另起。
UP_RED = '#C0392B'
DOWN_GREEN = '#1E8449'
NEUTRAL_BLUE = '#1F3C5F'

PARA_CHARS = 150   # ≈6 行（微软雅黑 10pt、A4 页宽）
PARA_HARD = 330    # 超过这个数一定要拆；150-330 之间给告警


# ============================ 低层 DOCX 工具 ============================

def _font(run, size, bold=False, color=None):
    """设置 run 的字体。必须显式绑定 w:eastAsia，否则中文回退宋体。"""
    run.font.name = FONT
    run.font.size = size
    run.font.bold = bold
    if color is not None:
        run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rf = rPr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rPr.append(rf)
    for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rf.set(qn(a), FONT)


def _sp(p, before=3, after=3, line=1.15):
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = line


def _shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement('w:shd')
    sh.set(qn('w:val'), 'clear')
    sh.set(qn('w:fill'), hexcolor)
    tcPr.append(sh)


def _strip_empty_runs(doc):
    """清掉 cell.text='' 留下的空 run —— 它们没有字体属性，会让字体校验报出
    几百个 '未设字体' 的假阳性（002749 那次是 898 个）。"""
    n = 0
    for t in doc.tables:
        for row in t.rows:
            for c in row.cells:
                for para in c.paragraphs:
                    for r in list(para.runs):
                        if not r.text:
                            r._element.getparent().remove(r._element)
                            n += 1
    return n


# ============================ 报告对象 ============================

class Report:
    """按顺序收集 block，最后一次性渲染成 DOCX / HTML。

    block 种类：h1 h2 h3 p quote cap note table chart pagebreak
    """

    def __init__(self, title, subtitle=''):
        self.title = title
        self.subtitle = subtitle
        self.blocks = []

    # -- 收集 --------------------------------------------------------
    def h1(self, t): self.blocks.append(('h1', t)); return self
    def h2(self, t): self.blocks.append(('h2', t)); return self
    def h3(self, t): self.blocks.append(('h3', t)); return self
    def p(self, t): self.blocks.append(('p', t)); return self
    def quote(self, t): self.blocks.append(('quote', t)); return self
    def cap(self, t): self.blocks.append(('cap', t)); return self
    def note(self, t): self.blocks.append(('note', t)); return self
    def pagebreak(self): self.blocks.append(('pagebreak', None)); return self

    def table(self, heads, rows):
        self.blocks.append(('table', (list(heads), [list(r) for r in rows])))
        return self

    def chart(self, png_bytes, caption=''):
        """png_bytes 由 report_charts 产出。DOCX 走 add_picture，HTML 走 data URI。"""
        self.blocks.append(('chart', (png_bytes, caption)))
        return self

    def extend(self, blocks):
        self.blocks.extend(blocks)
        return self

    # -- DOCX --------------------------------------------------------
    def docx(self, path):
        doc = Document()
        st = doc.styles['Normal']
        st.font.name = FONT
        st.font.size = BODY
        st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
        for s in doc.sections:
            s.left_margin = s.right_margin = Cm(2.2)
            s.top_margin = s.bottom_margin = Cm(2.0)

        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _sp(p, 0, 4)
        _font(p.add_run(self.title), Pt(20), True, ACCENT)
        if self.subtitle:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            _sp(p, 0, 10)
            _font(p.add_run(self.subtitle), Pt(10.5), False, RGBColor(0x55, 0x55, 0x55))

        for kind, payload in self.blocks:
            if kind in ('h1', 'h2', 'h3'):
                lvl = int(kind[1])
                q = doc.add_paragraph()
                _sp(q, 9 if lvl == 1 else 7, 4)
                _font(q.add_run(payload), HEAD[lvl], True, ACCENT)
            elif kind == 'p':
                q = doc.add_paragraph()
                _sp(q)
                q.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                _font(q.add_run(payload), BODY)
            elif kind == 'quote':
                q = doc.add_paragraph()
                _sp(q, 3, 3)
                q.paragraph_format.left_indent = Cm(0.6)
                _font(q.add_run(payload), BODY, True, ACCENT)
            elif kind == 'cap':
                q = doc.add_paragraph()
                _sp(q, 6, 2)
                _font(q.add_run(payload), Pt(9.5), True, DARK)
            elif kind == 'note':
                q = doc.add_paragraph()
                _sp(q, 1, 5)
                _font(q.add_run(payload), Pt(8), False, GREY)
            elif kind == 'pagebreak':
                doc.add_page_break()
            elif kind == 'chart':
                png, capt = payload
                q = doc.add_paragraph()
                q.alignment = WD_ALIGN_PARAGRAPH.CENTER
                _sp(q, 4, 2)
                q.add_run().add_picture(io.BytesIO(png), width=Cm(15.5))
                if capt:
                    c = doc.add_paragraph()
                    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _sp(c, 1, 6)
                    _font(c.add_run(capt), Pt(8.5), False, GREY)
            elif kind == 'table':
                heads, rows = payload
                t = doc.add_table(rows=1, cols=len(heads))
                t.style = 'Table Grid'
                t.alignment = WD_TABLE_ALIGNMENT.CENTER
                for i, hd in enumerate(heads):
                    c = t.rows[0].cells[i]
                    c.text = ''
                    pp = c.paragraphs[0]
                    _sp(pp, 1, 1)
                    pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _font(pp.add_run(str(hd)), TBL, True, RGBColor(0xFF, 0xFF, 0xFF))
                    _shade(c, HDR_BG)
                for r_i, row in enumerate(rows):
                    cells = t.add_row().cells
                    for i, v in enumerate(row):
                        c = cells[i]
                        c.text = ''
                        pp = c.paragraphs[0]
                        _sp(pp, 1, 1)
                        pp.alignment = (WD_ALIGN_PARAGRAPH.LEFT if i == 0
                                        else WD_ALIGN_PARAGRAPH.RIGHT)
                        _font(pp.add_run(str(v)), TBL, str(v).startswith('★'))
                        if r_i % 2 == 1:
                            _shade(c, ZEBRA)

        _strip_empty_runs(doc)
        os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
        doc.save(path)
        return path

    # -- HTML --------------------------------------------------------
    def html(self, path):
        o = ['<title>%s</title>' % _html.escape(self.title),
             '<style>%s</style>' % CSS,
             '<div class="wrap">',
             '<h1>%s</h1>' % _html.escape(self.title)]
        if self.subtitle:
            o.append('<div class="sub">%s</div>' % _html.escape(self.subtitle))
        for kind, payload in self.blocks:
            if kind == 'h1':
                o.append('<h2>%s</h2>' % _html.escape(payload))
            elif kind in ('h2', 'h3'):
                o.append('<h3>%s</h3>' % _html.escape(payload))
            elif kind == 'p':
                o.append('<p>%s</p>' % _html.escape(payload))
            elif kind == 'quote':
                o.append('<blockquote>%s</blockquote>' % _html.escape(payload))
            elif kind == 'cap':
                o.append('<div class="cap">%s</div>' % _html.escape(payload))
            elif kind == 'note':
                o.append('<div class="note">%s</div>' % _html.escape(payload))
            elif kind == 'pagebreak':
                o.append('<hr class="pb">')
            elif kind == 'chart':
                png, capt = payload
                b64 = base64.b64encode(png).decode('ascii')
                o.append('<figure><img src="data:image/png;base64,%s" alt="%s">'
                         % (b64, _html.escape(capt)))
                if capt:
                    o.append('<figcaption>%s</figcaption>' % _html.escape(capt))
                o.append('</figure>')
            elif kind == 'table':
                heads, rows = payload
                o.append('<div class="tw"><table><thead><tr>')
                o += ['<th>%s</th>' % _html.escape(str(h)) for h in heads]
                o.append('</tr></thead><tbody>')
                for row in rows:
                    o.append('<tr>' + ''.join('<td>%s</td>' % _html.escape(str(v))
                                              for v in row) + '</tr>')
                o.append('</tbody></table></div>')
        o.append('</div>')
        os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(o))
        return path

    # -- 自检 --------------------------------------------------------
    def validate(self, **kw):
        from report_check import check_blocks
        return check_blocks(self.blocks, **kw)


CSS = """
:root{--bg:#fff;--fg:#1a1a1a;--mut:#5b6570;--ac:#1f3c5f;--ln:#dfe4ea;--hd:#1f3c5f;--zb:#f5f8fb}
@media(prefers-color-scheme:dark){:root{--bg:#14171a;--fg:#e6e8ea;--mut:#9aa4ae;--ac:#8fb4dd;--ln:#2c3238;--hd:#1e2b3a;--zb:#191d21}}
:root[data-theme=dark]{--bg:#14171a;--fg:#e6e8ea;--mut:#9aa4ae;--ac:#8fb4dd;--ln:#2c3238;--hd:#1e2b3a;--zb:#191d21}
:root[data-theme=light]{--bg:#fff;--fg:#1a1a1a;--mut:#5b6570;--ac:#1f3c5f;--ln:#dfe4ea;--hd:#1f3c5f;--zb:#f5f8fb}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font-family:"Microsoft YaHei",-apple-system,"Segoe UI",sans-serif;
line-height:1.75;margin:0;padding:32px 20px 72px;font-size:15px;overflow-x:hidden}
.wrap{max-width:980px;margin:0 auto}
h1{font-size:1.85em;color:var(--ac);margin:.2em 0 .1em;line-height:1.3}
h2{font-size:1.3em;color:var(--ac);margin:1.9em 0 .5em;padding-bottom:.3em;border-bottom:2px solid var(--ln)}
h3{font-size:1.08em;color:var(--ac);margin:1.5em 0 .4em}
.sub{color:var(--mut);font-size:.92em;margin-bottom:2em}
p{margin:.5em 0;text-align:justify}
blockquote{margin:.9em 0;padding:.7em 1em;border-left:3px solid var(--ac);background:var(--zb);
font-weight:600;color:var(--ac);border-radius:0 4px 4px 0}
.cap{font-weight:700;font-size:.95em;margin:1.5em 0 .4em;color:var(--fg)}
.note{font-size:.8em;color:var(--mut);margin:.3em 0 1em;line-height:1.6}
.tw{overflow-x:auto;margin:.3em 0 .6em;border:1px solid var(--ln);border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:.83em;min-width:520px}
th{background:var(--hd);color:#fff;font-weight:600;padding:7px 9px;text-align:right;white-space:nowrap}
th:first-child{text-align:left}
td{padding:6px 9px;text-align:right;border-top:1px solid var(--ln);white-space:nowrap}
td:first-child{text-align:left;white-space:normal;min-width:130px}
tbody tr:nth-child(even){background:var(--zb)}
figure{margin:1.2em 0;text-align:center}
figure img{max-width:100%;height:auto;border-radius:6px}
figcaption{font-size:.82em;color:var(--mut);margin-top:.5em}
hr.pb{border:0;border-top:1px dashed var(--ln);margin:2.4em 0}
"""
