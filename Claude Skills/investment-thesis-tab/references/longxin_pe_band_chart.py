"""Step 8b: 估值区间 tab (5-year forward P/E band, FactSet) + 投资逻辑 section 四; fix Data-section YoY cells in RP. Excel COM."""
import os, json, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(F, '隆鑫通用 1025.xlsx')
assert not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)
ROWS = json.load(open(os.path.join(F, 'work', 'lx_pe_band.json'), encoding='utf-8'))
RPR = json.load(open(os.path.join(F, 'work', 'lx_rp_rows.json'), encoding='utf-8'))
PURPLE = 160 * 65536 + 48 * 256 + 112; BLUE = 192 * 65536 + 112 * 256; GREY = 0x808080; WHITE = 0xFFFFFF; ORANGE = 0x0B * 65536 + 0x65 * 256 + 0xC5

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL)
    # --- fix RP Data-section YoY: no full-year volume for 2026–28 ---
    rp = wb.Worksheets('Revenue Projection')
    for k in ('d_lt_y', 'd_lx_y', 'd_st_y'):
        rp.Range(f"G{RPR[k]}:I{RPR[k]}").ClearContents()
    # --- 估值区间 tab ---
    if '估值区间' in [s.Name for s in wb.Worksheets]:
        ws = wb.Worksheets('估值区间'); ws.Cells.Clear()
        for co in list(ws.ChartObjects()): co.Delete()
    else:
        ws = wb.Worksheets.Add(After=wb.Worksheets('投资逻辑')); ws.Name = '估值区间'
    ws.Cells.Font.Name = 'Calibri'; ws.Cells.Font.Size = 10
    ws.Range('A1').Value = '隆鑫通用｜5年前瞻市盈率区间（月度）'; ws.Range('A1').Font.Name = 'KaiTi'; ws.Range('A1').Font.Bold = True; ws.Range('A1').Font.Size = 12
    ws.Range('A2').Value = ('来源：FactSet月末收盘价；前瞻EPS = FactSet一致预期NTM EPS（有覆盖的月份），无覆盖月份用实际未来12个月EPS（季度EPS按月均摊）。'
                            '区间统计只用一致预期口径月份；实际口径受2021–2023年四季度减值拖累、偏高，仅作参考。')
    ws.Range('A2').Font.Name = 'KaiTi'; ws.Range('A2').Font.Color = GREY
    # data table from row 20
    r0 = 20
    hdr = ['月份', '股价（元）', '前瞻EPS（元）', '口径', '前瞻P/E', 'P/E（一致预期口径）', 'P/E（实际口径，参考）', '均值', '+1SD', '−1SD', '+2SD', '−2SD']
    for i, h in enumerate(hdr): ws.Cells(r0, i + 1).Value = h
    hb = ws.Range(ws.Cells(r0, 1), ws.Cells(r0, len(hdr))); hb.Interior.ThemeColor = 5; hb.Interior.TintAndShade = -0.25; hb.Font.Color = WHITE; hb.Font.Bold = True; hb.Font.Name = 'KaiTi'
    n = len(ROWS); first = r0 + 1; last = r0 + n
    data = []
    for i, d in enumerate(ROWS):
        r = first + i
        data.append((d['month'], d['price'], round(d['eps'], 6), d['basis'], f'=B{r}/C{r}',
                     f'=IF(LEFT(D{r},4)="一致预期",E{r},NA())', f'=IF(LEFT(D{r},4)="实际NTM",E{r},NA())',
                     '=$C$5', '=$C$7', '=$C$8', '=$C$9', '=$C$10'))
    ws.Range(ws.Cells(first, 1), ws.Cells(last, 12)).Formula = tuple(data)
    ws.Range(f'A{first}:A{last}').NumberFormat = '@'
    ws.Range(f'B{first}:C{last}').Font.Color = BLUE
    for i, d in enumerate(ROWS):
        if '沿用' in d['basis']: ws.Cells(first + i, 2).Font.Color = ORANGE; ws.Cells(first + i, 2).Font.Italic = True
    ws.Range(f'C{first}:C{last}').NumberFormat = '0.000'; ws.Range(f'E{first}:L{last}').NumberFormat = '0.0"x"'; ws.Range(f'B{first}:B{last}').NumberFormat = '0.00'
    ws.Range(f'D{first}:D{last}').Font.Name = 'KaiTi'
    # summary block
    S = [
        (4, '统计区间（一致预期口径月份数）', f'=COUNT(F{first}:F{last})', '0', ''),
        (5, '均值', f'=AVERAGE(F{first}:F{last})', '0.0"x"', ''),
        (6, '标准差（SD）', f'=STDEV.P(F{first}:F{last})', '0.0"x"', ''),
        (7, '+1SD', '=C5+C6', '0.0"x"', ''), (8, '−1SD', '=C5-C6', '0.0"x"', ''),
        (9, '+2SD', '=C5+2*C6', '0.0"x"', ''), (10, '−2SD', '=C5-2*C6', '0.0"x"', ''),
        (12, '现价（元）', "='投资逻辑'!C{px}", '0.00', '2026-10-23收盘'),
        (13, '一致预期NTM EPS（元）', f'=C{last}', '0.000', 'FactSet 2026-10'),
        (14, '模型NTM EPS（元）', "='3S'!S44*2/3+'3S'!I44*10/12", '0.000', '= 4Q26E EPS × 2/3 + 2027E EPS × 10/12（2026年11月–2027年10月）'),
        (15, '前瞻P/E：一致预期口径', '=C12/C13', '0.0"x"', ''),
        (16, '前瞻P/E：模型口径', '=C12/C14', '0.0"x"', ''),
        (17, '位置：一致预期口径（SD）', '=(C15-C5)/C6', '+0.0;-0.0', '0 = 均值；+1 = +1SD'),
        (18, '位置：模型口径（SD）', '=(C16-C5)/C6', '+0.0;-0.0', ''),
    ]
    th = wb.Worksheets('投资逻辑')
    pxrow = next(r for r in range(1, 60) if th.Range(f'B{r}').Value == '当前股价（元）')
    for r, lab, f, fmt, note in S:
        ws.Range(f'A{r}').Value = lab; ws.Range(f'A{r}').Font.Name = 'KaiTi'
        ws.Range(f'C{r}').Formula = f.replace('{px}', str(pxrow)); ws.Range(f'C{r}').NumberFormat = fmt
        if note: ws.Range(f'D{r}').Value = ("'" + note) if note.startswith('=') else note; ws.Range(f'D{r}').Font.Name = 'KaiTi'; ws.Range(f'D{r}').Font.Color = GREY
    for r in (5, 15, 16, 17, 18): ws.Range(f'A{r}:C{r}').Font.Bold = True
    # reference: full 5y mixed basis
    ws.Range('F4').Value = '参考：5年全部月份（含实际口径）'; ws.Range('F4').Font.Name = 'KaiTi'; ws.Range('F4').Font.Color = GREY
    for r, lab, f in ((5, '均值', f'=AVERAGE(E{first}:E{last})'), (6, 'SD', f'=STDEV.P(E{first}:E{last})'), (7, '月份数', f'=COUNT(E{first}:E{last})')):
        ws.Range(f'F{r}').Value = lab; ws.Range(f'F{r}').Font.Name = 'KaiTi'; ws.Range(f'G{r}').Formula = f
        ws.Range(f'G{r}').NumberFormat = '0' if lab == '月份数' else '0.0"x"'; ws.Range(f'F{r}:G{r}').Font.Color = GREY
    ws.Columns('A').ColumnWidth = 30; ws.Columns('B:C').ColumnWidth = 11; ws.Columns('D').ColumnWidth = 22
    ws.Columns('E:L').ColumnWidth = 11
    ws.Cells.WrapText = False
    # chart
    co = ws.ChartObjects().Add(ws.Range('I3').Left, ws.Range('I3').Top, 620, 300)
    ch = co.Chart; ch.ChartType = 4   # xlLine
    while ch.SeriesCollection().Count: ch.SeriesCollection(1).Delete()
    xs = ws.Range(f'A{first}:A{last}')
    spec = [('F', '前瞻P/E（一致预期）', 0x7F3F1F, 2.25, 1), ('G', '前瞻P/E（实际口径，参考）', 0xA6A6A6, 1.5, 4),
            ('H', '均值', 0x000000, 1.25, 1), ('I', '+1SD', 0x3333CC, 1.0, 4), ('J', '−1SD', 0x3333CC, 1.0, 4),
            ('K', '+2SD', 0x0000C0, 1.0, 2), ('L', '−2SD', 0x0000C0, 1.0, 2)]
    for col, name, color, w, dash in spec:
        s = ch.SeriesCollection().NewSeries(); s.Name = name; s.Values = ws.Range(f'{col}{first}:{col}{last}'); s.XValues = xs
        s.Format.Line.ForeColor.RGB = color; s.Format.Line.Weight = w; s.Format.Line.DashStyle = dash
    ch.HasTitle = True; ch.ChartTitle.Text = '隆鑫通用 前瞻P/E（5年，月度）'
    ch.HasLegend = True; ch.Legend.Position = -4107
    ch.Axes(1).TickLabelSpacing = 6
    ws.Activate(); xl.ActiveWindow.DisplayGridlines = False; ws.Range('A1').Select()
    # --- 投资逻辑 section 四 ---
    lastr = max(r for r in range(1, 80) if th.Range(f'B{r}').Value)
    r = lastr + 2
    bar = th.Range(f'B{r}:D{r}'); bar.Interior.ThemeColor = 5; bar.Interior.TintAndShade = -0.25; bar.Font.Color = WHITE; bar.Font.Bold = True
    th.Range(f'B{r}').Value = '四、历史估值：5年前瞻P/E区间'; th.Range(f'C{r}').Value = '数值'; th.Range(f'D{r}').Value = '说明'; r += 1
    items = [
        ('均值 / 标准差', "=TEXT('估值区间'!C5,\"0.0x\")&\" / \"&TEXT('估值区间'!C6,\"0.0x\")", '@', 'FactSet一致预期口径月份（2022-11起，期间有缺口；2025年前多为单家预测）'),
        ('−2SD / −1SD / +1SD / +2SD', "=TEXT('估值区间'!C10,\"0.0x\")&\" / \"&TEXT('估值区间'!C8,\"0.0x\")&\" / \"&TEXT('估值区间'!C7,\"0.0x\")&\" / \"&TEXT('估值区间'!C9,\"0.0x\")", '@', ''),
        ('现价前瞻P/E：一致预期EPS', "='估值区间'!C15", '0.0"x"', "=\"位置 \"&TEXT('估值区间'!C17,\"+0.0;-0.0\")&\"SD（接近均值）\""),
        ('现价前瞻P/E：模型EPS', "='估值区间'!C16", '0.0"x"', "=\"位置 \"&TEXT('估值区间'!C18,\"+0.0;-0.0\")&\"SD；模型盈利比一致预期低约20%\""),
        ('均值P/E × 模型NTM EPS（元）', "='估值区间'!C5*'估值区间'!C14", '0.00', '历史均值估值对应股价'),
        ('+1SD P/E × 模型NTM EPS（元）', "='估值区间'!C7*'估值区间'!C14", '0.00', ''),
        ('均值P/E × 一致预期NTM EPS（元）', "='估值区间'!C5*'估值区间'!C13", '0.00', '若一致预期盈利兑现'),
    ]
    for lab, f, fmt, note in items:
        th.Range(f'B{r}').Value = lab; c = th.Range(f'C{r}'); c.Formula = f; c.NumberFormat = fmt; c.Font.Name = 'Calibri'; c.HorizontalAlignment = -4152
        if note:
            th.Range(f'D{r}').Formula = note if note.startswith('=') else note
        th.Range(f'D{r}').Font.Color = GREY
        r += 1
    # refresh why-invest point 5 with the band read
    for rr in range(1, 30):
        v = th.Range(f'B{rr}').Value
        if isinstance(v, str) and v.startswith('5. 估值'):
            th.Range(f'B{rr}').Value = ('5. 估值：按一致预期前瞻P/E约13x，接近5年均值（约12x，+0.4SD）；按我们盈利约17x，接近+3SD。'
                                        '我们2026–27E归母比一致预期低约20%，主要因四季度费用按去年水平计。')
    xl.CalculateFull(); wb.Save()
    for a in ('C4', 'C5', 'C6', 'C7', 'C9', 'C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'G5', 'G6'):
        print(a, ws.Range(f'A{a[1:]}').Value if a[0] == 'C' else ws.Range(f'F{a[1:]}').Value, round(ws.Range(a).Value, 3))
    for rr in range(lastr + 3, r): print(th.Range(f'B{rr}').Value, th.Range(f'C{rr}').Text, th.Range(f'D{rr}').Text)
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
