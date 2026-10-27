import os, shutil, sys
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as L

MODEL = r"C:\Users\Alan Cao\Desktop\Companies\宇通\宇通客车 1015.xlsx"
SCR = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(os.path.dirname(MODEL), "~$宇通客车 1015.xlsx")):
    sys.exit("model open in Excel")
shutil.copy2(MODEL, os.path.join(SCR, f"宇通客车 1015.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx"))

wb = openpyxl.load_workbook(MODEL)
ws = wb["Data"]

fill = lambda c: PatternFill("solid", fgColor=c)
TITLE_FILL, TITLE_FONT = fill("1F3864"), Font(name="Arial", size=11, bold=True, color="FFFFFF")
SRC_FILL, SRC_FONT = fill("F2F2F2"), Font(name="Arial", size=8, italic=True, color="595959")
BAND = fill("F3F6FA")
TOTAL_FILL = fill("DDEBF7")
thin, med = Side(style="thin", color="BFBFBF"), Side(style="medium", color="1F3864")
hair = Side(style="hair", color="D9D9D9")
# header colour per column group (monthly block); other blocks use the default
GROUPS_MONTHLY = [(3, 7, "2F5597"), (8, 12, "1F4E78"), (13, 19, "375623"), (20, 20, "7F6000"),
                  (21, 23, "843C0C"), (24, 24, "595959")]
GROUPS_QTR = [(3, 5, "1F4E78"), (6, 12, "375623")]
GROUPS_ANN = [(3, 5, "1F4E78"), (6, 8, "375623"), (9, 11, "548235"), (12, 14, "2F5597")]
DEFAULT_HDR = "1F4E78"

def last_col(r):
    c = ws.max_column
    while c > 2 and ws.cell(r, c).value is None:
        c -= 1
    return c

# locate blocks: title rows start with 一、二、二b、三、四、五
titles = [r for r in range(1, ws.max_row + 1)
          if isinstance(ws.cell(r, 2).value, str) and ws.cell(r, 2).value[:2] in ("一、", "二、", "二b", "三、", "四、", "五、")]
blocks = []
for t in titles:
    hdr = t + 2
    end = hdr
    while end + 1 <= ws.max_row and ws.cell(end + 1, 2).value not in (None, "") \
            and not str(ws.cell(end + 1, 2).value).startswith("合计改为"):
        end += 1
    blocks.append((t, hdr, end, last_col(hdr)))

# sheet title + legend
ws.cell(1, 2).font = Font(name="Arial", size=14, bold=True, color="1F3864")
ws.cell(2, 2).font = Font(name="Arial", size=9, color="595959")
ws.cell(2, 2).value = ("读表：深蓝条=板块标题；表头颜色区分数据组（产量 / 分车型销量 / 内外销 / 行业 / FactSet核对）；"
                       "数字颜色：蓝=来源数据，黑=公式，橙色斜体=推算，灰=第三方估算/预测；差异列：绿=0，红=有差异。")

for t, hdr, end, lc in blocks:
    name = ws.cell(t, 2).value
    groups = GROUPS_MONTHLY if name.startswith("一、") else GROUPS_QTR if name.startswith("二、") else \
        GROUPS_ANN if name.startswith("二b") else []
    # title bar + source line across the block width
    for c in range(2, lc + 1):
        ws.cell(t, c).fill = TITLE_FILL
        ws.cell(t + 1, c).fill = SRC_FILL
    ws.cell(t, 2).font = TITLE_FONT
    ws.cell(t + 1, 2).font = SRC_FONT
    ws.row_dimensions[t].height = 20
    # header
    for c in range(2, lc + 1):
        col = DEFAULT_HDR
        for a, b, g in groups:
            if a <= c <= b:
                col = g
        cell = ws.cell(hdr, c)
        cell.fill = fill(col)
        cell.font = Font(name="Arial", size=9, bold=True, color="FFFFFF")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(left=thin, right=thin, top=thin, bottom=med)
    ws.row_dimensions[hdr].height = 32
    group_starts = {a for a, b, g in groups}
    # body
    for i, r in enumerate(range(hdr + 1, end + 1)):
        label = str(ws.cell(r, 2).value)
        is_total = (ws.cell(r, 2).font.b and not name.startswith(("一、", "二、", "二b"))) or label in ("海关合计",) \
            or name.startswith("二b")
        year_break = (name.startswith("一、") and label.endswith("-01")) or (name.startswith("二、") and label.endswith("Q1"))
        for c in range(2, lc + 1):
            cell = ws.cell(r, c)
            if is_total:
                cell.fill = TOTAL_FILL
            elif i % 2 == 1:
                cell.fill = BAND
            top = med if year_break else hair
            left = thin if c in group_starts or c == 2 else None
            cell.border = Border(top=top, bottom=hair, left=left, right=thin if c == lc else None)
            if c >= 3 and cell.alignment.horizontal is None:
                cell.alignment = Alignment(horizontal="right")
        ws.cell(r, 2).alignment = Alignment(horizontal="left", indent=1 if label.startswith("  ") else 0)
        if is_total:
            ws.cell(r, 2).font = Font(name="Arial", size=9, bold=True, color="1F3864")
    # bottom edge
    for c in range(2, lc + 1):
        b0 = ws.cell(end, c).border
        ws.cell(end, c).border = Border(top=b0.top, left=b0.left, right=b0.right, bottom=med)

    # difference columns: green when 0, red when non-zero
    diff_cols = [c for c in range(3, lc + 1) if "差异" in str(ws.cell(hdr, c).value)]
    for c in diff_cols:
        rng = f"{L(c)}{hdr+1}:{L(c)}{end}"
        tl = f"{L(c)}{hdr+1}"
        ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER({tl}),{tl}<>0)'],
                                      fill=fill("FFC7CE"), font=Font(color="9C0006", bold=True)))
        ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER({tl}),{tl}=0)'],
                                      fill=fill("E2EFDA"), font=Font(color="375623")))

# notes rows under blocks
for r in range(1, ws.max_row + 1):
    v = ws.cell(r, 2).value
    if isinstance(v, str) and v.startswith("合计改为"):
        ws.cell(r, 2).font = SRC_FONT

# notes column in monthly block: highlight rows that carry a note
t, hdr, end, lc = blocks[0]
for r in range(hdr + 1, end + 1):
    n = ws.cell(r, 24)
    if n.value:
        n.fill = fill("FFF2CC")
        n.font = Font(name="Arial", size=8, color="7F6000")

ws.sheet_view.showGridLines = False
ws.sheet_view.zoomScale = 90
ws.column_dimensions["B"].width = 24
wb.calculation.fullCalcOnLoad = True
wb.save(MODEL)
print("styled blocks:", [(ws.cell(t, 2).value[:8], hdr, end, lc) for t, hdr, end, lc in blocks])
