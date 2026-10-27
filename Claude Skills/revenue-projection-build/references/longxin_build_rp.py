"""Step 9: Revenue Projection v3 — original RP layout/colours, quarterly columns, lean (Excel COM).

A label | B unit | C–I 2022A–2028E | J–Q 1Q25A–4Q26E | R 重点 (user's notes). Explanations of purple/derived cells are cell comments.
"""
import os, re, shutil, json
from datetime import datetime
import win32com.client as w32

F = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(F, '隆鑫通用 1025.xlsx')
assert not os.path.exists(os.path.join(F, '~$隆鑫通用 1025.xlsx')), 'model open'
bk = os.path.join(F, 'work', f'隆鑫通用 1025.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx'); shutil.copy2(MODEL, bk); print('backup', bk)

FYC = {2022: 'C', 2023: 'D', 2024: 'E', 2025: 'F', 2026: 'G', 2027: 'H', 2028: 'I'}
QS = [(2025, 1), (2025, 2), (2025, 3), (2025, 4), (2026, 1), (2026, 2), (2026, 3), (2026, 4)]
QC = dict(zip(QS, 'JKLMNOPQ'))
S3FY = {2022: 'D', 2023: 'E', 2024: 'F', 2025: 'G', 2026: 'H', 2027: 'I', 2028: 'J'}
S3Q = dict(zip(QS, 'LMNOPQRS'))
ANN = 'CDEFGHI'; QTR = 'JKLMNOPQ'; ALL = ANN + QTR
D1 = '_ * #,##0.0_ ;_ * \\-#,##0.0_ ;_ * "-"??_ ;_ @_ '
INT = '_ * #,##0_ ;_ * \\-#,##0_ ;_ * "-"??_ ;_ @_ '
PCT = '0.0%'

specs = []
def blank(): specs.append(('blank',))
def sub(title, fill): specs.append(('sub', title, fill))
def lab(title, note=None): specs.append(('lab', title, note))
def row(key, label, unit, cells, fmt=D1, bold=False, blue=False, note=None, com=None):
    specs.append(('row', dict(key=key, label=label, unit=unit, cells=cells, fmt=fmt, bold=bold, blue=blue, note=note, com=com or {})))
A = lambda v: (v, 'a'); Fm = lambda v: (v, 'f')
def yoy(key, years=range(2023, 2029), q=True):
    c = {FYC[y]: Fm(f'=IFERROR({FYC[y]}{{{key}}}/{FYC[y-1]}{{{key}}}-1,"")') for y in years}
    if q: c.update({QC[(2026, k)]: Fm(f'=IFERROR({QC[(2026,k)]}{{{key}}}/{QC[(2025,k)]}{{{key}}}-1,"")') for k in (1, 2, 3)})
    return c
def grow(key, years=(2026, 2027, 2028)):
    return {FYC[y]: Fm(f'={FYC[y-1]}{{{key}}}*(1+{FYC[y]}{{{key}_g}})') for y in years}

# fills (theme, tint) or rgb
FILL_MOTO = ('t', 5, 0.4); FILL_WJ = ('t', 9, 0.8); FILL_ATV = ('t', 3, -0.25); FILL_GM = ('rgb', 0x42DFF4)
FILL_GP = ('rgb', 0xCCFFCC); FILL_COST = ('t', 6, 0.8); FILL_PROFIT = ('t', 8, 0.8)

# ---------- 收入 ----------
row('rev', '收入', '亿元', {c: Fm(f'={c}{{tot}}') for c in ALL}, bold=True)
row('main', '主营业务', '亿元', {'C': Fm(122.7400428765), 'D': Fm(129.0574626964), 'E': Fm(166.928435756), 'F': Fm(189.7869228265)})
row('othb', '其他业务', '亿元', {'C': Fm(1.3616832984), 'D': Fm(1.6073498854), 'E': Fm(1.2939738221), 'F': Fm(1.564621823)})
tot = {c: Fm(f'=SUM({c}{{main}}:{c}{{othb}})') for c in 'CDEF'}
tot.update({c: Fm(f'={c}{{seg}}') for c in 'GHI' + QTR})
row('tot', '合计', '亿元', tot, bold=True, com={'Q': '4Q26E = 无极出口 + 无极国内 + ATV（季度假设）+ 其他业务（年度分项 − 前三季度）→ 3S S4'})
row('tot_g', '收入增长', '%', yoy('tot'), fmt=PCT)
blank()
# ---------- 收入分拆 ----------
lab('收入分拆')
row('moto', '摩托车及发动机', '亿元', {**{c: Fm(f'={c}{{moto_d}}+{c}{{moto_x}}') for c in 'CDEF'}, **{c: Fm(f'={c}{{m_tot}}') for c in 'GHI'}}, bold=True)
row('moto_d', '国内', '亿元', {'C': Fm(28.4043568042), 'D': Fm(33.7963099777), 'E': Fm(46.4626131261), 'F': Fm(48.8099617635)})
row('moto_x', '国外', '亿元', {'C': Fm(50.6213548546), 'D': Fm(60.8784033375), 'E': Fm(80.4136632335), 'F': Fm(92.4573528744)})
row('gem', '通用机械产品', '亿元', {**{c: Fm(f'={c}{{gem_d}}+{c}{{gem_x}}') for c in 'CDEF'}, **{c: Fm(f'={c}{{g_v}}*{c}{{g_p}}/10000') for c in 'GHI'}}, bold=True)
row('gem_d', '国内', '亿元', {'C': Fm(6.1900564922), 'D': Fm(6.0472049676), 'E': Fm(8.9013460996), 'F': Fm(9.4364822778)})
row('gem_x', '国外', '亿元', {'C': Fm(27.9483858581), 'D': Fm(21.2874401034), 'E': Fm(26.4466271243), 'F': Fm(34.1107024642)})
row('gen', '大型商用发电机组', '亿元', {'C': Fm('=3.9205571832+1.3459971746'), 'D': Fm('=2.6527172192+1.3652104075'), 'E': Fm('=1.8600685023+0.650180331'),
     'F': Fm('=1.8752872756+0.2345411947'), 'G': A('=0.7242850679*2'), 'H': A('=G{gen}'), 'I': A('=H{gen}')}, com={'G': '1H26实际0.72亿元×2（半年报分部，无指引）'})
