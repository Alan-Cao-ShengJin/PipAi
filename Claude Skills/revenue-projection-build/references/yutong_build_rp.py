"""Rebuild the Revenue Projection tab as a quarterly, segment-level build (宇通客车)."""
import os, re, shutil, sys
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.styles.colors import Color
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter as gl

MODEL = r"C:\Users\Alan Cao\Desktop\Companies\宇通\宇通客车 1015.xlsx"
SCR = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(os.path.dirname(MODEL), "~$宇通客车 1015.xlsx")):
    sys.exit("model open in Excel")
shutil.copy2(MODEL, os.path.join(SCR, f"宇通客车 1015.backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx"))

wb = openpyxl.load_workbook(MODEL)
if "Revenue Projection_old" in wb.sheetnames:
    del wb["Revenue Projection_old"]
old = wb["Revenue Projection"]
idx = wb.sheetnames.index("Revenue Projection")
old.title = "Revenue Projection_old"
ws = wb.create_sheet("Revenue Projection", idx)


# ---------------- grid ----------------
FY = list(range(2022, 2029))
QS = [(y, q) for y in range(2024, 2029) for q in range(1, 5)]
def fyc(y): return gl(3 + FY.index(y))            # C..I
def qc(y, q): return gl(11 + QS.index((y, q)))   # K..AD
def qcols(y): return [qc(y, q) for q in range(1, 5)]
def act_q(y, q): return (y, q) <= (2026, 3)
def act_fy(y): return y <= 2025
NOTE = "AF"
NOTEC, GAPS, last_col = 32, (10, 31), 32
def drow(y, q): return 70 + (y - 2022) * 4 + (q - 1)          # Data quarterly block row
S3Q = {(2025, 1): "L", (2025, 2): "M", (2025, 3): "N", (2025, 4): "O", (2026, 1): "P", (2026, 2): "Q", (2026, 3): "R"}
S3OPEX = {(2026, 4): "S"}   # 3S forecast quarter column
S3FY = {2022: "D", 2023: "E", 2024: "F", 2025: "G", 2026: "H", 2027: "I", 2028: "J"}
REV24 = {1: 66.1597505924, 2: 97.1981354153, 3: 77.3905921583, 4: 131.4273878747}   # FactSet FF_SALES, 亿
NI24 = {1: 6.570548611, 2: 10.1670904382, 3: 7.5808897372, 4: 16.8434154386}       # FactSet FF_NET_INC, 亿
def sumq(y, r): return f"=SUM({qc(y,1)}{r}:{qc(y,4)}{r})"
def prevq(y, q): return qc(y - 1, q) if y - 1 >= 2024 else None

# ---------------- styles ----------------
HDR_FILL = PatternFill("solid", fgColor=Color(theme=4, tint=-0.249977111117893))
ASM_FILL = PatternFill("solid", fgColor=Color(theme=9, tint=0.7999816888943144))
BAND = PatternFill("solid", fgColor="FFF5FBFD")
PURPLE = "FF7030A0"
GREY = Color(theme=1, tint=0.499984740745262)
hair, med = Side(style="hair"), Side(style="medium")
INT = '_ * #,##0_ ;_ * \\-#,##0_ ;_ * "-"??_ ;_ @_ '
D1 = '_ * #,##0.0_ ;_ * \\-#,##0.0_ ;_ * "-"??_ ;_ @_ '
D2 = '_ * #,##0.00_ ;_ * \\-#,##0.00_ ;_ * "-"??_ ;_ @_ '
PCT, PCT0 = "0.0%", "0%"

# ---------------- row specs ----------------
specs, R = [], {}
def bar(title): specs.append(("bar", title))
def gap(): specs.append(("gap",))
def row(key, label, unit="", fy=None, q=None, fmt=INT, note=None, bold=False, grey=False, band=False):
    specs.append(("row", dict(key=key, label=label, unit=unit, fy=fy, q=q, fmt=fmt, note=note, bold=bold, grey=grey, band=band)))
A = lambda v: (v, True)      # assumption
F = lambda v: (v, False)     # formula / actual

# ===== 一、指引锚点 =====
bar("一、指引与管理层锚点")
row("anc_tot", "2026年总销量指引", "辆", fy=lambda y: A(50000) if y == 2026 else None, note="=Guidance!B5", band=True)
row("anc_dom", "2026年国内销量指引", "辆", fy=lambda y: A(30000) if y == 2026 else None, note="=Guidance!B6")
row("anc_exp", "2026年出口指引", "辆", fy=lambda y: A(19000) if y == 2026 else None, note="=Guidance!B7", band=True)
row("anc_nev", "2026年出口新能源指引", "辆", fy=lambda y: A(5000) if y == 2026 else None, note="=Guidance!B8")
row("anc_asp", "管理层口径：出口新能源单车价格", "万元",
    q=lambda y, q: A(185) if (y, q) == (2025, 3) else A(265) if (y, q) == (2026, 3) else None, fmt=D1, band=True,
    note="3Q26业绩会：今年三季度新能源单车价格260-270万；去年三季度180-190万（集中交付巴基斯坦300台低价单）")
gap()

# ===== 二、行业 =====
IND = {"ind_tot": [84202, 88224, 115471, 125969], "ind_dom": [62547, 55741, 70999, 67829],
       "ind_seat": [15407, 29204, 36311, 31586], "ind_bus": [41710, 22327, 29606, 31030], "ind_ovs": [21655, 32483, 44472, 58140]}
