"""Step 5: 问题 tab — management questions table (Excel COM, house style)."""
import os, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(F, '隆鑫通用 1025.xlsx')
assert not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)

TITLE = '隆鑫通用｜管理层问题（3Q26后，2026-10-25）'
SRC = '筛选：已剔除1023交流已回答的问题（无极出口全年增速、ATV、三轮出口、分红、海运费、代工、宝马、电动化、东南亚、产能）；按对2026–27年归母净利的影响排序。'
HEAD = ['#', '主题', '问题', '模型当前假设', '怎么解读答案 → 调整哪个假设', '回答记录']
Q = [
    ('四季度费用',
     '去年四季度管理费用三个多亿，主要是年终奖还是一次性项目？今年会差不多吗？',
     '4Q26E费用率同4Q25：管理7.8%（约3.9亿）、销售3.2%、研发3.9%；4Q26E归母0.73亿元，FY26归母16.2亿元。3Q26管理费用仅1.05亿元。2027年费用率沿用2026全年。',
     '差不多（年终奖等经常性）→ 维持。一次性为主 → 4Q26管理费用率降到前三季度2.3%，FY26归母约+2.3亿（+14%），2027年费用率同步下调。'),
    ('毛利率',
     '原材料和汇率对毛利的拖累，四季度比三季度更大、差不多还是更小？明年还会再调价吗？',
     '2026年子业务毛利率 = 2025年 −0.5个点；2027年起无极出海/三轮/ATV每年+0.2/+0.2/+0.5个点；FY27毛利率20.2%。',
     '更小且明年调价 → 2027年恢复到2025年水平（+0.5个点），毛利约+1.1亿、归母约+0.95亿。更大 → 2026–27年再降0.5–1个点，每1个点毛利约−2.2亿、归母约−1.9亿。'),
    ('拉美',
     '拉美的单车利润跟欧洲比差多少？明年还能再翻倍吗？',
     '拉美2026年3.5万辆，2027年4.9万辆（+40%）；出口ASP不分市场，单车净利按欧洲约3,450元。',
     '接近欧洲 → 维持。约为欧洲一半 → 2027年拉美利润约−0.85亿。明年翻倍（约7万辆）→ 销量+2.1万辆，归母约+0.7亿。'),
    ('欧洲份额',
     '明年欧洲份额还能像今年一样再提升一个点左右吗？新街车明年能上量吗？',
     'ADV、踏板份额每年+1个点（2027年8.4%/9.4%），街车2027年0.5%；欧洲销量2027年12.6万辆（+20%）；无极出口收入2027年+26.5%。',
     '能 → 维持。只能提升半个点 → 2027年欧洲约−0.7万辆，归母约−0.25亿。整体：无极出口增速每少10个点，收入约−3.3亿、归母约−0.55亿。'),
    ('资产置换',
     '和宗申的资产置换大概什么时候能签约？置入发动机业务的利润还是比通机少五千万左右吗？',
     '未建模：通机2027年收入39.5亿、毛利6.8亿仍在报表内。0618调研：利润差约5000万元，宗申补价约4–5亿元，分摊到多年分红。',
     '明年上半年签约交割 → 2027年起通机换成发动机业务，归母约−0.5亿 ×（持有月数/12），现金+4–5亿用于多年分红。继续拖延 → 维持现状。'),
]

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL); ws = wb.Worksheets('问题')
    ws.Cells.Clear()
    ws.Cells.Font.Name = 'KaiTi'; ws.Cells.Font.Size = 10
    ws.Range('A1').Value = TITLE; ws.Range('A1').Font.Bold = True; ws.Range('A1').Font.Size = 12
    ws.Range('A2').Value = SRC; ws.Range('A2').Font.Color = 0x808080
    for i, h in enumerate(HEAD):
        c = ws.Cells(4, i + 1); c.Value = h
    hdr = ws.Range('A4:F4'); hdr.Interior.ThemeColor = 5; hdr.Interior.TintAndShade = -0.25
    hdr.Font.Color = 0xFFFFFF; hdr.Font.Bold = True; hdr.VerticalAlignment = -4108
    BAND = 0xF5 * 65536 + 0xFB * 256 + 0xFD
    for i, (topic, q, a, interp) in enumerate(Q):
        r = 5 + i
        ws.Cells(r, 1).Value = i + 1; ws.Cells(r, 2).Value = topic; ws.Cells(r, 3).Value = q
        ws.Cells(r, 4).Value = a; ws.Cells(r, 5).Value = interp
        rg = ws.Range(f'A{r}:F{r}')
        rg.WrapText = True; rg.VerticalAlignment = -4160   # top
        rg.RowHeight = 78
        if i % 2 == 0: rg.Interior.Color = BAND
        ws.Cells(r, 2).Font.Bold = True
        ws.Cells(r, 1).HorizontalAlignment = -4108
    for col, w in zip('ABCDEF', (4, 10, 42, 48, 58, 24)): ws.Columns(col).ColumnWidth = w
    ws.Rows(4).RowHeight = 18
    ws.Activate(); xl.ActiveWindow.DisplayGridlines = False; ws.Range('A1').Select()
    wb.Save(); print('written', len(Q), 'questions')
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