row('parts', '高端零部件', '亿元', {'C': Fm('=2.0166175343+2.0564302629'), 'D': Fm('=1.5343508635+1.3189695073'), 'E': Fm('=0.9825756877+1.0341329473'),
     'F': Fm('=1.4924405311+1.2243190265'), 'G': A('=0.4039896890*2'), 'H': A('=G{parts}'), 'I': A('=H{parts}')}, com={'G': '1H26实际0.40亿元×2；汽车零部件−61%，战略收缩'})
row('oseg', '其他', '亿元', {'C': Fm('=0.9111773225+0.6867926883'), 'D': Fm('=1.0989193098+0.6852868883'), 'E': Fm('=1.1184519064+0.3527506199'),
     'F': Fm('=1.0538291513+0.6566280904'), 'G': A('=0.4843686892*2'), 'H': A('=G{oseg}'), 'I': A('=H{oseg}')}, com={'G': '1H26实际0.48亿元×2'})
othq = {c: Fm(f'={c}{{seg}}-{c}{{wd}}-{c}{{wx}}-{c}{{atv}}') for c in 'CDEFGHI' + 'JKLMNOP'}
othq['Q'] = Fm('=(G{seg}-G{wd}-G{wx}-G{atv})-SUM(N{othq}:P{othq})')
row('othq', '其他业务（三轮、代工、宝马、发动机、通机等）', '亿元', othq,
    com={'J': '季度 = 收入合计 − 无极国内 − 无极出口 − ATV', 'Q': '= 2026E年度分项 − 前三季度'})
seg = {c: Fm(f'={c}{{moto}}+{c}{{gem}}+{c}{{gen}}+{c}{{parts}}+{c}{{oseg}}') for c in ANN}
seg.update({QC[q]: Fm(f"='3S'!{S3Q[q]}4/100000") for q in QS[:7]})
seg['Q'] = Fm('=Q{wd}+Q{wx}+Q{atv}+Q{othq}')
row('seg', '合计', '亿元', seg, bold=True)
row('seg_g', '合计增长', '%', yoy('seg'), fmt=PCT)
blank()
# ---------- 摩托车及发动机细分 ----------
sub('摩托车及发动机细分', FILL_MOTO)
def brand(key, label, hist, h1_25, m9_25, h1_26, m9_26, split_q1_25, split_q1_26, ann_fc, g4, note, gnote):
    c = dict(hist)
    c.update({'J': Fm(f'=({h1_25})*{split_q1_25}'), 'K': Fm(f'={h1_25}-J{{{key}}}'), 'L': Fm(f'={m9_25}-({h1_25})'), 'M': Fm(f'=F{{{key}}}-({m9_25})'),
              'N': Fm(f'={h1_26}*{split_q1_26}'), 'O': Fm(f'={h1_26}-N{{{key}}}'), 'P': Fm(f'={m9_26}-{h1_26}'), 'Q': Fm(f'=M{{{key}}}*(1+Q{{{key}_g}})'),
              'G': Fm(f'=SUM(N{{{key}}}:Q{{{key}}})')})
    c.update(ann_fc)
    row(key, label, '亿元', c, blue=True, note=note,
        com={'J': '1Q/2Q按月度销量（Data）拆分1H（推算）', 'L': '3Q = 前三季度 − 上半年（年报/半年报/纪要）', 'G': '2026E = 前三季度实际 + 4Q26E'})
    gc = yoy(key); gc['Q'] = A(g4)
    row(key + '_g', label + '增长', '%', gc, fmt=PCT, com={'Q': gnote})
brand('wd', '无极国内', {'C': Fm('=D{wd}/(1+0.3381)'), 'D': Fm('=E{wd}/(1+1.1445)'), 'E': Fm(18.08), 'F': Fm('=39.54-F{wx}')},
      '9.54/1.2086', '(37.4/1.233-21.54/1.253)', '9.54', '(37.4-21.54)',
      'Data!K18/(Data!K18+Data!L18)', 'Data!O18/(Data!O18+Data!P18)',
      {'H': Fm('=H{wd_r}'), 'I': Fm('=I{wd_r}')}, 0.20, '3亿毛利，收入下跌收窄',
      '4Q26E同比20%：同3Q；CU换代强周期，四季度淡季、基数小（纪要1023）')
brand('wx', '无极出口', {'C': Fm('=D{wx}/(1+1.0281)'), 'D': Fm('=E{wx}/(1+1.075)'), 'E': Fm(13.46), 'F': Fm(25.07)},
      '14.15/1.189', '21.54/1.253', '14.15', '21.54',
      'Data!K16/(Data!K16+Data!L16)', 'Data!O16/(Data!O16+Data!P16)',
      {'H': Fm('=H{ex_r}'), 'I': Fm('=I{ex_r}')}, 0.40, None,
      '4Q26E同比40%：450X 8月4千多台、9月5千多台，排产继续提升；对应全年约+30%（指引）')
brand('atv', 'ATV业务', {'C': Fm('=D{atv}/(1+1.2348)'), 'D': Fm('=E{atv}/(1+0.7385)'), 'E': Fm(4.03), 'F': Fm(6.54)},
      '5.72/2.0939', '8.56/1.8478', '5.72', '8.56',
      "'3S'!L4/('3S'!L4+'3S'!M4)", "'3S'!P4/('3S'!P4+'3S'!Q4)",
      {'H': Fm('=H{atv_r}'), 'I': Fm('=I{atv_r}')}, 0.30, '去年3.6万辆',
      '4Q26E同比30%：3Q约+50%，欧洲铺货因素消退；管理层“短期保持50%增速”（纪要1023b）')