bar("二、行业（大中型客车，中客网/中汽协，年度）")
def indrow(k, lab, note=None, band=False, bold=False):
    row(k, lab, "辆", fy=lambda y: F(IND[k][y - 2022]) if y <= 2025 else None, note=note, band=band, bold=bold)
    row(k + "_yoy", "  同比", "%", fy=lambda y, k=k: F(f"={fyc(y)}{{{k}}}/{fyc(y-1)}{{{k}}}-1") if 2023 <= y <= 2025 else None,
        fmt=PCT, grey=True)
indrow("ind_tot", "行业销量合计", "9M26：大中型8.3万辆，同比+1.8%（3Q26业绩会）", band=True, bold=True)
indrow("ind_dom", "  国内", "9M26：国内3.9万辆，同比-4.6%；全年预计同比下降")
indrow("ind_seat", "    其中：国内座位客车", "9M26：座位车约2.1万辆，同比-9.6%（新能源购置税开征、旅游客运承压）", band=True)
indrow("ind_bus", "    其中：国内公交", "9M26：新能源公交约1.5万辆，同比+7.7%（以旧换新延续）")
indrow("ind_ovs", "  海外", "9M26：出口4.4万辆，同比+8.2%；新能源出口1.35万辆，同比+20.8%", band=True)
row("sh_dom", "宇通国内大中客份额", "%", fy=lambda y: F(f"={fyc(y)}{{ar_dz}}/{fyc(y)}{{ind_dom}}") if y <= 2025 else None,
    fmt=PCT, note="9M26约36%（宇通国内大中1.4万/行业3.9万）")
row("sh_ovs", "宇通海外份额", "%", fy=lambda y: F(f"={fyc(y)}{{ar_ovs}}/{fyc(y)}{{ind_ovs}}") if y <= 2025 else None,
    fmt=PCT, note="9M26约23%（宇通出口1万/行业4.4万）", band=True)
gap()

# ===== 三、销量拆分 =====
bar("三、销量拆分（辆）")
def vol_row(key, lab, dcol, anchor_fn, gkey, skey, note, band):
    def fy(y):
        if y <= 2023: return F(f"=SUM(Data!{dcol}{drow(y,1)}:{dcol}{drow(y,4)})")
        if y <= 2026: return F(sumq(y, f"{{{key}}}"))
        return F(f"={fyc(y-1)}{{{key}}}*(1+{fyc(y)}{{{gkey}}})")
    def qq(y, q):
        if act_q(y, q): return F(f"=Data!{dcol}{drow(y,q)}")
        if (y, q) == (2026, 4): return F(anchor_fn())
        return F(f"=${fyc(y)}{{{key}}}*{qc(y,q)}{{{skey}}}")
    row(key, lab, "辆", fy=fy, q=qq, bold=True, note=note, band=band)
    row(key + "_yoy", "  同比", "%", fmt=PCT, grey=True,
        fy=lambda y: F(f"=IFERROR({fyc(y)}{{{key}}}/{fyc(y-1)}{{{key}}}-1,\"\")") if y >= 2023 else None,
        q=lambda y, q: F(f"=IFERROR({qc(y,q)}{{{key}}}/{prevq(y,q)}{{{key}}}-1,\"\")") if prevq(y, q) else None)
def growth_row(gkey, g27, g28, note):
    row(gkey, "  年增速假设", "%", fmt=PCT, note=note,
        fy=lambda y: A(g27) if y == 2027 else A(g28) if y == 2028 else None)
def season_row(skey, key, note="2027E季节性=2024-2026同季占比均值；2028E沿用2027E"):
    def qq(y, q):
        if y <= 2026: return F(f"={qc(y,q)}{{{key}}}/${fyc(y)}{{{key}}}")
        if y == 2027: return A(f"=AVERAGE({qc(2024,q)}{{{skey}}},{qc(2025,q)}{{{skey}}},{qc(2026,q)}{{{skey}}})")
        return A(f"={qc(2027,q)}{{{skey}}}")
    row(skey, "  季节性占比（占全年）", "%", fmt=PCT, grey=True, q=qq, note=note)

# 国内
vol_row("dom", "国内销量", "F", lambda: f"={fyc(2026)}{{anc_dom}}-SUM({qc(2026,1)}{{dom}}:{qc(2026,3)}{{dom}})", "dom_g", "dom_s",
        "4Q26E=全年国内指引3万-前三季度实际（Guidance #2）", True)
growth_row("dom_g", 0.0, 0.02, "国内：2026E-8%后2027E企稳0%（座位客车承压、公司守价不守量，无回升证据），2028E+2%（国信2027E+3%偏乐观）")
season_row("dom_s", "dom")
row("dom_lsh", "  其中轻客占国内比例", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{dom_l}}/{fyc(y)}{{dom}}"),
    q=lambda y, q: F(f"={qc(y,q)}{{dom_l}}/{qc(y,q)}{{dom}}") if act_q(y, q) else A(f"={prevq(y,q)}{{dom_lsh}}"),
    note="预测期轻客占比=上年同季（结构不变假设）")
row("dom_dz", "  国内大中客", "辆",
    fy=lambda y: F(f"=SUM(Data!G{drow(y,1)}:G{drow(y,4)})") if y <= 2023 else F(sumq(y, "{dom_dz}")),
    q=lambda y, q: F(f"=Data!G{drow(y,q)}") if act_q(y, q) else F(f"={qc(y,q)}{{dom}}*(1-{qc(y,q)}{{dom_lsh}})"))
