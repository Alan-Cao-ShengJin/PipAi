"""Step 11: audit fixes — ESOP expense explicit, 4Q26 cost method, 2027 operating leverage & recurring items,
share count excl. ESOP shares, 代工 2H, 无极国内 4Q. Excel COM."""
import os, json, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get('LX_MODEL') or os.path.join(F, '隆鑫通用 1025.xlsx')
assert os.environ.get('LX_MODEL') or not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)
R = json.load(open(os.path.join(F, 'work', 'lx_rp_rows.json'), encoding='utf-8'))
PURPLE = 160 * 65536 + 48 * 256 + 112; BLACK = 0

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL); s = wb.Worksheets('3S'); rp = wb.Worksheets('Revenue Projection')
    def P(c, f, note=None):
        cell = s.Range(c); cell.Formula = f; cell.Font.Color = PURPLE; cell.Interior.ThemeColor = 10; cell.Interior.TintAndShade = 0.8
        if note:
            if cell.Comment is not None: cell.Comment.Delete()
            cell.AddComment(note)
    def B(c, f):
        cell = s.Range(c); cell.Formula = f; cell.Font.Color = BLACK; cell.Interior.Pattern = -4142
        if cell.Comment is not None: cell.Comment.Delete()
    before = {k: s.Range(a).Value for k, a in (('ni26', 'H37'), ('ni27', 'I37'), ('ni28', 'J37'), ('q4', 'S37'), ('eps26', 'H44'), ('eps27', 'I44'))}
    # ESOP expense schedule (RMB '000), rows 233–234
    s.Range('B233').Value = 'ESOP expense (3rd employee stock plan)'; s.Range('C233').Value = '第三期员工持股计划费用'
    s.Range('C233').Font.Name = 'KaiTi'
    for c, v in (('H', 111000), ('I', 188000), ('J', 61000)):
        P(f'{c}233', v)
    s.Range('H233:J233').NumberFormat = s.Range('H14').NumberFormat
    s.Range('H233').AddComment('临2026-039：专项激励基金4.00亿元（2025年已预提0.30亿），其余3.70亿元按服务期和解锁条件计入2026–2028年员工薪酬。'
                               '解锁40%/30%/30%（购买完成2026-03后12/24/36个月）；按2026-10授予（份额分配完成）计：2026年4Q约1.11亿，2027年1.88亿，2028年0.61亿，2029年0.10亿。'
                               '假设各期解锁条件达成；9M26管理费用未含。')
    # 4Q26 opex: full-year growth = 9M growth (costs back-loaded since 2025), + ESOP in admin
    B('S10', '=G10*Y10/X10-Y10'); B('S12', '=G12*Y12/X12-Y12'); B('S16', '=G16*Y16/X16-Y16')
    B('S14', '=G14*Y14/X14-Y14-H233')
    for r in (11, 13, 15, 17): B(f'S{r}', f'=-S{r-1}/S4')
    s.Range('S10').AddComment('4Q26E = 2025全年 × (1+前三季度同比) − 前三季度：2025年起费用集中在四季度（9M25远低于9M24、4Q25远高于4Q24），纪要1023b：绩效等人力费用与去年节奏一样')
    s.Range('S14').AddComment('同上，另加第三期员工持股计划4Q26费用（H233）')
    # 2027–28: admin core +5%/yr + ESOP; R&D +8%/yr; tax & selling keep ratio
    P('I14', '=(H14+H233)*(1+8%)-I233', '2027E管理费用 = 2026年核心管理费用（扣除员工持股费用）×1.08（工资及人员扩张） + 员工持股费用；体现经营杠杆')
    P('J14', '=(I14+I233)*(1+8%)-J233')
    P('I16', '=H16*(1+8%)', '2027–28E研发费用每年+8%（新车型开发），低于收入增速'); P('J16', '=I16*(1+8%)')
    for c in 'IJ':
        B(f'{c}15', f'=-{c}14/{c}4'); B(f'{c}17', f'=-{c}16/{c}4')
    # recurring year-end impairments / non-op: carry 2026 ratio (every year 2022–2026 negative except 2025)
    P('I21', '=H21', '2027E起其他收益/减值按2026年比例：年末资产/信用减值每年都有（2022–2026年仅2025年为正），不再假设为0')
    P('I23', '=H23', '营业外收支按2026年比例')
    # shares: exclude ESOP-held shares (company reports 9M26 EPS 0.7613 on ~2,027m shares)
    for c in 'HIJ':
        P(f'{c}43', '=2053.54185-26.6565')
    s.Range('H43').Comment.Delete() if s.Range('H43').Comment is not None else None
    s.Range('H43').AddComment('总股本2,053.54百万股 − 第三期员工持股计划持有2,665.65万股（库存股，不过户、分红归公司）。公司9M26基本每股收益0.7613与此口径一致')
    # RP: locate columns from the header (user inserted a gap column at J)
    hdr = {str(rp.Cells(1, c).Value): c for c in range(1, 30) if rp.Cells(1, c).Value}
    L = lambda n: rp.Cells(1, n).Address.split('$')[1]
    Q4, Q3, Q1, NC = L(hdr['4Q26E']), L(hdr['3Q26A']), L(hdr['1Q26A']), L(hdr['重点'])
    print('RP columns: 1Q26', Q1, '3Q26', Q3, '4Q26E', Q4, 'notes', NC)
    c = rp.Range(f"G{R['oem_g']}"); c.Formula = '=(18.32+(F' + str(R['oem']) + '-18.32/(1-26.97%))*(1+5%))/F' + str(R['oem']) + '-1'
    rp.Range(f"{NC}{R['oem_g']}").Value = ('来源：半年报（代工贴牌通路车1H26 18.32亿元，−27%）、纪要1023（Q3代工收入同比转正）、Data（≤250cc销量3Q26 +29%、9月+31%，1H与代工收入同步−27%）；'
                                        '2026E按2H同比+5%推算（3Q其他业务仍同比−3.6%，管理层提示9月为墨西哥客户因素、勿外推）；2027–28E +3%（长期个位数增长）')
    rp.Range(f"{Q4}{R['wd_g']}").Value = 0
    rp.Range(f"{NC}{R['wd_g']}").Value = '来源：Data（9月>250cc内销同比−19%，3Q +8%）、纪要1023（国内行业仍疲软，存量博弈）；4Q26E同比取0%（4Q25基数仅1.3亿）'
    rp.Range(f"A{R['kpi']}").Value = '考核：归母净利+10%所需（扣除员工持股费用前）'
    rp.Range(f"{Q4}{R['kpi']}").Formula = f"=G{R['kpi']}-SUM({Q1}{R['ni']}:{Q3}{R['ni']})-'3S'!H233/100000"
    rp.Range(f"{NC}{R['kpi']}").Value = ('来源：纪要1023b（自主品牌必须，营收/净利润二选一）、第三期员工持股计划草案（2026年归母较2025年+10%，按扣除股份支付费用前计）；'
                                      '2026E列 = 全年目标（扣费前），4Q26E列 = 达标所需4Q报表归母（已加回4Q员工持股费用）')
    rp.Range(f"{NC}{R['opex']}").Value = ('来源：3S。4Q26E = 2025全年 × (1+前三季度同比) − 前三季度（2025年起费用集中在四季度；纪要1023b：绩效等人力费用与去年节奏一样）'
                                       '+ 第三期员工持股计划4Q费用约1.1亿（临2026-039）')
    xl.CalculateFull(); wb.Save()
    after = {k: s.Range(a).Value for k, a in (('ni26', 'H37'), ('ni27', 'I37'), ('ni28', 'J37'), ('q4', 'S37'), ('eps26', 'H44'), ('eps27', 'I44'))}
    for k in before: print(f'{k:6s} {before[k]/ (1e5 if k[:2] in ("ni","q4") else 1):8.3f} -> {after[k]/(1e5 if k[:2] in ("ni","q4") else 1):8.3f}')
    print('4Q26 opex', round(-(s.Range('S10').Value + s.Range('S12').Value + s.Range('S14').Value + s.Range('S16').Value) / 1e5, 2),
          '| 4Q rev', round(s.Range('S4').Value / 1e5, 2), '| FY26 rev', round(s.Range('H4').Value / 1e5, 2), '| FY27 rev', round(s.Range('I4').Value / 1e5, 2))
    print('ratios FY26 / FY27 / FY28 (tax,sell,admin,RD):', [[round(s.Range(f'{c}{r}').Value, 4) for r in (11, 13, 15, 17)] for c in 'HIJ'])
    print('other ratio I21', round(s.Range('I21').Value, 4), 'nonop I23', round(s.Range('I23').Value, 4), '| DPS26', round(s.Range('H48').Value, 3), 'payout', round(s.Range('H50').Value, 3))
    print('KPI need 4Q', round(rp.Range(f"{Q4}{R['kpi']}").Value, 2), '| model 4Q NI', round(rp.Range(f"{Q4}{R['ni']}").Value, 2), '| allowed opex', round(rp.Range(f"{Q4}{R['kpi_x']}").Value, 2))
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