row('trd', '三轮车国内', '亿元', {'E': Fm('=(F{trd}+F{trx})/(1+0.3247)-E{trx}'), 'F': Fm('=18.28-F{trx}'), **grow('trd')})
row('trd_g', '三轮车国内增长', '%', {'F': Fm('=F{trd}/E{trd}-1'), 'G': A(0), 'H': A(0), 'I': A(0)}, fmt=PCT, com={'G': '国内电三轮价格做不下去，顺丰未中标（纪要1023b）'})
row('trx', '三轮车出口', '亿元', {'E': Fm('=F{trx}/(1+0.6595)'), 'F': Fm(10.55), **grow('trx')})
row('trx_g', '三轮车出口增长', '%', {'F': Fm('=F{trx}/E{trx}-1'), 'G': A(0.3), 'H': A(0.3), 'I': A(0.3)}, fmt=PCT, com={'G': '指引：出口30%以上没有问题'})
row('bm', '宝马摩托车代工', '亿元', {'C': Fm(3.64), 'D': Fm(4.94), 'E': Fm(4.82), 'F': Fm(4.4), **grow('bm')})
row('bm_g', '宝马摩托车代工增长', '%', {'D': Fm('=D{bm}/C{bm}-1'), 'E': Fm('=E{bm}/D{bm}-1'), 'F': Fm('=F{bm}/E{bm}-1'), 'G': A(-0.05), 'H': A(-0.05), 'I': A(-0.05)}, fmt=PCT)
row('be', '宝马发动机代工', '亿元', {'C': Fm(4.12), 'D': Fm(4.17), 'E': Fm('=F{be}/(1-0.1054)'), 'F': Fm(3.74), **grow('be')})
row('be_g', '宝马发动机代工增长', '%', {'D': Fm('=D{be}/C{be}-1'), 'E': Fm('=E{be}/D{be}-1'), 'F': Fm('=F{be}/E{be}-1'), 'G': A(-0.05), 'H': A(-0.05), 'I': A(-0.05)}, fmt=PCT)
row('oem', '普通2轮摩托车代工', '亿元', {'E': Fm(49.2), 'F': Fm('=48.78-F{bm}'), **grow('oem')}, note='今天代工继续下滑（顾客取消了3款代工车型，不确定是否')
row('oem_g', '普通2轮摩托车代工增长', '%', {'F': Fm('=F{oem}/E{oem}-1'), 'G': A(-0.14), 'H': A(0.03), 'I': A(0.03)}, fmt=PCT,
    com={'G': '1H26代工贴牌通路车18.32亿（−27%，半年报）；Q3同比转正；按2H≈2H25+3%', 'H': '纪要1023b：贴牌长期个位数增长'})
row('eng', '自主摩托发动机', '亿元', {'C': Fm(14.5), 'D': Fm(16.7), 'E': Fm(19.32), 'F': Fm(24.39), **grow('eng')})
row('eng_g', '自主摩托发动机增长', '%', {'D': Fm('=D{eng}/C{eng}-1'), 'E': Fm('=E{eng}/D{eng}-1'), 'F': Fm('=F{eng}/E{eng}-1'), 'G': A(0.2), 'H': A(0.2), 'I': A(0.2)}, fmt=PCT,
    com={'G': '无指引；沿用原假设+20%（2025年+26%），待验证'})
row('m_tot', '合计', '亿元', {c: Fm(f'=SUM({c}{{wd}},{c}{{wx}},{c}{{atv}},{c}{{trd}},{c}{{trx}},{c}{{bm}},{c}{{be}},{c}{{oem}},{c}{{eng}})') for c in 'EFGHI'}, bold=True)
row('m_tot_g', '合计增长', '%', yoy('m_tot', years=range(2025, 2029), q=False), fmt=PCT)
blank()
# ---------- 无极海外细分 ----------
sub('无极海外细分', FILL_WJ)
row('ex_r', '无极海外收入', '亿元', {'F': Fm('=F{wx}'), 'G': Fm('=G{wx}'), 'H': Fm('=H{ex_v}*H{ex_p}'), 'I': Fm('=I{ex_v}*I{ex_p}')})
lab('无极系列销量分拆', '去年出口12万辆（8欧洲，2南美，1-2东南亚） 20多万辆很牛了')
row('eu', '欧洲', '万辆', {'F': Fm(8.9), 'G': Fm('=G{ex_v}-G{la}-G{sea}'), 'H': Fm('=H{eu_t}'), 'I': Fm('=I{eu_t}')}, com={'G': '2026E = 出口总量 − 拉美 − 东南亚（倒算）'})
row('la', '南美洲', '万辆', {'F': Fm(1.7), 'G': A(4.0), 'H': A('=G{la}*(1+40%)'), 'I': A('=H{la}*(1+40%)')},
    note='目前按拉美地区，东南亚+其他地区分别每年增加3千辆出口（但是不确定）',
    com={'G': '纪要1023：拉美今年3.5–4万台（取上限）', 'H': '+40%/年；管理层看3–4年15–20万台；墨西哥、巴西放量看明年'})
row('sea', '东南亚+其他', '万辆', {'F': Fm('=F{ex_v}-F{eu}-F{la}'), 'G': A('=F{sea}+0.3'), 'H': A('=G{sea}+0.3'), 'I': A('=H{sea}+0.3')})
row('ex_v', '合计销量', '万辆', {'F': Fm(12.7), 'G': Fm('=11.36+Q{wx}/(21.54/11.36)'), 'H': Fm('=SUM(H{eu}:H{sea})'), 'I': Fm('=SUM(I{eu}:I{sea})')}, bold=True,
    com={'G': '前三季度11.36万辆（+32%，纪要1023b）+ 4Q26E（4Q收入 ÷ 前三季度均价）'})
row('ex_v_g', '合计销量增长', '%', {c: Fm(f'={c}{{ex_v}}/{p}{{ex_v}}-1') for c, p in zip('GHI', 'FGH')}, fmt=PCT)
row('ex_p', '无极出海ASP', '万元', {'F': Fm('=F{ex_r}/F{ex_v}'), 'G': Fm('=G{ex_r}/G{ex_v}'), 'H': Fm('=G{ex_p}*(1+H{ex_p_g})'), 'I': Fm('=H{ex_p}*(1+I{ex_p_g})')}, fmt='0.00', bold=True)
row('ex_p_g', 'ASP增长', '%', {'G': Fm('=G{ex_p}/F{ex_p}-1'), 'H': A(0.05), 'I': A(0.05)}, fmt=PCT, com={'G': '前三季度出口均价同比约−5%（拉美/小排量结构、汇率）；无极5月已提价'})
blank()
row('m_eu', '欧洲市场拆分', '万辆', {'F': A(200), 'G': Fm('=F{m_eu}*(1+G{m_eu_g})'), 'H': Fm('=G{m_eu}*(1+H{m_eu_g})'), 'I': Fm('=H{m_eu}*(1+I{m_eu_g})')}, fmt=INT, bold=True,
    note='预计欧洲摩托车市场年增3%')
