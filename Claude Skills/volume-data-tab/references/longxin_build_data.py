"""Step 2: copy tracker sheets into the model + build compact Data tab (quarters/years = SUM of months). Excel COM."""
import os, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(F, '隆鑫通用 1025.xlsx')
TRK = os.path.join(os.path.dirname(F), '摩托车三公司_月度出口内销_更新至26年9月.xlsx')
assert not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx')
shutil.copy2(MODEL, bk); print('backup', bk)


def L(n):
    s = ''
    while n:
        n, rem = divmod(n - 1, 26); s = chr(65 + rem) + s
    return s


def mcol(y, m):  # tracker month column (B = 2019-01)
    return L(2 + (y - 2019) * 12 + m - 1)


PER = [('2023', 2023, range(1, 13)), ('2024', 2024, range(1, 13)), ('2025', 2025, range(1, 13)), None] + \
      [(f'{q}Q{y % 100}', y, range(3 * q - 2, 3 * q + 1)) for y in (2024, 2025) for q in (1, 2, 3, 4)] + \
      [(f'{q}Q26', 2026, range(3 * q - 2, 3 * q + 1)) for q in (1, 2, 3)] + \
      [None, ('9M25', 2025, range(1, 10)), ('9M26', 2026, range(1, 10))]
COLS = [(p, 3 + i) for i, p in enumerate(PER)]
NOTE = COLS[-1][1] + 2
PCOL = {p[0]: c for p, c in COLS if p}
LAST = L(COLS[-1][1])


def agg(sh, r, y, ms):
    rng = f"'{sh}'!{mcol(y, ms[0])}{r}:{mcol(y, ms[-1])}{r}"
    return f'=IF(COUNT({rng})={len(ms)},SUM({rng}),"—")'


def prev_label(lab):
    if lab.isdigit(): return str(int(lab) - 1)
    if lab.startswith('9M'): return '9M' + str(int(lab[2:]) - 1)
    return lab[:3] + str(int(lab[3:]) - 1)


DL, DS, DE = 'Data 大排量', 'Data 小排量', 'Data 电动'
# (kind, key, label, unit, source, note); kinds: bar, blank, src (link to tracker row), sum (>250 + ≤250), yoy, share
S = [('bar', '一、隆鑫两轮燃油合计（>250cc + ≤250cc）'),
     ('sum', 'T整体', '整体', '台', ('L整体', 'S整体'), '9月≤250cc缺100–110cc（华创未更新），3Q26少计约3–4千台'), ('yoy',),
     ('sum', 'T出口', '出口', '台', ('L出口', 'S出口'), '9月≤250cc出口/内销拆分缺（华创未更新）'), ('yoy',),
     ('sum', 'T内销', '内销', '台', ('L内销', 'S内销'), ''),
     ('share', 'T占比', '出口占比', '%', ('T出口', 'T整体'), ''), ('blank',),
     ('bar', '二、>250cc（大排量）'),
     ('src', 'L整体', '整体', '台', (DL, 7), '国联：隆鑫机车销量页'), ('yoy',),
     ('src', 'L出口', '出口', '台', (DL, 14), ''), ('yoy',),
     ('src', 'L内销', '内销', '台', (DL, 21), '= 整体 − 出口'),
     ('share', 'L占比', '出口占比', '%', ('L出口', 'L整体'), ''), ('blank',),
     ('src', None, '整体｜250–400cc', '台', (DL, 79), ''), ('src', None, '整体｜400–500cc', '台', (DL, 80), ''),
     ('src', None, '整体｜500–800cc', '台', (DL, 81), ''), ('src', None, '整体｜>800cc', '台', (DL, 82), ''), ('blank',),
     ('src', None, '出口｜250–400cc', '台', (DL, 87), ''), ('src', None, '出口｜400–500cc', '台', (DL, 88), ''),
     ('src', None, '出口｜500–800cc', '台', (DL, 89), ''), ('src', None, '出口｜>800cc', '台', (DL, 90), ''), ('blank',),
     ('bar', '三、≤250cc（小排量）'),
     ('src', 'S整体', '整体', '台', (DS, 7), '国联整体分排量；100–110cc来自华创'), ('yoy',),
     ('src', 'S出口', '出口', '台', (DS, 14), '≤250cc出口拆分来自华创，2023年起'), ('yoy',),
     ('src', 'S内销', '内销', '台', (DS, 21), '= 整体 − 出口'),
     ('share', 'S占比', '出口占比', '%', ('S出口', 'S整体'), ''), ('blank',),
     ('src', None, '整体｜100–110cc', '台', (DS, 117), '华创；2023年8月起'), ('src', None, '整体｜110–125cc', '台', (DS, 118), ''),
     ('src', None, '整体｜125–150cc', '台', (DS, 119), ''), ('src', None, '整体｜150–200cc', '台', (DS, 123), ''),
     ('src', None, '整体｜200–250cc', '台', (DS, 124), ''), ('blank',),
     ('src', None, '出口｜100–110cc', '台', (DS, 131), ''), ('src', None, '出口｜110–125cc', '台', (DS, 132), ''),
     ('src', None, '出口｜125–150cc', '台', (DS, 133), ''), ('src', None, '出口｜150–200cc', '台', (DS, 137), ''),
     ('src', None, '出口｜200–250cc', '台', (DS, 138), ''), ('blank',),
     ('bar', '四、>250cc 三家对比'),
     ('src', 'CF', '春风动力｜整体', '台', (DL, 3), ''), ('yoy',), ('src', None, '春风动力｜出口', '台', (DL, 10), ''), ('yoy',),
     ('src', 'QJ', '钱江摩托｜整体', '台', (DL, 5), ''), ('yoy',), ('src', None, '钱江摩托｜出口', '台', (DL, 12), ''), ('yoy',),
     ('src', 'LX', '隆鑫通用｜整体', '台', (DL, 7), ''), ('yoy',), ('src', None, '隆鑫通用｜出口', '台', (DL, 14), ''), ('yoy',),
     ('peer', None, '隆鑫占三家合计', '%', ('CF', 'QJ', 'LX'), ''), ('blank',),
     ('bar', '五、电动（参考）'),
     ('src', None, '隆鑫通用｜电动整体', '台', (DE, 7), '2025年起，量很小')]