row("dom_l", "  国内轻客", "辆", fy=lambda y: F(f"={fyc(y)}{{dom}}-{fyc(y)}{{dom_dz}}"),
    q=lambda y, q: F(f"={qc(y,q)}{{dom}}-{qc(y,q)}{{dom_dz}}"))
# 出口传统
vol_row("ice", "出口传统（燃油）", "I",
        lambda: f"=({fyc(2026)}{{anc_exp}}-{fyc(2026)}{{anc_nev}})-SUM({qc(2026,1)}{{ice}}:{qc(2026,3)}{{ice}})", "ice_g", "ice_s",
        "4Q26E=（出口指引1.9万-新能源指引5000）-前三季度实际（Guidance #3/#4）", True)
growth_row("ice_g", 0.08, 0.05, "2027E出口大概率继续增长（Guidance #12）；非洲以旧换新需求+高端化 → 传统出口+8%/+5%（国信2027E传统出口+11%）")
season_row("ice_s", "ice")
# 出口新能源
vol_row("nev", "出口新能源", "J", lambda: f"={fyc(2026)}{{anc_nev}}-SUM({qc(2026,1)}{{nev}}:{qc(2026,3)}{{nev}})", "nev_g", "nev_s",
        "4Q26E=新能源出口指引5000-前三季度实际；12月交付集中（Guidance #4/#5）", True)
growth_row("nev_g", 0.20, 0.15, "欧洲纯电渗透率6%→10%+、城间车100→200+台（Guidance #13）→ 2027E+20%、2028E+15%（国信2027E+20%）")
season_row("nev_s", "nev")
row("exp", "出口合计", "辆", bold=True, band=True,
    fy=lambda y: F(f"={fyc(y)}{{ice}}+{fyc(y)}{{nev}}"), q=lambda y, q: F(f"={qc(y,q)}{{ice}}+{qc(y,q)}{{nev}}"))
row("exp_yoy", "  同比", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"=IFERROR({fyc(y)}{{exp}}/{fyc(y-1)}{{exp}}-1,\"\")") if y >= 2023 else None,
    q=lambda y, q: F(f"=IFERROR({qc(y,q)}{{exp}}/{prevq(y,q)}{{exp}}-1,\"\")") if prevq(y, q) else None)
row("nev_mix", "  新能源占出口", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{nev}}/{fyc(y)}{{exp}}"), q=lambda y, q: F(f"={qc(y,q)}{{nev}}/{qc(y,q)}{{exp}}"))
row("tot", "总销量", "辆", bold=True,
    fy=lambda y: F(f"={fyc(y)}{{dom}}+{fyc(y)}{{exp}}"), q=lambda y, q: F(f"={qc(y,q)}{{dom}}+{qc(y,q)}{{exp}}"))
row("tot_yoy", "  同比", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"=IFERROR({fyc(y)}{{tot}}/{fyc(y-1)}{{tot}}-1,\"\")") if y >= 2023 else None,
    q=lambda y, q: F(f"=IFERROR({qc(y,q)}{{tot}}/{prevq(y,q)}{{tot}}-1,\"\")") if prevq(y, q) else None)
row("exp_sh", "  出口占比", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{exp}}/{fyc(y)}{{tot}}"), q=lambda y, q: F(f"={qc(y,q)}{{exp}}/{qc(y,q)}{{tot}}"))
row("tot_chk", "  2026E总销量 − 总量指引", "辆", grey=True, fy=lambda y: F(f"={fyc(2026)}{{tot}}-{fyc(2026)}{{anc_tot}}") if y == 2026 else None,
    note="国内3万+出口1.9万=4.9万，指引为“约5万”；差额在指引的“约”字范围内")
gap()

# ===== 四、单价 =====
bar("四、单价（万元/辆）")
row("asp_dz", "国内大中客单价", "万元", fmt=D1, band=True,
    fy=lambda y: F(f"=({fyc(y)}{{ar_dom_rev}}*10000-{fyc(y)}{{ar_l}}*{fyc(y)}{{asp_l}})/{fyc(y)}{{ar_dz}}") if act_fy(y)
    else A(f"={fyc(y-1)}{{asp_dz}}"),
    q=lambda y, q: F(f"=${fyc(y)}{{asp_dz}}"),
    note="历史=年报国内收入扣除轻客收入/年报国内大中客销量；预测持平：国内价格战，公司守价不守量（业绩会），公交新能源占比提升对冲")
row("asp_l", "国内轻客单价", "万元", fmt=D1,
    fy=lambda y: A(20) if y == 2022 else A(f"={fyc(y-1)}{{asp_l}}"), q=lambda y, q: F(f"=${fyc(y)}{{asp_l}}"),
    note="无披露，粗估20万/辆（轻客收入约占整车收入4-5%，对结论影响小）")
row("asp_ice", "出口传统单价", "万元", fmt=D1, band=True,
    fy=lambda y: F(f"=({fyc(y)}{{ar_ovs_rev}}*10000-{fyc(y)}{{ar_nev}}*{fyc(y)}{{asp_nev}})/({fyc(y)}{{ar_ovs}}-{fyc(y)}{{ar_nev}})")
    if act_fy(y) else A(f"={fyc(y-1)}{{asp_ice}}*1.01"),
    q=lambda y, q: F(f"=${fyc(y)}{{asp_ice}}"),
    note="历史=（年报海外收入-新能源收入）/年报出口传统销量；预测每年+1%（高端化，Guidance #8）")