row('m_eu_g', '欧洲市场年增长', '%', {'G': A(0.03), 'H': A(0.03), 'I': A(0.03)}, fmt=PCT)
row('m_st', '街车', '万辆', {c: Fm(f'={c}{{m_eu}}*35%') for c in 'FGHI'})
row('m_adv', 'ADV', '万辆', {c: Fm(f'={c}{{m_eu}}*35%') for c in 'FGHI'})
row('m_sc', '踏板和其他', '万辆', {c: Fm(f'={c}{{m_eu}}-{c}{{m_st}}-{c}{{m_adv}}') for c in 'FGHI'})
blank()
lab('无极欧洲销量拆分')
row('eu_st', '街车', '万辆', {c: Fm(f'={c}{{m_st}}*{c}{{sh_st}}') for c in 'FGHI'}, note='预计27年公司开始推街车，目前已经有几个型号了')
row('eu_adv', 'ADV', '万辆', {'F': Fm(4.45), **{c: Fm(f'={c}{{m_adv}}*{c}{{sh_adv}}') for c in 'GHI'}})
row('eu_sc', '踏板和其他', '万辆', {'F': Fm(4.45), **{c: Fm(f'={c}{{m_sc}}*{c}{{sh_sc}}') for c in 'GHI'}}, note='26年有一个新款踏板X450，公司告诉卖方推测增量销售(1-2万台）')
row('eu_t', '总欧洲销量', '万辆', {c: Fm(f'=SUM({c}{{eu_st}}:{c}{{eu_sc}})') for c in 'FGHI'}, bold=True)
row('eu_t_g', '欧洲销量增长', '%', {c: Fm(f'={c}{{eu_t}}/{p}{{eu_t}}-1') for c, p in zip('GHI', 'FGH')}, fmt=PCT)
blank()
lab('无极欧洲市占率', '从欧洲市占率出发估计')
row('sh_st', '街车', '%', {'F': Fm('=F{eu_st}/F{m_st}'), 'G': A(0), 'H': A('=G{sh_st}+0.5%'), 'I': A('=H{sh_st}+0.5%')}, fmt=PCT, note='街车推测起步会比较慢')
scale = '*(G{eu}/F{eu})/(G{m_eu}/F{m_eu})'
row('sh_adv', 'ADV', '%', {'F': Fm('=F{eu_adv}/F{m_adv}'), 'G': Fm('=F{sh_adv}' + scale), 'H': A('=G{sh_adv}+1%'), 'I': A('=H{sh_adv}+1%')}, fmt=PCT,
    note='ADV/踏板因有品牌影响力，市占率增长我推测在每年1%', com={'G': '2026E按欧洲倒算销量同比例放大；1H26欧洲五国上牌份额5.79%（半年报）'})
row('sh_sc', '踏板和其他', '%', {'F': Fm('=F{eu_sc}/F{m_sc}'), 'G': Fm('=F{sh_sc}' + scale), 'H': A('=G{sh_sc}+1%'), 'I': A('=H{sh_sc}+1%')}, fmt=PCT)
row('sh_all', '综合市占率', '%', {c: Fm(f'={c}{{eu_t}}/{c}{{m_eu}}') for c in 'FGHI'}, fmt=PCT, bold=True)
blank()
# ---------- 无极国内细分 ----------
sub('无极国内细分', FILL_WJ)
row('wd_r', '无极国内收入', '亿元', {**{c: Fm(f'={c}{{wd}}') for c in 'CDEFG'}, 'H': Fm('=H{wd_v}*H{wd_p}'), 'I': Fm('=I{wd_v}*I{wd_p}')})
row('wd_v', '无极国内销量', '万辆', {'C': Fm(3.6), 'D': Fm(4.6), 'E': Fm(10.1),
     'F': Fm('=(20.9/1.25-11.36/1.32)+M{wd}/((37.4/1.233-21.54/1.253)/(20.9/1.25-11.36/1.32))'),
     'G': Fm('=(20.9-11.36)+Q{wd}/((37.4-21.54)/(20.9-11.36))'), 'H': Fm('=G{wd_v}*(1+H{wd_v_g})'), 'I': Fm('=H{wd_v}*(1+I{wd_v_g})')},
    com={'F': '前三季度推算8.1万辆 + 4Q25（按前三季度均价）≈8.9万辆；管理层“8万内销”为取整', 'G': '前三季度 = 无极20.9万辆 − 出口11.36万辆；+ 4Q26E'})
row('wd_v_g', '无极国内销量增长', '%', {'D': Fm('=D{wd_v}/C{wd_v}-1'), 'E': Fm('=E{wd_v}/D{wd_v}-1'), 'F': Fm('=F{wd_v}/E{wd_v}-1'), 'G': Fm('=G{wd_v}/F{wd_v}-1'),
     'H': A(0), 'I': A(0)}, fmt=PCT, com={'H': '强周期后持平：行业仍疲软，目标“不能下桌”'})
row('wd_p', '无极国内ASP', '万元', {**{c: Fm(f'={c}{{wd_r}}/{c}{{wd_v}}') for c in 'CDEFG'}, 'H': Fm('=G{wd_p}*(1+H{wd_p_g})'), 'I': Fm('=H{wd_p}*(1+I{wd_p_g})')}, fmt='0.00')
row('wd_p_g', 'ASP增长', '%', {'G': Fm('=G{wd_p}/F{wd_p}-1'), 'H': A(0.01), 'I': A(0.01)}, fmt=PCT)
blank()
# ---------- ATV细分 ----------
sub('ATV细分', FILL_ATV)
row('atv_r', '总收入', '亿元', {**{c: Fm(f'={c}{{atv}}') for c in 'EFG'}, 'H': Fm('=H{atv_v}*H{atv_p}'), 'I': Fm('=I{atv_v}*I{atv_p}')})
row('atv_v', '销量', '万辆', {'E': Fm(2.3517), 'F': Fm(3.5923), 'G': Fm('=F{atv_v}*(1+G{atv_v_g})'), 'H': Fm('=G{atv_v}*(1+H{atv_v_g})'), 'I': Fm('=H{atv_v}*(1+I{atv_v_g})')})
row('atv_v_g', '销量增长', '%', {'F': Fm('=F{atv_v}/E{atv_v}-1'), 'G': A(0.5), 'H': A(0.4), 'I': A(0.3)}, fmt=PCT, note='叶总说全年50%+销量增长',
    com={'G': '指引：全年约50%（销量口径），收入增速高于销量'})