# pass 1: assign rows
r = 5; ROW = {}; layout = []
for spec in S:
    layout.append((r, spec))
    if spec[0] != 'blank' and spec[0] != 'bar' and spec[0] != 'yoy' and spec[1]:
        ROW[spec[1]] = r
    r += 1
END = r - 1

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = tw = None
try:
    wb = xl.Workbooks.Open(MODEL); tw = xl.Workbooks.Open(TRK, ReadOnly=True)
    rp = wb.Worksheets('Revenue Projection')
    for name, new in [('电动', DE), ('小排量', DS), ('大排量', DL)]:
        tw.Worksheets(name).Copy(After=rp); wb.ActiveSheet.Name = new
    tw.Close(False); tw = None
    ws = wb.Worksheets.Add(After=rp); ws.Name = 'Data'
    WHITE = 0xFFFFFF; GREY = 0x808080; BAND = 0xF5 * 65536 + 0xFB * 256 + 0xFD  # F5FBFD as BGR

    def kaiti(rg, color=None, bold=False):
        rg.Font.Name = 'KaiTi'; rg.Font.Size = 10; rg.Font.Bold = bold
        if color is not None: rg.Font.Color = color

    def bar(rr, text, size=10):
        rg = ws.Range(f'A{rr}:{LAST}{rr}'); rg.Interior.ThemeColor = 5; rg.Interior.TintAndShade = -0.25
        rg.Font.Name = 'Calibri'; rg.Font.Size = 10; rg.Font.Color = WHITE; rg.Font.Bold = True
        ws.Range(f'A{rr}').Value = text; kaiti(ws.Range(f'A{rr}'), WHITE, True); ws.Range(f'A{rr}').Font.Size = size
        for p, col in COLS:
            if p: ws.Cells(rr, col).Value = "'" + p[0]

    bar(1, '隆鑫通用｜销量数据（月度加总）', 11)
    ws.Range('B1').Value = '单位'; kaiti(ws.Range('B1'), WHITE, True)
    for p, col in COLS:
        if p: ws.Cells(2, col).Value = 'ACT实际'; kaiti(ws.Cells(2, col))
    ws.Range('A3').Value = ('来源：摩托车三公司_月度出口内销_更新至26年9月.xlsx，Data 大排量 / 小排量 / 电动 三页原样拷入。'
                            '季度、年度 = 月度加总，缺月显示“—”。黑字 = 公式，灰字 = 同比/占比。')
    kaiti(ws.Range('A3'), GREY)
    band = False; groups = []; cur = None
    for rr, spec in layout:
        k = spec[0]
        if k == 'blank': continue
        if k == 'bar': bar(rr, spec[1]); band = False; continue
        if k == 'yoy':
            ws.Cells(rr, 1).Value = '  同比'; ws.Cells(rr, 2).Value = '%'
            for p, col in COLS:
                if p and prev_label(p[0]) in PCOL:
                    cc, pc = L(col), L(PCOL[prev_label(p[0])])
                    ws.Cells(rr, col).Formula = f'=IF(AND(ISNUMBER({cc}{cur}),ISNUMBER({pc}{cur})),{cc}{cur}/{pc}{cur}-1,"")'
            ws.Range(f'C{rr}:{LAST}{rr}').NumberFormat = '0.0%'
            ws.Range(f'A{rr}:{LAST}{rr}').Font.Color = GREY; kaiti(ws.Range(f'A{rr}:B{rr}'), GREY)
            groups[-1][1] = rr; continue
        _, key, lab, unit, src, note = spec
        ws.Cells(rr, 1).Value = lab; ws.Cells(rr, 2).Value = unit
        for p, col in COLS:
            if not p: continue
            cc = L(col); lb, y, ms = p
            if k == 'src':
                f = agg(src[0], src[1], y, list(ms))
            elif k == 'sum':
                a, b = ROW[src[0]], ROW[src[1]]
                f = f'=IF(COUNT({cc}{a},{cc}{b})=2,{cc}{a}+{cc}{b},"—")'
            elif k == 'share':
                n, d = ROW[src[0]], ROW[src[1]]
                f = f'=IF(AND(ISNUMBER({cc}{n}),ISNUMBER({cc}{d})),{cc}{n}/{cc}{d},"")'
            else:  # peer
                a, b, c_ = (ROW[x] for x in src)
                f = f'=IF(COUNT({cc}{a},{cc}{b},{cc}{c_})=3,{cc}{c_}/({cc}{a}+{cc}{b}+{cc}{c_}),"")'
            ws.Cells(rr, col).Formula = f
        if k in ('share', 'peer'):
            ws.Range(f'C{rr}:{LAST}{rr}').NumberFormat = '0.0%'
            ws.Range(f'A{rr}:{LAST}{rr}').Font.Color = GREY; kaiti(ws.Range(f'A{rr}:B{rr}'), GREY)
            if groups: groups[-1][1] = rr
        else:
            ws.Range(f'C{rr}:{LAST}{rr}').NumberFormat = '#,##0;-#,##0;0'
            kaiti(ws.Range(f'A{rr}:B{rr}'))
            band = not band; groups.append([rr, rr, band]); cur = rr
        if note:
            ws.Cells(rr, NOTE).Value = "'" + note if note.startswith('=') else note; kaiti(ws.Cells(rr, NOTE), GREY)
    for a, b, on in groups:
        if on: ws.Range(f'A{a}:{LAST}{b}').Interior.Color = BAND
    for p, col in COLS:
        ws.Columns(col).ColumnWidth = 10 if p else 2
        if p:
            rg = ws.Range(f'{L(col)}5:{L(col)}{END}'); rg.Font.Name = 'Calibri'; rg.Font.Size = 10
    ws.Range(f'C1:{LAST}{END}').HorizontalAlignment = -4152
    ws.Columns('A').ColumnWidth = 30; ws.Columns('B').ColumnWidth = 6
    ws.Columns(NOTE - 1).ColumnWidth = 2; ws.Columns(NOTE).ColumnWidth = 40
    for rr, spec in layout:  # bar labels keep KaiTi white bold (period labels Calibri)
        if spec[0] == 'bar': kaiti(ws.Range(f'A{rr}'), WHITE, True)
    ws.Activate(); xl.ActiveWindow.DisplayGridlines = True
    xl.ActiveWindow.FreezePanes = False; ws.Range('C4').Select(); xl.ActiveWindow.FreezePanes = True
    ws.Range('A1').Select()
    print('external links:', wb.LinkSources(1))
    xl.CalculateFull(); wb.Save(); print('saved; Data rows to', END)
finally:
    if tw is not None: tw.Close(False)
    if wb is not None: wb.Close(False)
    xl.Quit()