NEVQ = {(2025, 1): 280, (2025, 2): 280, (2025, 4): 280, (2026, 1): 280, (2026, 2): 270, (2026, 4): 260}
def asp_nev_fy(y):
    if y <= 2024: return A({2022: 190, 2023: 220, 2024: 220}[y])
    if y <= 2026: return F(f"=SUMPRODUCT({qc(y,1)}{{asp_nev}}:{qc(y,4)}{{asp_nev}},{qc(y,1)}{{nev}}:{qc(y,4)}{{nev}})/{fyc(y)}{{nev}}")
    return A({2027: 260, 2028: 255}[y])
def asp_nev_q(y, q):
    if y == 2024 or y >= 2027: return F(f"=${fyc(y)}{{asp_nev}}")
    if (y, q) in ((2025, 3), (2026, 3)): return A(f"={qc(y,q)}{{anc_asp}}")
    return A(NEVQ[(y, q)])
row("asp_nev", "出口新能源单价", "万元", fmt=D1, fy=asp_nev_fy, q=asp_nev_q,
    note="3Q25/3Q26=管理层口径；其余季度约280（海关1H26报关均价约283万，欧洲占比高）使2025全年≈250；4Q26E 260；2027E 260、2028E 255（欧盟IAA及出口退税13%→9%压力）")
gap()

# ===== 五、收入 =====
bar("五、收入（亿元）")
def rev_seg(key, vol, asp, lab, band=False):
    row(key, lab, "亿元", fmt=D1, band=band,
        fy=lambda y: F(f"={fyc(y)}{{{vol}}}*{fyc(y)}{{{asp}}}/10000") if y <= 2023 else F(sumq(y, f"{{{key}}}")),
        q=lambda y, q: F(f"={qc(y,q)}{{{vol}}}*{qc(y,q)}{{{asp}}}/10000"))
rev_seg("rev_dz", "dom_dz", "asp_dz", "国内大中客收入", True)
rev_seg("rev_l", "dom_l", "asp_l", "国内轻客收入", True)
row("rev_dom", "国内整车收入", "亿元", fmt=D1, bold=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_dz}}+{fyc(y)}{{rev_l}}"), q=lambda y, q: F(f"={qc(y,q)}{{rev_dz}}+{qc(y,q)}{{rev_l}}"))
rev_seg("rev_ice", "ice", "asp_ice", "出口传统收入", True)
rev_seg("rev_nev", "nev", "asp_nev", "出口新能源收入", True)
row("rev_exp", "出口整车收入", "亿元", fmt=D1, bold=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_ice}}+{fyc(y)}{{rev_nev}}"), q=lambda y, q: F(f"={qc(y,q)}{{rev_ice}}+{qc(y,q)}{{rev_nev}}"))
row("rev_main", "整车收入合计", "亿元", fmt=D1, bold=True, band=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_dom}}+{fyc(y)}{{rev_exp}}"), q=lambda y, q: F(f"={qc(y,q)}{{rev_dom}}+{qc(y,q)}{{rev_exp}}"))
row("rev_oth", "其他业务及口径差", "亿元", fmt=D1,
    fy=lambda y: F(f"={fyc(y)}{{rev_tot}}-{fyc(y)}{{rev_main}}") if y <= 2023 else F(sumq(y, "{rev_oth}")),
    q=lambda y, q: F(f"={qc(y,q)}{{rev_tot}}-{qc(y,q)}{{rev_main}}") if act_q(y, q) else F(f"={qc(y,q)}{{rev_main}}*{qc(y,q)}{{oth_r}}"),
    note="历史=实际总收入-整车收入（含配件、地产等其他业务，以及第三方销量口径差）")
row("oth_r", "  其他业务/整车收入", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_oth}}/{fyc(y)}{{rev_main}}"),
    q=lambda y, q: F(f"={qc(y,q)}{{rev_oth}}/{qc(y,q)}{{rev_main}}") if act_q(y, q) else A(f"={prevq(y,q)}{{oth_r}}"),
    note="预测期=上年同季比例（保留Q4年末结算偏高的季节性；9M26比例低于2025同期）")
def rev_tot_fy(y):
    return F(f"='3S'!{S3FY[y]}4/100000") if act_fy(y) else F(sumq(y, "{rev_tot}"))
def rev_tot_q(y, q):
    if y == 2024: return F(REV24[q])
    if act_q(y, q): return F(f"='3S'!{S3Q[(y,q)]}4/100000")
    return F(f"={qc(y,q)}{{rev_main}}+{qc(y,q)}{{rev_oth}}")
row("rev_tot", "营业总收入", "亿元", fmt=D1, bold=True, fy=rev_tot_fy, q=rev_tot_q, band=True,
    note="历史=3S实际（2024季度=FactSet单季）；预测=整车收入+其他业务 → 链接至3S")
row("rev_yoy", "  同比", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"=IFERROR({fyc(y)}{{rev_tot}}/{fyc(y-1)}{{rev_tot}}-1,\"\")") if y >= 2023 else None,
    q=lambda y, q: F(f"=IFERROR({qc(y,q)}{{rev_tot}}/{prevq(y,q)}{{rev_tot}}-1,\"\")") if prevq(y, q) else None)
row("cons_rev", "参考：FactSet一致预期营业收入", "亿元", fmt=D1, grey=True,
    fy=lambda y: F({2026: 458.8, 2027: 502.7, 2028: 553.0}[y]) if y >= 2026 else None,
    note="FactSet 2026-10-15，17家券商均值；三季报后多家下调，2026E偏高")