row('atv_p', 'ASP', '万元', {**{c: Fm(f'={c}{{atv_r}}/{c}{{atv_v}}') for c in 'EFG'}, 'H': Fm('=G{atv_p}*(1+H{atv_p_g})'), 'I': Fm('=H{atv_p}*(1+I{atv_p_g})')}, fmt='0.00')
row('atv_p_g', 'ASP增长', '%', {'F': Fm('=F{atv_p}/E{atv_p}-1'), 'G': Fm('=G{atv_p}/F{atv_p}-1'), 'H': A(0.05), 'I': A(0.05)}, fmt=PCT)
blank()
# ---------- 通用机械产品细分 ----------
sub('通用机械产品细分', FILL_MOTO)
row('g_r', '通用机械产品收入', '亿元', {c: Fm(f'={c}{{gem}}') for c in ANN}, note='后续会置换，宗申发动机资产，收入体量相当，利润不如通机')
row('g_v', '销量', '万台', {'C': Fm(327.35), 'D': Fm(271.46), 'E': Fm(367.08), 'F': Fm(386.55), 'G': Fm('=F{g_v}*(1+G{g_v_g})'), 'H': Fm('=G{g_v}*(1+H{g_v_g})'), 'I': Fm('=H{g_v}*(1+I{g_v_g})')})
row('g_v_g', '销量增长', '%', {'D': Fm('=D{g_v}/C{g_v}-1'), 'E': Fm('=E{g_v}/D{g_v}-1'), 'F': Fm('=F{g_v}/E{g_v}-1'), 'G': A(-0.12), 'H': A(0.03), 'I': A(0.03)}, fmt=PCT,
    com={'G': '1H26收入−15.2%（发电机−47%）；9M利润同比少约6000万；宗申资产置换未签约，暂不建模'})
row('g_p', 'ASP', '元', {**{c: Fm(f'={c}{{gem}}/{c}{{g_v}}*10000') for c in 'CDEF'}, 'G': Fm('=F{g_p}*(1+G{g_p_g})'), 'H': Fm('=G{g_p}*(1+H{g_p_g})'), 'I': Fm('=H{g_p}*(1+I{g_p_g})')}, fmt=INT)
row('g_p_g', 'ASP增长', '%', {'D': Fm('=D{g_p}/C{g_p}-1'), 'E': Fm('=E{g_p}/D{g_p}-1'), 'F': Fm('=F{g_p}/E{g_p}-1'), 'G': A(0), 'H': A(0), 'I': A(0)}, fmt=PCT)
blank()
# ---------- 毛利率细分 ----------
sub('毛利率细分', FILL_GM)
row('gm_m', '摩托车及发动机', '%', {'D': Fm('=1-(27.8348934069+49.9381673399)/D{moto}'), 'E': Fm('=1-(38.1415785581+65.9687165246)/E{moto}'),
     'F': Fm('=1-(40.0647009196+72.9963091524)/F{moto}'), **{c: Fm(f'={c}{{gp_m}}/{c}{{moto}}') for c in 'GHI'}}, fmt=PCT, bold=True,
    com={'G': '1H26报告19.6%；分项（卖方口径）2025年与报告一致'})
row('gm_md', '国内', '%', {'D': Fm('=1-27.8348934069/D{moto_d}'), 'E': Fm('=1-38.1415785581/E{moto_d}'), 'F': Fm('=1-40.0647009196/F{moto_d}')}, fmt=PCT)
row('gm_mx', '国外', '%', {'D': Fm('=1-49.9381673399/D{moto_x}'), 'E': Fm('=1-65.9687165246/E{moto_x}'), 'F': Fm('=1-72.9963091524/F{moto_x}')}, fmt=PCT)
lab('推测：（卖方数据）')
def gmr(key, label, e, f, g, h, i, com=None, note=None):
    row(key, label, '%', {'E': Fm(e), 'F': Fm(f), 'G': A(g), 'H': A(h), 'I': A(i)}, fmt=PCT, com=com, note=note)
GMCOM = '2026E = 2025 − 0.5个点：原材料+汇率压制约2个点，5月提价部分对冲（纪要1023/1023b）'
gmr('gm_wd', '无极国内', 0.14, 0.21, '=F{gm_wd}-0.5%', '=G{gm_wd}', '=H{gm_wd}', com={'G': GMCOM})
gmr('gm_wx', '无极出海', 0.26, 0.284, '=F{gm_wx}-0.5%', '=G{gm_wx}+0.2%', '=H{gm_wx}+0.2%', com={'G': GMCOM})
gmr('gm_tr', '三轮车（国内外）', 0.18, 0.20, '=F{gm_tr}-0.5%', '=G{gm_tr}+0.2%', '=H{gm_tr}+0.2%', com={'G': GMCOM})
gmr('gm_oem', '普通2轮摩托车代工', 0.17, 0.175, '=F{gm_oem}-0.5%', '=G{gm_oem}', '=H{gm_oem}', com={'G': GMCOM})
gmr('gm_atv', 'ATV', 0.27, 0.29, '=F{gm_atv}-0.5%', '=G{gm_atv}+0.5%', '=H{gm_atv}+0.5%', com={'G': GMCOM})
gmr('gm_eng', '其他（发动机+宝马代工）', 0.17, 0.145, '=F{gm_eng}-0.5%', '=G{gm_eng}', '=H{gm_eng}', com={'G': GMCOM})
row('gm_g', '通用机械产品', '%', {'D': Fm('=1-(5.2277235636+16.4088896693)/D{gem}'), 'E': Fm('=1-(7.6607008776+21.5724475208)/E{gem}'),
     'F': Fm('=1-(8.1788866859+28.2794501143)/F{gem}'), 'G': A('=(18.5244319402-15.3243240402)/18.5244319402'), 'H': A('=G{gm_g}'), 'I': A('=H{gm_g}')},
    fmt=PCT, bold=True, com={'G': '1H26实际（半年报分部）'})
row('gm_gen', '大型商用发电机组', '%', {'D': Fm('=1-(2.4235920961+1.2691039475)/D{gen}'), 'E': Fm('=1-(1.6658868847+0.5976143463)/E{gen}'),
     'F': Fm('=1-(1.7031321342+0.2206299947)/F{gen}'), 'G': A('=(0.7242850679-0.6203251458)/0.7242850679'), 'H': A('=G{gm_gen}'), 'I': A('=H{gm_gen}')}, fmt=PCT)
