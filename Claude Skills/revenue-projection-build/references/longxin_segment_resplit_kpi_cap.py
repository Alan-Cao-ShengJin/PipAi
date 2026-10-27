"""Step 13: segment re-split from 1H26 report + 天风 3Q split; 4Q26 admin capped at the ESOP-KPI threshold. Excel COM."""
import os, json, shutil
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get('LX_MODEL') or os.path.join(F, '隆鑫通用 1025.xlsx')
assert os.environ.get('LX_MODEL') or not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
if not os.environ.get('LX_MODEL'):
    bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)
R = json.load(open(os.path.join(F, 'work', 'lx_rp_rows.json'), encoding='utf-8'))
PURPLE = 160 * 65536 + 48 * 256 + 112

NOTES = {
    'g_v_g': '来源：半年报（通机1H26收入18.52亿，−15.2%；发电机−47%，美国极端天气减少）、天风3Q点评（3Q26通机6.6亿，−45%）→ 前三季度约25.1亿，约−26%；'
             '纪要1023（前三季度通机利润同比少约6000万）。2026E −25% ≈ 前三季度增速（隐含4Q26约7.5亿，约−22%，4Q25基数较低）；ASP持平；2027–28E +3%为模型假设；宗申资产置换未签约，暂不建模',
    'eng_g': '来源：半年报（自主摩托发动机1H26 16.03亿，+31%；250cc以上两轮发动机销量+97%）、天风3Q点评（3Q26 8.1亿，+35%）→ 前三季度约24.1亿，+32%；'
             '2026E取+30%（隐含4Q26约+23%，略低于前三季度）；2027–28E +20%为原模型假设',
    'trd_g': '来源：半年报（三轮1H26 10.23亿，+16%；其中国内3.58亿，约−8%）、纪要1023b（国内电三轮价格做不下去，顺丰未中标）；2026E取−8%，2027–28E持平。'
             '国内+出口2026E约+14%，与天风3Q三轮+12%一致',
    'trx_g': '来源：纪要1023（出口30%以上没有问题）、半年报（1H26出口6.65亿，+36%）；取30%',
    'bm_g': '来源：半年报（宝马业务1H26 3.62亿，−11.8%：摩托车1.75亿、发动机1.87亿）；2026E取上半年增速，2027–28E −5%为原模型假设',
    'be_g': '来源：同上（宝马发动机1H26 1.87亿）；2026E −12%，2027–28E −5%',
    'oem_g': '来源：半年报（代工贴牌通路车1H26 18.32亿，−27%）、天风3Q点评（3Q26贴牌及其他14.2亿，+11%；扣除宝马和小分部后估算代工3Q约11.7亿，约+26%，墨西哥客户去年上半年囤货、下半年基数低）、'
             '纪要1023（9月环比亮眼主要是墨西哥客户，勿外推；长期个位数增长）；2026E按2H同比+12%（3Q约+26%、4Q约持平）；2027–28E +3%',
    'opex': '来源：3S。4Q26E按去年节奏 = 2025全年×(1+前三季度同比)−前三季度（2025年起费用集中在四季度；纪要1023b：绩效等人力费用与去年节奏一样）+ 员工持股4Q费用约1.1亿（临2026-039）；'
            '上限 = 第131行考核达标可承受费用：员工持股第一期（40%）解锁需2026年扣费前归母+10%，年末绩效计提由管理层控制，按刚好达标计；'
            '少计提部分从管理费用扣（3S第234行），2027年不延续。未达标则第一期费用不确认，4Q归母同样约1.5亿',
}

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL); s = wb.Worksheets('3S'); rp = wb.Worksheets('Revenue Projection')
    q = wb.Worksheets('问题'); t = wb.Worksheets('投资逻辑'); band = wb.Worksheets('估值区间')
    hdr = {str(rp.Cells(1, c).Value): c for c in range(1, 30) if rp.Cells(1, c).Value}
    L = lambda n: rp.Cells(1, n).Address.split('$')[1]
    Y26, Q4, NC = L(hdr['2026E']), L(hdr['4Q26E']), L(hdr['重点'])
    assert Y26 == 'G', Y26
    labels = {'trd_g': '三轮车国内增长', 'trx_g': '三轮车出口增长', 'bm_g': '宝马摩托车代工增长', 'be_g': '宝马发动机代工增长',
              'oem_g': '普通2轮摩托车代工增长', 'eng_g': '自主摩托发动机增长', 'g_v_g': '销量增长', 'opex': '期间费用（税金+销售+管理+研发）'}
    for k, lab in labels.items():
        assert str(rp.Range(f'A{R[k]}').Value) == lab, (k, rp.Range(f'A{R[k]}').Value)
    keys = ('ni', 'q4', 'rev', 'q4rev', 'ni27', 'ni28', 'eps26', 'eps27')
    get = lambda: dict(zip(keys, (s.Range('H37').Value / 1e5, s.Range('S37').Value / 1e5, s.Range('H4').Value / 1e5, s.Range('S4').Value / 1e5,
                                   s.Range('I37').Value / 1e5, s.Range('J37').Value / 1e5, s.Range('H44').Value, s.Range('I44').Value)))
    before = get()
    segs = {r: rp.Range(f'{Y26}{r}').Value for r in (12, 29, 31, 33, 35, 37, 39)}

    # RP: 2026E segment inputs
    def A(k, v):
        c = rp.Range(f"{Y26}{R[k]}"); c.Formula = v; c.Font.Color = PURPLE
    A('g_v_g', -0.25); A('eng_g', 0.30); A('trd_g', -0.08); A('bm_g', -0.12); A('be_g', -0.12)
    A('oem_g', f"=(18.32+(F{R['oem']}-18.32/(1-26.97%))*(1+12%))/F{R['oem']}-1")
    for k, v in NOTES.items():
        rp.Range(f"{NC}{R[k]}").Value = v

    # 3S: 4Q26 admin = catch-up, capped at KPI threshold; cut kept out of the 2027 base
    unc = 'G14*Y14/X14-Y14-H233'
    s.Range('S14').Formula = f"=MAX({unc},-'Revenue Projection'!{Q4}{R['kpi_x']}*100000-S10-S12-S16)"
    if s.Range('S14').Comment is not None: s.Range('S14').Comment.Delete()
    s.Range('S14').AddComment('4Q26E = 2025全年×(1+前三季度同比)−前三季度−员工持股费用(H233)，上限为RP第131行考核达标可承受费用（员工持股第一期解锁需2026年扣费前归母+10%）；少计提部分见第234行')
    s.Range('B234').Value = 'Admin accrual cut in 4Q26 to meet ESOP KPI'; s.Range('C234').Value = '4Q26管理费用为考核达标少计提'
    s.Range('C234').Font.Name = 'KaiTi'
    s.Range('H234').Formula = f'=S14-({unc})'; s.Range('H234').NumberFormat = s.Range('H233').NumberFormat
    s.Range('I14').Formula = '=(H14+H233-H234)*(1+8%)-I233'
    if s.Range('I14').Comment is not None: s.Range('I14').Comment.Delete()
    s.Range('I14').AddComment('2027E管理费用 = 2026年核心管理费用（扣除员工持股费用，并加回4Q26为考核少计提的部分H234）×1.08 + 员工持股费用；绩效计提2027年恢复正常')
    xl.CalculateFull()
    after = get()

    # fixed text that quotes model numbers
    opex4 = rp.Range(f"{Q4}{R['opex']}").Value; cut = s.Range('H234').Value / 1e5
    q.Range('D5').Value = (f'4Q26E期间费用约{opex4:.1f}亿元：按去年节奏（核心费用随前三季度增速，集中在四季度）约{opex4 + cut:.1f}亿，含员工持股费用1.1亿'
                           f'（按10月授予、40/30/30解锁摊销：2026年1.1亿、2027年1.9亿、2028年0.6亿）；员工持股第一期解锁需2026年扣费前归母+10%，'
                           f'模型按管理层压低年末绩效计提、刚好达标计（少计提约{cut:.1f}亿），4Q26E归母约{after["q4"]:.2f}亿元，FY26约{after["ni"]:.1f}亿元。')
    pe, sd = band.Range('C16').Value, band.Range('C18').Value
    g26 = 1 - after['ni'] / 20.75; g27 = 1 - after['ni27'] / 24.85
    t.Range('B9').Value = (f'5. 估值：按一致预期前瞻P/E约13x，接近5年均值（约12x，+0.4SD）；按我们盈利约{pe:.0f}x（+{sd:.1f}SD）。'
                           f'我们2026–27E归母比一致预期低约{g26 * 100:.0f}%/{g27 * 100:.0f}%：一致预期隐含4Q26归母约5亿，我们按去年四季度费用节奏、仅压到员工持股考核达标线（约{after["q4"]:.1f}亿）。')
    xl.CalculateFull(); wb.Save()

    print('segments 2026E', {r: (round(segs[r], 2), round(rp.Range(f'{Y26}{r}').Value, 2)) for r in segs})
    for k in keys:
        print(f'{k:6s} {before[k]:8.3f} -> {after[k]:8.3f}')
    print('4Q opex', round(opex4, 2), '| cut', round(cut, 2), '| allowed', round(rp.Range(f"{Q4}{R['kpi_x']}").Value, 2),
          '| KPI need', round(rp.Range(f"{Q4}{R['kpi']}").Value, 2), '| 4Q GM', round(s.Range('S7').Value / s.Range('S4').Value, 4),
          '| 4Q rev YoY', round(s.Range('S4').Value / s.Range('O4').Value - 1, 4))
    print('FY27 rev', round(s.Range('I4').Value / 1e5, 2), '| model fwd P/E', round(pe, 1), round(sd, 2), '| TP', round(t.Range('C16').Value, 2))
    print('D5:', q.Range('D5').Value); print('B9:', t.Range('B9').Value)
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