row("rev_exp_sh", "  出口收入占整车收入", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_exp}}/{fyc(y)}{{rev_main}}"), q=lambda y, q: F(f"={qc(y,q)}{{rev_exp}}/{qc(y,q)}{{rev_main}}"))
gap()

# ===== 六、毛利 =====
bar("六、毛利率与毛利（亿元）")
row("gm_dom", "国内毛利率（大中客/轻客同）", "%", fmt=PCT, band=True,
    fy=lambda y: F(f"=({fyc(y)}{{ar_dom_rev}}-{fyc(y)}{{ar_dom_cost}})/{fyc(y)}{{ar_dom_rev}}") if act_fy(y) else A(f"={fyc(y-1)}{{gm_dom}}"),
    q=lambda y, q: F(f"=${fyc(y)}{{gm_dom}}"), note="历史=年报国内毛利率；预测持平（国内价格竞争，守盈利质量）")
row("gm_ice", "出口传统毛利率", "%", fmt=PCT,
    fy=lambda y: A({2027: 0.205, 2028: 0.21}.get(y, 0.20)), q=lambda y, q: F(f"=${fyc(y)}{{gm_ice}}"),
    note="假设20%（与年报海外毛利率倒算一致）；2027-28E每年+0.5pp（高端化，Guidance #8）")
def gm_nev_fy(y):
    if act_fy(y):
        c = fyc(y)
        return F(f"=({c}{{ar_ovs_rev}}-{c}{{ar_ovs_cost}}-({c}{{ar_ovs_rev}}-{c}{{ar_nev}}*{c}{{asp_nev}}/10000)*{c}{{gm_ice}})/({c}{{ar_nev}}*{c}{{asp_nev}}/10000)")
    return F(f"={fyc(y)}{{gp_nev}}/{fyc(y)}{{rev_nev}}")
GMQ = {(2026, 1): 0.40, (2026, 2): 0.40, (2026, 3): 0.43, (2026, 4): 0.42, (2027, 1): 0.40, (2027, 2): 0.39, (2027, 3): 0.39,
       (2027, 4): 0.39, (2028, 1): 0.39, (2028, 2): 0.39, (2028, 3): 0.39, (2028, 4): 0.39}
row("gm_nev", "出口新能源毛利率", "%", fmt=PCT, band=True, fy=gm_nev_fy,
    q=lambda y, q: A(GMQ[(y, q)]) if y >= 2026 else F(f"=${fyc(y)}{{gm_nev}}"),
    note="历史=年报海外毛利扣除传统出口毛利倒算；3Q26 43%（高质量订单，Guidance #6）、4Q26E 42%（Q4毛利相对较高，Guidance #7）；1Q27E 40%、2Q27E起39%（出口退税13%→9%自2027-04-01，管理层称影响<2%收入，约一半转嫁 → -1pp）")
row("gm_oth", "其他业务毛利率", "%", fmt=PCT,
    fy=lambda y: F(f"=({fyc(y)}{{ar_oth_rev}}-{fyc(y)}{{ar_oth_cost}})/{fyc(y)}{{ar_oth_rev}}") if act_fy(y) else A(f"={fyc(y-1)}{{gm_oth}}"),
    q=lambda y, q: F(f"=${fyc(y)}{{gm_oth}}"), note="历史=年报其他（非国内/海外整车）毛利率；预测沿用2025")
def gp_seg(key, rev, gm, lab, band=False):
    row(key, lab, "亿元", fmt=D1, band=band,
        fy=lambda y: F(f"={fyc(y)}{{{rev}}}*{fyc(y)}{{{gm}}}") if y <= 2023 else F(sumq(y, f"{{{key}}}")),
        q=lambda y, q: F(f"={qc(y,q)}{{{rev}}}*{qc(y,q)}{{{gm}}}"))
gp_seg("gp_dom", "rev_dom", "gm_dom", "国内整车毛利", True)
gp_seg("gp_ice", "rev_ice", "gm_ice", "出口传统毛利")
gp_seg("gp_nev", "rev_nev", "gm_nev", "出口新能源毛利", True)
gp_seg("gp_oth", "rev_oth", "gm_oth", "其他业务毛利")
row("gp_mod", "模型毛利", "亿元", fmt=D1, bold=True, band=True,
    fy=lambda y: F(f"=SUM({fyc(y)}{{gp_dom}}:{fyc(y)}{{gp_oth}})"), q=lambda y, q: F(f"=SUM({qc(y,q)}{{gp_dom}}:{qc(y,q)}{{gp_oth}})"))
row("gp_act", "实际毛利（3S）", "亿元", fmt=D1,
    fy=lambda y: F(f"='3S'!{S3FY[y]}7/100000") if act_fy(y) else None,
    q=lambda y, q: F(f"='3S'!{S3Q[(y,q)]}7/100000") if (y, q) in S3Q else None)
row("gp_res", "  差额（实际−模型）", "亿元", fmt=D1, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{gp_act}}-{fyc(y)}{{gp_mod}}") if act_fy(y) else None,
    q=lambda y, q: F(f"={qc(y,q)}{{gp_act}}-{qc(y,q)}{{gp_mod}}") if (y, q) in S3Q else None,
    note="校准检验：正值=实际毛利高于模型（如3Q26高质量订单）；预测期无差额")
row("gp_tot", "毛利（实际/预测）", "亿元", fmt=D1, bold=True, band=True,
    fy=lambda y: F(f"={fyc(y)}{{gp_act}}") if act_fy(y) else F(sumq(y, "{gp_tot}")),
    q=lambda y, q: F(f"={qc(y,q)}{{gp_act}}") if (y, q) in S3Q else F(f"={qc(y,q)}{{gp_mod}}"),
    note="历史=实际；2024季度及预测期=模型")