row('gm_parts', '高端零部件', '%', {'D': Fm('=1-(1.0341912892+1.3065752381)/D{parts}'), 'E': Fm('=1-(0.9531284048+1.4191573226)/E{parts}'),
     'F': Fm('=1-(1.1130653238+1.6975340347)/F{parts}'), 'G': A('=(0.4039896890-0.2678581353)/0.4039896890'), 'H': A('=G{gm_parts}'), 'I': A('=H{gm_parts}')}, fmt=PCT)
row('gm_oseg', '其他', '%', {'D': Fm('=1-(0.5270626723+0.4724480411)/D{oseg}'), 'E': Fm('=1-(0.4066012268+0.2539935117)/E{oseg}'),
     'F': Fm('=1-(0.2665626669+0.4245088493)/F{oseg}'), 'G': A('=(0.4843686892-0.0968209877)/0.4843686892'), 'H': A('=G{gm_oseg}'), 'I': A('=H{gm_oseg}')}, fmt=PCT)
row('gm_t', '合计', '%', {c: Fm(f'=IFERROR({c}{{gp}}/{c}{{rev}},"")') for c in ALL}, fmt=PCT, bold=True)
blank()
# ---------- 毛利细分 ----------
sub('毛利细分', FILL_GP)
row('gp_m', '摩托车及发动机', '亿元', {c: Fm(f'=SUM({c}{{gp_wd}}:{c}{{gp_eng}})') for c in 'EFGHI'}, bold=True)
row('gp_wd', '无极国内', '亿元', {c: Fm(f'={c}{{wd}}*{c}{{gm_wd}}') for c in 'EFGHI'})
row('gp_wx', '无极出海', '亿元', {c: Fm(f'={c}{{wx}}*{c}{{gm_wx}}') for c in 'EFGHI'})
row('gp_tr', '三轮车（国内外）', '亿元', {c: Fm(f'=({c}{{trd}}+{c}{{trx}})*{c}{{gm_tr}}') for c in 'EFGHI'})
row('gp_oem', '普通2轮摩托车代工', '亿元', {c: Fm(f'={c}{{oem}}*{c}{{gm_oem}}') for c in 'EFGHI'})
row('gp_atv', 'ATV', '亿元', {c: Fm(f'={c}{{atv}}*{c}{{gm_atv}}') for c in 'EFGHI'})
row('gp_eng', '其他（发动机+宝马代工）', '亿元', {c: Fm(f'=({c}{{bm}}+{c}{{be}}+{c}{{eng}})*{c}{{gm_eng}}') for c in 'EFGHI'})
row('gp_g', '通用机械产品', '亿元', {c: Fm(f'={c}{{gem}}*{c}{{gm_g}}') for c in 'DEFGHI'}, bold=True)
row('gp_o', '发电机组、零部件及其他', '亿元', {c: Fm(f'={c}{{gen}}*{c}{{gm_gen}}+{c}{{parts}}*{c}{{gm_parts}}+{c}{{oseg}}*{c}{{gm_oseg}}') for c in 'DEFGHI'})
gp = {c: Fm(f"='3S'!{S3FY[y]}7/100000") for y, c in FYC.items() if y <= 2025}
gp.update({QC[q]: Fm(f"='3S'!{S3Q[q]}7/100000") for q in QS[:7]})
gp.update({c: Fm(f'={c}{{gp_m}}+{c}{{gp_g}}+{c}{{gp_o}}') for c in 'GHI'})
gp['Q'] = Fm('=G{gp}-SUM(N{gp}:P{gp})')
row('gp', '合计', '亿元', gp, bold=True, com={'Q': '4Q26E毛利 = 2026E分项毛利 − 前三季度实际 → 3S S6'})
row('cost', '营业成本合计', '亿元', {c: Fm(f'={c}{{rev}}-{c}{{gp}}') for c in ALL}, bold=True)
blank()
# ---------- 四季度与考核 ----------
sub('四季度与考核', FILL_COST)
S3ALL = {**{c: S3FY[y] for y, c in FYC.items()}, **{QC[q]: S3Q[q] for q in QS}}
row('opex', '期间费用（税金+销售+管理+研发）', '亿元', {c: Fm(f"=-('3S'!{s}10+'3S'!{s}12+'3S'!{s}14+'3S'!{s}16)/100000") for c, s in S3ALL.items()},
    com={'Q': '费用率同4Q25（3S S列）；纪要1023b：绩效等人力费用与去年节奏一样'})
row('opex_r', '期间费用率', '%', {c: Fm(f'=IFERROR({c}{{opex}}/{c}{{rev}},"")') for c in ALL}, fmt=PCT)
row('ni', '归母净利润', '亿元', {c: Fm(f"='3S'!{s}37/100000") for c, s in S3ALL.items()}, bold=True)
row('ni_g', '归母净利润增长', '%', yoy('ni'), fmt=PCT)
row('kpi', '考核：归母净利+10%所需', '亿元', {'G': Fm('=F{ni}*1.1'), 'Q': Fm('=G{kpi}-SUM(N{ni}:P{ni})')},
    com={'G': '分析师称考核增长10%，管理层未否认；自主品牌必须，营收/净利润二选一（纪要1023b）', 'Q': '达标所需4Q归母'})
row('kpi_x', '达标可承受4Q期间费用', '亿元', {'Q': Fm("=Q{gp}+('3S'!S18+'3S'!S20+'3S'!S22)/100000-Q{kpi}/(1-'3S'!H34)")},
    com={'Q': '= 4Q毛利 + 其他损益 − 所需归母 ÷ (1−税率)；对比本行上方期间费用'})
