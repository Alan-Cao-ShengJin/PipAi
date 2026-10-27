"""Step 6: 投资逻辑 tab (Excel COM). Valuation = user's 3S peer-average P/E × EPS, linked live."""
import os, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(F, '隆鑫通用 1025.xlsx')
assert not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)

PURPLE = 160 * 65536 + 48 * 256 + 112; GREY = 0x808080; WHITE = 0xFFFFFF
WHY = [
    '无极出口是利润引擎：2026E欧洲无极净利约3.6亿元，占归母约22%；全年出口指引+30%，4Q26E隐含+40%（450X放量）。',
    '第二增长曲线：拉美今年3.5–4万辆（约翻倍），管理层看3–4年15–20万辆；全地形车2026E收入10.3亿元（+57%），单车净利约3,050元。',
    '结构改善：前三季度自主品牌收入54.5亿元，占比36.7%（+7.9个点）；代工三季度转正，通机拖累（1H26 −15%）在周期底部。',
    '高分红：2026年分红约15.4亿元（分红率约95%），2027E每股分红0.93元；历年分红率87–100%。',
    '估值：现价对应2026E/2027E P/E约19x/15x，高于同业平均；我们2026–27E归母比一致预期低约22%/18%，主要因四季度费用按去年水平计。',
]
FALSIFY = [
    '无极出口全年增速低于25%（指引30%）→ 每少10个点，2027E收入约−3.3亿、归母约−0.55亿。',
    '季度毛利率跌破19%（3Q26为20.0%）→ 原材料/汇率拖累扩大，每1个点2027E归母约−1.9亿。',
    '2026年分红低于15亿元，或分红率降到80%以下 → 股息支撑失效。',
    '拉美2027年销量低于5万辆，或单车利润明显低于欧洲 → 第二曲线逻辑削弱（约−0.85亿）。',
    '宗申资产置换补价低于4亿元，或置入资产利润差扩大到1亿元以上。',
]

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL)
    names = [s.Name for s in wb.Worksheets]
    if '投资逻辑' in names:
        ws = wb.Worksheets('投资逻辑'); ws.Cells.Clear()
    else:
        ws = wb.Worksheets.Add(After=wb.Worksheets(wb.Worksheets.Count)); ws.Name = '投资逻辑'
    ws.Cells.Font.Name = 'KaiTi'; ws.Cells.Font.Size = 10

    def bar(r, text, labels=None):
        rg = ws.Range(f'B{r}:D{r}'); rg.Interior.ThemeColor = 5; rg.Interior.TintAndShade = -0.25
        rg.Font.Color = WHITE; rg.Font.Bold = True
        ws.Range(f'B{r}').Value = text
        if labels:
            for col, lab in labels.items(): ws.Range(f'{col}{r}').Value = lab

    ws.Range('B1').Value = '隆鑫通用（603766）｜投资逻辑'; ws.Range('B1').Font.Bold = True; ws.Range('B1').Font.Size = 12
    ws.Range('B2').Value = '数字均链接3S / Revenue Projection；股价为FactSet 2026-10-23收盘；紫色 = 可改输入。'
    ws.Range('B2').Font.Color = GREY
    r = 4; bar(r, '一、为什么投资'); r += 1
    for i, t in enumerate(WHY, 1): ws.Range(f'B{r}').Value = f'{i}. {t}'; r += 1
    r += 1; bar(r, '二、目标价与上涨空间', {'C': '数值', 'D': '说明'}); r += 1
    rows = {}
    def item(key, label, formula, fmt, note, purple=False, grey=False):
        global r
        ws.Range(f'B{r}').Value = label
        c = ws.Range(f'C{r}'); c.Formula = formula; c.NumberFormat = fmt; c.Font.Name = 'Calibri'
        c.HorizontalAlignment = -4152
        ws.Range(f'D{r}').Value = note
        if purple: c.Font.Color = PURPLE; c.Interior.ThemeColor = 10; c.Interior.TintAndShade = 0.8
        if grey: ws.Range(f'B{r}:D{r}').Font.Color = GREY
        else: ws.Range(f'D{r}').Font.Color = GREY
        rows[key] = r; r += 1
    item('px', '当前股价（元）', 15.23, '0.00', 'FactSet 2026-10-23收盘；3S D52为RTD公式，离线显示11.93（旧）', purple=True)
    item('e26', '2026E EPS（元）', "='3S'!H44", '0.00', '3S：前三季度实际 + 4Q26E')
    item('e27', '2027E EPS（元）', "='3S'!I44", '0.00', '3S 2027E')
    item('pe', '目标P/E（2027E）', "='3S'!I61", '0.0"x"', '3S第58–61行同业平均（春风/涛涛/钱江，6月数据）', purple=True)
    item('tp', '目标价（元）', f"=C{rows['pe']}*C{rows['e27']}", '0.00', '目标P/E × 2027E EPS')
    ws.Range(f"B{rows['tp']}:C{rows['tp']}").Font.Bold = True
    item('up', '上涨空间', f"=C{rows['tp']}/C{rows['px']}-1", '0.0%', '目标价 / 现价 − 1')
    ws.Range(f"B{rows['up']}:C{rows['up']}").Font.Bold = True
    item('d26', '2026E 每股分红（元）', "='3S'!H48", '0.00', '管理层：全年分红约15.4亿元（中期0.25元已宣告）')
    item('y26', '2026E 股息率', f"=C{rows['d26']}/C{rows['px']}", '0.0%', '')
    item('d27', '2027E 每股分红（元）', "='3S'!I48", '0.00', '假设分红率90%')
    item('y27', '2027E 股息率', f"=C{rows['d27']}/C{rows['px']}", '0.0%', '')
    item('tr', '总回报（上涨空间 + 2026E股息率）', f"=C{rows['up']}+C{rows['y26']}", '0.0%', '')
    ws.Range(f"B{rows['tr']}:C{rows['tr']}").Font.Bold = True
    item('pe26', '当前P/E 2026E', f"=C{rows['px']}/C{rows['e26']}", '0.0"x"', '')
    item('pe27', '当前P/E 2027E', f"=C{rows['px']}/C{rows['e27']}", '0.0"x"', '')
    r += 1
    item('ppe26', '参考：同业P/E 2026E（现价）', 15.74, '0.0"x"', '春风18.5x、涛涛12.3x、钱江16.4x（FactSet一致预期EPS，2026-10-23收盘）', grey=True)
    item('ppe27', '参考：同业P/E 2027E（现价）', 12.0, '0.0"x"', '春风15.0x、涛涛9.2x、钱江11.9x（钱江仅1家预测）', grey=True)
    item('ctp', '参考：一致预期目标价（元）', 20.85, '0.00', 'FactSet均值，区间19.8–21.6', grey=True)
    item('cni26', '参考：一致预期归母2026E（亿元）', 20.75, '0.00', "8家；近期4家下调；隐含4Q26约5.3亿（4Q25仅0.71亿）", grey=True)
    item('mni26', '参考：模型归母2026E（亿元）', "='3S'!H37/100000", '0.00', '', grey=True)
    item('cni27', '参考：一致预期归母2027E（亿元）', 24.85, '0.00', '', grey=True)
    item('mni27', '参考：模型归母2027E（亿元）', "='3S'!I37/100000", '0.00', '', grey=True)
    item('ctp2', '参考：按一致预期EPS的目标价（元）', f"=C{rows['pe']}*C{rows['cni27']}/('3S'!I43/10)", '0.00', '目标P/E × 一致预期2027E EPS', grey=True)
    r += 1; bar(r, '三、什么会证伪我们的逻辑'); r += 1
    for i, t in enumerate(FALSIFY, 1): ws.Range(f'B{r}').Value = f'{i}. {t}'; r += 1
    ws.Columns('A').ColumnWidth = 2; ws.Columns('B').ColumnWidth = 36; ws.Columns('C').ColumnWidth = 11; ws.Columns('D').ColumnWidth = 75
    ws.Cells.WrapText = False
    ws.Activate(); xl.ActiveWindow.DisplayGridlines = False; ws.Range('A1').Select()
    xl.CalculateFull(); wb.Save()
    for k in ('px', 'e26', 'e27', 'pe', 'tp', 'up', 'd26', 'y26', 'd27', 'y27', 'tr', 'pe26', 'pe27', 'ctp2'):
        print(k, round(ws.Range(f'C{rows[k]}').Value, 4))
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