row("gm_tot", "  综合毛利率", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{gp_tot}}/{fyc(y)}{{rev_tot}}"), q=lambda y, q: F(f"={qc(y,q)}{{gp_tot}}/{qc(y,q)}{{rev_tot}}"))
row("cost_tot", "营业成本", "亿元", fmt=D1, bold=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_tot}}-{fyc(y)}{{gp_tot}}"), q=lambda y, q: F(f"={qc(y,q)}{{rev_tot}}-{qc(y,q)}{{gp_tot}}"),
    note="链接至3S营业成本")
gap()

# ===== 七、单车利润 =====
bar("七、计算单车利润（万元/辆，估算）")
def s3ratio(c): return f"=-('3S'!{c}10+'3S'!{c}12+'3S'!{c}14+'3S'!{c}16+'3S'!{c}40)/'3S'!{c}4"
row("opex_r", "费用率（税金及附加+销售+管理+研发+财务）", "%", fmt=PCT, band=True,
    fy=lambda y: F(s3ratio(S3FY[y])),
    q=lambda y, q: F(s3ratio({**S3Q, **S3OPEX}[(y, q)])) if (y, q) in {**S3Q, **S3OPEX} else F(f"=${fyc(y)}{{opex_r}}"),
    note="取自3S；按收入分摊到各车型（大车、贵车分摊更多费用）")
row("etr", "所得税率", "%", fmt=PCT,
    fy=lambda y: F(f"='3S'!{S3FY[y]}48"),
    q=lambda y, q: F(f"='3S'!{ {**S3Q, **S3OPEX}[(y,q)]}48") if (y, q) in {**S3Q, **S3OPEX} else F(f"=${fyc(y)}{{etr}}"), note="取自3S（4Q26E=3S预测列）")
def unit_block(s, lab, vol, asp, gm, band):
    row(f"u_rev_{s}", lab + "：单车收入", "万元", fmt=D1, bold=True, band=band,
        fy=lambda y: F(f"={fyc(y)}{{{asp}}}"), q=lambda y, q: F(f"={qc(y,q)}{{{asp}}}"))
    row(f"u_gp_{s}", "  单车毛利", "万元", fmt=D1, band=band,
        fy=lambda y: F(f"={fyc(y)}{{u_rev_{s}}}*{fyc(y)}{{{gm}}}"), q=lambda y, q: F(f"={qc(y,q)}{{u_rev_{s}}}*{qc(y,q)}{{{gm}}}"))
    row(f"u_ox_{s}", "  单车分摊费用", "万元", fmt=D1, band=band,
        fy=lambda y: F(f"={fyc(y)}{{u_rev_{s}}}*{fyc(y)}{{opex_r}}"), q=lambda y, q: F(f"={qc(y,q)}{{u_rev_{s}}}*{qc(y,q)}{{opex_r}}"))
    row(f"u_np_{s}", "  单车净利润", "万元", fmt=D1, bold=True, band=band,
        fy=lambda y: F(f"=({fyc(y)}{{u_gp_{s}}}-{fyc(y)}{{u_ox_{s}}})*(1-{fyc(y)}{{etr}})"),
        q=lambda y, q: F(f"=({qc(y,q)}{{u_gp_{s}}}-{qc(y,q)}{{u_ox_{s}}})*(1-{qc(y,q)}{{etr}})"))
    row(f"pool_{s}", "  净利润贡献", "亿元", fmt=D2, band=band,
        fy=lambda y: F(f"={fyc(y)}{{u_np_{s}}}*{fyc(y)}{{{vol}}}/10000") if y <= 2023 else F(sumq(y, f"{{pool_{s}}}")),
        q=lambda y, q: F(f"={qc(y,q)}{{u_np_{s}}}*{qc(y,q)}{{{vol}}}/10000"))
unit_block("dz", "国内大中客", "dom_dz", "asp_dz", "gm_dom", True)
unit_block("l", "国内轻客", "dom_l", "asp_l", "gm_dom", False)
unit_block("ice", "出口传统", "ice", "asp_ice", "gm_ice", True)
unit_block("nev", "出口新能源", "nev", "asp_nev", "gm_nev", False)
row("pool_oth", "其他业务净利润贡献", "亿元", fmt=D2, band=True,
    fy=lambda y: F(f"={fyc(y)}{{rev_oth}}*({fyc(y)}{{gm_oth}}-{fyc(y)}{{opex_r}})*(1-{fyc(y)}{{etr}})") if y <= 2023 else F(sumq(y, "{pool_oth}")),
    q=lambda y, q: F(f"={qc(y,q)}{{rev_oth}}*({qc(y,q)}{{gm_oth}}-{qc(y,q)}{{opex_r}})*(1-{qc(y,q)}{{etr}})"))
row("np_mod", "经营性净利润（模型）", "亿元", fmt=D2, bold=True,
    fy=lambda y: F(f"={fyc(y)}{{pool_dz}}+{fyc(y)}{{pool_l}}+{fyc(y)}{{pool_ice}}+{fyc(y)}{{pool_nev}}+{fyc(y)}{{pool_oth}}"),
    q=lambda y, q: F(f"={qc(y,q)}{{pool_dz}}+{qc(y,q)}{{pool_l}}+{qc(y,q)}{{pool_ice}}+{qc(y,q)}{{pool_nev}}+{qc(y,q)}{{pool_oth}}"))