blank()
# ---------- 利润推测细分 ----------
sub('利润推测细分', FILL_PROFIT)
NI3 = {'F': 'G', 'G': 'H', 'H': 'I', 'I': 'J'}
def unit(p, title, vol, asp, gm, tax, sell, adm, rd, nim_note, asp_note=None):
    specs.append(('subb', title))
    row(p + 'v', '销量', '万辆', {c: Fm(f'={c}{{{vol}}}') for c in 'FGHI'})
    row(p + 'p', 'ASP' if p != 'ue_' else '欧洲ASP', '万元', {c: Fm(asp(c)) for c in 'FGHI'}, fmt='0.00', note=asp_note)
    row(p + 'r', '收入', '亿元', {c: Fm(f'={c}{{{p}v}}*{c}{{{p}p}}') for c in 'FGHI'})
    row(p + 'gm', '毛利率', '%', {c: Fm(f'={c}{{{gm}}}') for c in 'FGHI'}, fmt=PCT)
    row(p + 'gp', '毛利', '亿元', {c: Fm(f'={c}{{{p}r}}*{c}{{{p}gm}}') for c in 'FGHI'})
    for k, labx, vals in (('tax', '税金及附加', tax), ('sell', '销售费', sell), ('adm', '管理费', adm), ('rd', '研发费', rd)):
        row(p + k, labx, '% 收入', {c: A(v) for c, v in zip('FGHI', vals)}, fmt=PCT)
    row(p + 'pbt', '税前利润', '亿元', {c: Fm(f'={c}{{{p}gp}}-SUM({c}{{{p}tax}}:{c}{{{p}rd}})*{c}{{{p}r}}') for c in 'FGHI'})
    row(p + 't', '税率', '%', {c: A(0.15) for c in 'FGHI'}, fmt=PCT)
    row(p + 'ni', '净利润', '亿元', {c: Fm(f'=(1-{c}{{{p}t}})*{c}{{{p}pbt}}') for c in 'FGHI'}, bold=True)
    row(p + 'nim', '净利润率', '%', {c: Fm(f'={c}{{{p}ni}}/{c}{{{p}r}}') for c in 'FGHI'}, fmt=PCT, note=nim_note)
    row(p + 'npu', '净利/辆', '元/辆', {c: Fm(f'={c}{{{p}ni}}/{c}{{{p}v}}*10000') for c in 'FGHI'}, fmt=INT)
    row(p + 'sh', title + '利润占比', '%', {c: Fm(f"={c}{{{p}ni}}*100000/'3S'!{NI3[c]}37") for c in 'FGHI'}, fmt=PCT, bold=True)
    blank()
unit('ue_', '欧洲无极', 'eu_t', lambda c: f'={c}{{ex_p}}*1.08', 'gm_wx', (0.003,) * 4, (0.012,) * 4, (0.037, 0.036, 0.035, 0.034), (0.04, 0.039, 0.038, 0.037),
     '管理层：15-20% 净利润', '预测比出海ASP高8%（不确定）')
unit('ud_', '国内无极', 'wd_v', lambda c: f'={c}{{wd_p}}', 'gm_wd', (0.085,) * 4, (0.035,) * 4, (0.037, 0.036, 0.035, 0.034), (0.03,) * 4, '管理层：2%左右 净利润')
unit('ua_', 'ATV', 'atv_v', lambda c: f'={c}{{atv_p}}', 'gm_atv', (0.003,) * 4, (0.02, 0.019, 0.018, 0.017), (0.037, 0.036, 0.035, 0.034), (0.04, 0.039, 0.038, 0.037),
     '管理层：ATV利润率要比无极出海好')

# original top-of-page memo (0630 column Q rows 2–42), placed down column R from row 2 as before
MEMO = ['叶总+团队（隆鑫）', '目前的股息率没有吸引力', '不在高成长赛道', None, None,
        '5月份海运货柜紧张：欧美客户提前抢货，旺季提前；船公司之前控舱/停航，实际舱位不足；',
        '红海绕航导致船周转变慢；美国关税预期刺激提前出货；再加上部分港口拥堵、空箱回流慢。', '有一个CU625的出口订单 600多，加上其他的产品发不出去',
        '挤兑（中国所有的出口都在增加）- 打仗（航路变长）', None, '欧洲税的政策有点关系，但是3月份紧张程度已经开始了',
        '出口FOB：配合公司，客户要么是找不到箱子，要么不愿意付那么高的价格买箱子', None, '国内卖3万，国外卖5万，有利润空间托货柜从上海到重庆', None,
        '应对欧洲政策：', '1. 土耳其合作伙伴 （一万多台到几千台）', '欧洲整车出口，拉美，东南亚，要求CKD方式（全散装件）',
        '2. 没人关心618关税（欧盟觉得中国对欧出口太多、欧盟对华贸易逆差太大，正在考虑用更多关税、配额、反补贴调查来限制中国商品进入欧洲。',
        '3. 海外基地（泰国）(越南有通机的厂）', '宗申机车（不算宗申动力）：资源综合，新股东的泰国资产非常不饱和', '置换交易 - 最看好这个泰国的资产', None,
        '去年出口12万辆（8欧洲，2南美，1-2东南亚） 20多万辆很牛了', '今年欧洲（10万辆）- 欧洲总共200万辆，份额5% - 管理层说相应的车型还没布局到位',
        '欧洲单车ASP 2万-2.1/2.2万 （净利润率15-20%）- 一辆车3千块钱', '欧洲最牛才7个亿（700mn）利润', None, 'ADV + 街车 = 60-70% 欧洲市场，各占一般',
        'ADV 4万量，踏板4万辆', '70万街车', '70万拉力 = 5.7% -> 7%', '60万踏板 = 7% -> 8.3%', None, '800 街车 - 去年1万辆 今年 1.6-1.7万辆 （无授权费）',
        '900 街车 - 去年1万辆 今天 6-7千', None, '欧洲网点1000+', None, '长期分红规划', '宗申配合有点 上下游资源战略配合']

# ---------------- layout ----------------
R = {}; r = 2; layout = []
for s in specs:
    layout.append((r, s))
    if s[0] == 'row': R[s[1]['key']] = r
    r += 1
END = r - 1
def res(v): return re.sub(r'\{(\w+)\}', lambda m: str(R[m.group(1)]), v) if isinstance(v, str) else v
HEAD = {**{c: f'{y}{"A" if y <= 2025 else "E"}' for y, c in FYC.items()}, **{QC[q]: f'{q[1]}Q{q[0] % 100}{"A" if q != (2026, 4) else "E"}' for q in QS}}
PURPLE = 160 * 65536 + 48 * 256 + 112; BLUE = 192 * 65536 + 112 * 256; WHITE = 0xFFFFFF; NOTEC = 0x595959

