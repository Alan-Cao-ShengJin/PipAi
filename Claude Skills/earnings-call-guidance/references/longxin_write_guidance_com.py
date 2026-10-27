"""Step 3: Guidance tab from 20261023 Q3 交流纪要 (Excel COM; KaiTi; source column C)."""
import os, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(F, '隆鑫通用 1025.xlsx')
assert not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)

TITLE = '隆鑫通用 3Q26 交流核心指引（2026-10-23）'
NOTE = '来源：20261023隆鑫通用Q3交流纪要（纪要1023）及同场第二份纪要（纪要1023b）；分红、资产置换核对公司公告；0618调研仅补充纪要未覆盖的内容。'
SECTIONS = [
    ('业绩拆分（前三季度）', [
        ('自主品牌摩托车收入54.5亿元，同比增长近30%，占总收入36.7%。', '纪要1023'),
        ('无极收入37.4亿元，同比+23%；其中出口21.5亿元，同比+25%；销量20.9万台，同比增长近25%，其中出口11.36万台，同比+32%。', '纪要1023 / 1023b'),
        ('全地形车收入8.56亿元，同比+85%。', '纪要1023（原文误作Q3）'),
        ('通机受行业下行影响，利润同比减少约6000万元；汇兑损失约2800万元。', '纪要1023'),
    ]),
    ('无极', [
        ('全年无极出口增速预计约30%；450X 8月出货4000多台，9月5000多台，预计继续高增。', '纪要1023'),
        ('内销今年是强产品周期（CU系列换代）；国内此前不亏不赚，三季度开始赚钱；行业仍偏弱。', '纪要1023'),
        ('拉美今年约3.5–4万台（核心四国仅做了两国，约翻倍），3–4年看15–20万台；哥伦比亚是今年最大增量，墨西哥、巴西放量看明年。', '纪要1023 / 1023b'),
    ]),
    ('其他业务', [
        ('全地形车全年增速约50%，单季增速放缓在预期内；米兰展发布新款550和UTV，短期目标是保持约50%增速。', '纪要1023 / 1023b'),
        ('三轮车出口增速30%以上没有问题；放弃低毛利电三轮（顺丰未中标），三轮毛利率提升。', '纪要1023'),
        ('贴牌代工9月好主要是墨西哥客户，长期是个位数增长。', '纪要1023'),
        ('宝马代工今年下滑，收入上限约8–9亿元，盈利有限。', '纪要1023'),
    ]),
    ('毛利率与费用', [
        ('三季度毛利率提升主要因出口占比提高和450X出货；原材料和汇率压制约2个点，三季度没有进一步恶化。', '纪要1023'),
        ('无极5月已完成对外调价，无极毛利率会提升（贴牌享受不到）；分业务毛利率同比略有提升，发动机略降；欧洲已全部人民币结算。', '纪要1023 / 1023b'),
        ('四季度绩效等人力费用与去年节奏相同（去年四季度费用较多），其他费用目前看不清。', '纪要1023b'),
    ]),
    ('分红与资本', [
        ('2026年全年分红预算不低于15亿元，目前看约15.4亿元，不会超额分配。', '纪要1023'),
        ('2026年中期每股派0.25元，合计5.13亿元，比去年中期多约1亿元。', '公告临2026-045'),
        ('与宗申动力资产置换（通机换摩托车发动机）仍在筹划，尚未签约；通机今年下滑不会导致需要补偿差价的情况。', '纪要1023b / 临2026-041'),
        ('宗申补价约4–5亿元，计划分摊到多年分红，不做一次性特别分红。', '0618调研'),
        ('暂不扩产，目前中大排产能利用率合适。', '纪要1023'),
    ]),
    ('考核', [
        ('业绩考核：自主品牌指标必须完成，营收和净利润二选一；分析师称目标为增长10%，管理层未否认（“努力完成，否则没有奖金”）。', '纪要1023b'),
    ]),
    ('明年展望', [
        ('明年方向是“稳增长、高分红”；无极出口增速要等11月米兰展（EICMA）后再判断。', '纪要1023'),
    ]),
]

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL)
    names = [s.Name for s in wb.Worksheets]
    if 'Guidance' in names:
        ws = wb.Worksheets('Guidance'); ws.Cells.Clear()
    else:
        ws = wb.Worksheets.Add(After=wb.Worksheets('Data')); ws.Name = 'Guidance'
    GREY = 0x808080
    ws.Cells.Font.Name = 'KaiTi'; ws.Cells.Font.Size = 10
    ws.Range('B2').Value = TITLE; ws.Range('B2').Font.Bold = True; ws.Range('B2').Font.Size = 12
    ws.Range('B3').Value = NOTE; ws.Range('B3').Font.Color = GREY
    ws.Range('C4').Value = '来源'; ws.Range('C4').Font.Color = GREY
    r, n = 5, 1
    for head, items in SECTIONS:
        ws.Cells(r, 2).Value = head; ws.Cells(r, 2).Font.Bold = True; r += 1
        for text, src in items:
            ws.Cells(r, 2).Value = f'{n}. {text}'; ws.Cells(r, 3).Value = src; ws.Cells(r, 3).Font.Color = GREY
            r += 1; n += 1
        r += 1
    ws.Columns('A').ColumnWidth = 2; ws.Columns('B').ColumnWidth = 95; ws.Columns('C').ColumnWidth = 22
    ws.Cells.WrapText = False
    ws.Activate(); xl.ActiveWindow.DisplayGridlines = False; ws.Range('A1').Select()
    wb.Save(); print('written items', n - 1, 'rows to', r)
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