row("np_act", "归母净利润（3S；预测=3S预测）", "亿元", fmt=D2, band=True,
    fy=lambda y: F(f"='3S'!{S3FY[y]}51/100000"),
    q=lambda y, q: F(NI24[q]) if y == 2024 else F(f"='3S'!{ {**S3Q, **S3OPEX}[(y,q)]}51/100000") if (y, q) in {**S3Q, **S3OPEX} else None)
row("np_res", "  差额：其他收益/投资/公允价值/减值/营业外/少数股东等", "亿元", fmt=D2, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{np_act}}-{fyc(y)}{{np_mod}}"),
    q=lambda y, q: F(f"={qc(y,q)}{{np_act}}-{qc(y,q)}{{np_mod}}") if (y, q) <= (2026, 4) else None,
    note="单车口径不含非经营项目；差额稳定说明单车拆分合理")
row("nev_psh", "  出口新能源占经营性净利润", "%", fmt=PCT, grey=True,
    fy=lambda y: F(f"={fyc(y)}{{pool_nev}}/{fyc(y)}{{np_mod}}"), q=lambda y, q: F(f"={qc(y,q)}{{pool_nev}}/{qc(y,q)}{{np_mod}}"))
row("cons_np", "参考：FactSet一致预期归母净利润", "亿元", fmt=D2, grey=True,
    fy=lambda y: F({2026: 60.6, 2027: 68.0, 2028: 76.4}[y]) if y >= 2026 else None, note="FactSet 2026-10-15，17家券商均值")
row("gx_dom", "参考：国信单车净利假设 — 国内", "万元", fmt=D1, grey=True,
    fy=lambda y: F({2025: 2.234, 2026: 2.2, 2027: 2.2, 2028: 2.2}[y]) if y >= 2025 else None, note="国信汽车 2026-10-14 拆分模型（业绩测算-量利）")
row("gx_ice", "参考：国信单车净利假设 — 出口传统", "万元", fmt=D1, grey=True,
    fy=lambda y: F(10) if y >= 2025 else None)
row("gx_nev", "参考：国信单车净利假设 — 出口新能源", "万元", fmt=D1, grey=True,
    fy=lambda y: F({2025: 65, 2026: 70, 2027: 70, 2028: 61}[y]) if y >= 2025 else None)
gap()

# ===== 八、年报校准数据 =====
bar("八、年报校准数据（年度，来自年报）")
AR = {"ar_dz": [18123, 21631, 26863, 24220], "ar_l": [6392, 4722, 6055, 8149], "ar_ovs": [5683, 10165, 14000, 17149],
      "ar_nev": [1159, 1468, 2700, 4011],
      "ar_dom_rev": [139.350635, 136.968079, 175.786547, 154.022781], "ar_ovs_rev": [55.950834, 104.056149, 152.002824, 211.079063],
      "ar_dom_cost": [110.91764, 105.514836, 141.736652, 124.625412], "ar_ovs_cost": [39.1499, 71.115132, 108.745383, 148.556506]}
def arrow(k, lab, unit, fmt=INT, band=False, note=None):
    row(k, lab, unit, fmt=fmt, band=band, note=note, fy=lambda y: F(AR[k][y - 2022]) if y <= 2025 else None)
arrow("ar_dz", "年报国内大中客销量", "辆", band=True, note="年报：大型+中型国内销量")
arrow("ar_l", "年报国内轻客销量", "辆")
row("ar_dom", "年报国内销量", "辆", fy=lambda y: F(f"={fyc(y)}{{ar_dz}}+{fyc(y)}{{ar_l}}") if y <= 2025 else None, band=True)
arrow("ar_ovs", "年报海外销量", "辆")
arrow("ar_nev", "年报海外新能源销量", "辆", band=True)
row("ar_tot", "年报总销量", "辆", fy=lambda y: F(f"={fyc(y)}{{ar_dom}}+{fyc(y)}{{ar_ovs}}") if y <= 2025 else None, bold=True)
arrow("ar_dom_rev", "年报国内收入", "亿元", D1, True)
arrow("ar_ovs_rev", "年报海外收入", "亿元", D1)
row("ar_oth_rev", "年报其他收入（总收入-国内-海外）", "亿元", fmt=D1, band=True,
    fy=lambda y: F(f"='3S'!{S3FY[y]}4/100000-{fyc(y)}{{ar_dom_rev}}-{fyc(y)}{{ar_ovs_rev}}") if y <= 2025 else None)
arrow("ar_dom_cost", "年报国内成本", "亿元", D1)
arrow("ar_ovs_cost", "年报海外成本", "亿元", D1, True)
row("ar_oth_cost", "年报其他成本", "亿元", fmt=D1,
    fy=lambda y: F(f"=-'3S'!{S3FY[y]}6/100000-{fyc(y)}{{ar_dom_cost}}-{fyc(y)}{{ar_ovs_cost}}") if y <= 2025 else None)

# ---------------- spacer rows between metric groups ----------------
_sp = []
for s_ in specs:
    if s_[0] == "row" and not s_[1]["label"].startswith("  ") and _sp and _sp[-1][0] == "row":
        _sp.append(("sp",))
    _sp.append(s_)
specs = _sp

# ---------------- allocate rows ----------------
r = 4
for s in specs:
    if s[0] == "row":
        R[s[1]["key"]] = r
    r += 1

def fill(v):
    return v.format(**R) if isinstance(v, str) else v