xl = w32.DispatchEx('Excel.Application'); xl.Visible = False; xl.DisplayAlerts = False; xl.ScreenUpdating = False
wb = None
try:
    wb = xl.Workbooks.Open(MODEL); xl.Calculation = -4135
    ws = wb.Worksheets.Add(After=wb.Worksheets('3S')); ws.Name = 'RP_new'
    grid = [[''] * 18 for _ in range(END)]
    def put(rr, c, v): grid[rr - 1][ord(c) - 65] = v
    put(1, 'B', '单位'); put(1, 'R', '重点')
    for c, h in HEAD.items(): put(1, c, h)
    rowkind = {}
    for rr, s in layout:
        if s[0] in ('sub', 'subb'): put(rr, 'A', s[1]); rowkind[rr] = s
        elif s[0] == 'lab':
            put(rr, 'A', s[1]); rowkind[rr] = s
            if s[2]: put(rr, 'R', s[2])
        elif s[0] == 'row':
            d = s[1]; put(rr, 'A', d['label']); put(rr, 'B', d['unit'])
            for c, (v, k) in d['cells'].items(): put(rr, c, res(v))
            if d['note']: put(rr, 'R', d['note'])
            rowkind[rr] = s
    for i, m in enumerate(MEMO):   # memo down column R from row 2 where free
        rr = 2 + i
        if m and not grid[rr - 1][17]: grid[rr - 1][17] = m
    ws.Range(f'A1:R{END}').Formula = tuple(tuple(x) for x in grid)
    # ---- styles (original RP) ----
    ws.Cells.Font.Name = 'Calibri'; ws.Cells.Font.Size = 10
    ws.Range(f'A1:B{END}').Font.Name = 'KaiTi'; ws.Range(f'R1:R{END}').Font.Name = 'KaiTi'; ws.Range(f'R2:R{END}').Font.Color = NOTEC
    ws.Range(f'B1:B{END}').HorizontalAlignment = -4108
    h = ws.Range('A1:R1'); h.Interior.ThemeColor = 5; h.Interior.TintAndShade = -0.25; h.Font.Color = WHITE; h.Font.Bold = True
    ws.Range('C1:Q1').HorizontalAlignment = -4152
    def fill(rg, f):
        if f[0] == 't': rg.Interior.ThemeColor = f[1]; rg.Interior.TintAndShade = f[2]
        else: rg.Interior.Color = f[1]
    for rr, s in layout:
        k = rowkind.get(rr)
        if not k: continue
        if k[0] == 'sub':
            fill(ws.Range(f'A{rr}:I{rr}'), k[2]); ws.Range(f'A{rr}').Font.Bold = True
        elif k[0] == 'subb':
            fill(ws.Range(f'A{rr}:I{rr}'), FILL_WJ); ws.Range(f'A{rr}').Font.Bold = True; ws.Range(f'A{rr}').Font.Color = BLUE
        elif k[0] == 'lab':
            ws.Range(f'A{rr}').Font.Bold = True
        else:
            d = k[1]
            ws.Range(f'C{rr}:Q{rr}').NumberFormat = d['fmt']
            if d['bold']: ws.Range(f'A{rr}:Q{rr}').Font.Bold = True
            if d['blue']:
                ws.Range(f'A{rr}:Q{rr}').Font.Color = BLUE; fill(ws.Range(f'A{rr}'), FILL_WJ)
            for c, (v, kind) in d['cells'].items():
                if kind == 'a':
                    cell = ws.Range(f'{c}{rr}'); cell.Font.Color = PURPLE; cell.Interior.ThemeColor = 10; cell.Interior.TintAndShade = 0.8
            if d['com']:   # user rule: notes go in 重点 (column R), never cell comments
                mine = '【模型】' + '；'.join(f"{HEAD.get(c, '')}：{txt}" if c in HEAD else txt for c, txt in d['com'].items())
                cur = ws.Range(f'R{rr}').Value
                ws.Range(f'R{rr}').Value = f'{cur}　{mine}' if cur else mine
    ws.Columns('A').ColumnWidth = 31.6; ws.Columns('B').ColumnWidth = 9
    for c in ANN: ws.Columns(c).ColumnWidth = 10.5
    for c in QTR: ws.Columns(c).ColumnWidth = 9.5
    ws.Columns('R').ColumnWidth = 110
    ws.Cells.WrapText = False
    ws.Activate(); xl.ActiveWindow.DisplayGridlines = False
    xl.ActiveWindow.FreezePanes = False; ws.Range('C2').Select(); xl.ActiveWindow.FreezePanes = True; ws.Range('A1').Select()
    # ---- relink 3S, swap sheets ----
    s3 = wb.Worksheets('3S'); RPn = 'RP_new'
    s3.Range('S4').Formula = f"={RPn}!Q{R['tot']}*100000"; s3.Range('S6').Formula = f"=-{RPn}!Q{R['cost']}*100000"
    for c3, cr in (('I', 'H'), ('J', 'I')):
        s3.Range(f'{c3}4').Formula = f"={RPn}!{cr}{R['tot']}*100000"; s3.Range(f'{c3}6').Formula = f"=-{RPn}!{cr}{R['cost']}*100000"
    wb.Worksheets('Revenue Projection').Delete()
    ws.Name = 'Revenue Projection'
    xl.Calculation = -4105; xl.CalculateFull()
    print('3S links', [s3.Range(a).Formula for a in ('S4', 'S6', 'I4', 'I6', 'J4', 'J6')])
    v = lambda k, c: ws.Range(f'{c}{R[k]}').Value
    for k in ('tot', 'wd', 'wx', 'atv', 'othq', 'seg', 'm_tot', 'ex_v', 'ex_p', 'eu', 'wd_v', 'gp', 'gm_t', 'gm_m', 'ni', 'kpi', 'kpi_x', 'opex', 'ue_npu', 'ue_sh'):
        print(f'{k:7s}', ' '.join(f'{c}:{v(k,c):.2f}' if isinstance(v(k, c), float) else f'{c}:{v(k,c)}' for c in 'EFGHIJMNPQ'))
    print('3S NI 26/27/28', [round(s3.Range(f'{c}37').Value / 1e5, 2) for c in 'HIJ'], 'rows', END)
    wb.Save(); json.dump(R, open(os.path.join(F, 'work', 'lx_rp_rows.json'), 'w', encoding='utf-8'), ensure_ascii=False)
finally:
    if wb is not None: wb.Close(False)
    xl.Quit()