# ---------------- write ----------------
KAI = lambda **k: Font(name="KaiTi", size=10, **k)
CAL = lambda **k: Font(name="Calibri", size=10, **k)
def bar_row(r, title):
    ws.cell(r, 1, title); ws.cell(r, 2, "单位")
    for y in FY: ws.cell(r, 3 + FY.index(y), f"{y}" if y <= 2025 else f"{y}E")
    ws.cell(r, NOTEC, "备注 / 假设依据")
    for (y, q) in QS: ws.cell(r, 11 + QS.index((y, q)), f"{q}Q{str(y)[2:]}" + ("" if act_q(y, q) else "E"))
    for c in range(1, last_col + 1):
        if c in GAPS: continue
        cell = ws.cell(r, c)
        cell.fill = HDR_FILL
        cell.font = (KAI if c in (1, 2, NOTEC) else CAL)(b=True, color=Color(theme=0))
        cell.border = Border()
        cell.alignment = Alignment(horizontal="left" if c in (1, NOTEC) else "center")

# title rows
bar_row(1, "宇通客车 收入预测（季度拆分）")
ws.cell(2, 1, "ACT实际 / EST预测").font = KAI(i=True)
for y in FY:
    c = ws.cell(2, 3 + FY.index(y), "ACT实际" if act_fy(y) else "EST预测"); c.font = KAI(i=True); c.alignment = Alignment(horizontal="center")
for (y, q) in QS:
    c = ws.cell(2, 11 + QS.index((y, q)), "ACT实际" if act_q(y, q) else "EST预测"); c.font = KAI(i=True); c.alignment = Alignment(horizontal="center")
lg = ws.cell(3, 1, "读表：紫字+浅橙底=假设（可改）；黑字=公式/实际；灰字=同比/占比/校验。FY2024起=季度加总；FY2027-28E=上年×(1+增速)，季度=全年×季节性。")
lg.font = KAI(i=True, color=GREY)

r = 4
band_on = False
SEP_COLS = {fyc(2026), qc(2026, 4)}   # first forecast FY / quarter column: medium left border
for s in specs:
    if s[0] == "bar":
        bar_row(r, s[1]); band_on = False
    elif s[0] == "gap":
        band_on = False
    elif s[0] == "row":
        d = s[1]
        if not d["label"].startswith("  "):
            band_on = not band_on
        a = ws.cell(r, 1, d["label"]); a.font = KAI(b=d["bold"], color=GREY if d["grey"] else None)
        ws.cell(r, 2, d["unit"]).font = KAI(color=GREY if d["grey"] else None)
        cells = []
        if d["fy"]:
            for y in FY:
                v = d["fy"](y)
                if v is not None: cells.append((3 + FY.index(y), v))
        if d["q"]:
            for (y, q) in QS:
                v = d["q"](y, q)
                if v is not None: cells.append((11 + QS.index((y, q)), v))
        asm_cols = set()
        for c, (val, asm) in cells:
            cell = ws.cell(r, c, fill(val))
            cell.number_format = d["fmt"]
            if asm:
                cell.font = CAL(color=PURPLE); asm_cols.add(c)
            else:
                cell.font = CAL(b=d["bold"], color=GREY if d["grey"] else None)
        if d["note"]:
            n = ws.cell(r, NOTEC, fill(d["note"])); n.font = KAI(color=GREY if d["grey"] else None)
        for c in range(1, last_col + 1):
            if c in GAPS: continue
            cell = ws.cell(r, c)
            if c in asm_cols: cell.fill = ASM_FILL
            elif band_on: cell.fill = BAND
            cell.border = Border()
    r += 1
# banding: extend band of a "bold" metric to its indented helper rows that follow
ws.column_dimensions["A"].width = 36
ws.column_dimensions["B"].width = 6
for c in list(range(3, 10)) + list(range(11, 31)):
    ws.column_dimensions[gl(c)].width = 10
for c in GAPS:
    ws.column_dimensions[gl(c)].width = 2
ws.column_dimensions[NOTE].width = 120
ws.freeze_panes = "C4"
ws.sheet_view.zoomScale = 85
# separate forecast quarters visually: thin left border at 4Q26E column header rows
print("rows:", len(specs), "last row", r - 1)

# ---------------- relink 3S and Data ----------------
s3 = wb["3S"]
for y, c in ((2026, "H"), (2027, "I"), (2028, "J")):
    s3[f"{c}4"] = f"='Revenue Projection'!{fyc(y)}{R['rev_tot']}*100000"
    s3[f"{c}6"] = f"=-'Revenue Projection'!{fyc(y)}{R['cost_tot']}*100000"
dt = wb["Data"]
for i, y in enumerate(range(2022, 2026)):
    rr = 94 + i
    dt[f"D{rr}"] = f"='Revenue Projection'!{fyc(y)}{R['ar_tot']}"
    dt[f"G{rr}"] = f"='Revenue Projection'!{fyc(y)}{R['ar_ovs']}"
    dt[f"J{rr}"] = f"='Revenue Projection'!{fyc(y)}{R['ar_nev']}"
    dt[f"M{rr}"] = f"='Revenue Projection'!{fyc(y)}{R['ar_dom']}"
wb.move_sheet("Revenue Projection_old", offset=len(wb.sheetnames) - 1 - wb.sheetnames.index("Revenue Projection_old"))
wb.calculation.fullCalcOnLoad = True
wb.save(MODEL)
import json
json.dump(R, open(os.path.join(SCR, "rp_rows.json"), "w"))
print("saved; key rows:", {k: R[k] for k in ("rev_tot", "cost_tot", "gp_tot", "tot", "u_np_nev", "np_mod")})
