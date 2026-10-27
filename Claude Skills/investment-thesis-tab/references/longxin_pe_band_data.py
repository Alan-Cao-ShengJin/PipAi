"""5-year forward P/E band data for 隆鑫通用 (FactSet month-end price; consensus NTM EPS where available, else realized NTM EPS)."""
import json, statistics as st, os
PX = {'2021-10':4.36,'2021-11':5.54,'2021-12':5.51,'2022-01':None,'2022-02':4.90,'2022-03':4.36,'2022-04':4.21,'2022-05':4.58,'2022-06':4.61,
'2022-07':5.15,'2022-08':4.76,'2022-09':4.51,'2022-10':5.18,'2022-11':5.37,'2022-12':4.86,'2023-01':5.38,'2023-02':5.39,'2023-03':5.16,'2023-04':4.80,
'2023-05':4.76,'2023-06':5.28,'2023-07':5.32,'2023-08':5.40,'2023-09':None,'2023-10':5.55,'2023-11':5.70,'2023-12':5.16,'2024-01':4.59,'2024-02':5.18,
'2024-03':6.26,'2024-04':6.49,'2024-05':7.32,'2024-06':6.78,'2024-07':6.63,'2024-08':6.96,'2024-09':7.91,'2024-10':8.17,'2024-11':7.86,'2024-12':9.10,
'2025-01':None,'2025-02':10.67,'2025-03':11.55,'2025-04':12.45,'2025-05':13.07,'2025-06':12.76,'2025-07':12.05,'2025-08':12.64,'2025-09':12.02,
'2025-10':13.61,'2025-11':14.37,'2025-12':16.11,'2026-01':15.34,'2026-02':15.75,'2026-03':13.50,'2026-04':15.36,'2026-05':13.05,'2026-06':11.93,
'2026-07':14.71,'2026-08':14.84,'2026-09':14.18,'2026-10':15.23}
# consensus NTM EPS, FactSet consensus_rolling NTMA, dated 1st of month -> assigned to prior month-end
CON = {'2022-11':0.53260,'2022-12':0.54038,'2023-01':0.55224,'2023-02':0.56333,'2023-03':0.57519,'2024-05':0.60748,'2024-06':0.61488,'2024-07':0.62252,
'2024-08':0.63016,'2024-10':0.64521,'2024-11':0.65260,'2024-12':0.66027,'2025-02':0.69973,'2025-03':0.70992,'2025-04':0.76641,'2025-05':0.92829,
'2025-06':0.96725,'2025-07':0.98296,'2025-08':1.05482,'2025-09':1.07814,'2025-10':1.11158,'2025-11':1.13273,'2025-12':1.12714,'2026-01':1.14783,
'2026-02':1.16300,'2026-03':1.17258,'2026-04':1.16421,'2026-05':1.18115,'2026-06':1.20491,'2026-07':1.20438,'2026-08':1.16134,'2026-09':1.17410,'2026-10':1.17410}
QEPS = {(2021,4):-0.159,(2022,1):0.1389,(2022,2):0.1358,(2022,3):0.1119,(2022,4):-0.1299,(2023,1):0.0901,(2023,2):0.1542,(2023,3):0.1408,(2023,4):-0.101,
(2024,1):0.1254,(2024,2):0.1616,(2024,3):0.1506,(2024,4):0.1084,(2025,1):0.2468,(2025,2):0.2763,(2025,3):0.2447,(2025,4):0.0346,(2026,1):0.2295,(2026,2):0.2565,(2026,3):0.2722}
def realized(ym):
    y, m = map(int, ym.split('-')); tot = 0
    for k in range(1, 13):
        mm = m + k; yy = y + (mm - 1) // 12; mm = (mm - 1) % 12 + 1
        q = (yy, (mm - 1) // 3 + 1)
        if q not in QEPS: return None
        tot += QEPS[q] / 3
    return tot
rows = []; last = None
for ym, px in PX.items():
    fill = px is None
    px = last if px is None else px; last = px
    if ym in CON: eps, basis = CON[ym], '一致预期'
    else:
        eps, basis = realized(ym), '实际NTM'
    rows.append(dict(month=ym, price=px, eps=eps, basis=basis + ('（股价沿用上月）' if fill else ''), pe=px / eps if eps else None))
pes = [r['pe'] for r in rows if r['pe']]
mu, sd = st.mean(pes), st.pstdev(pes)
print(f'n={len(pes)} mean {mu:.1f}x sd {sd:.1f}x | -2sd {mu-2*sd:.1f} -1sd {mu-sd:.1f} +1sd {mu+sd:.1f} +2sd {mu+2*sd:.1f}')
for r in rows: print(r['month'], r['price'], round(r['eps'], 3) if r['eps'] else None, r['basis'], round(r['pe'], 1) if r['pe'] else None)
con_only = [r['pe'] for r in rows if r['basis'].startswith('一致')]
print('consensus-only n', len(con_only), 'mean', round(st.mean(con_only), 1), 'sd', round(st.pstdev(con_only), 1))
real = [p for p in (PX[k] / realized(k) for k in PX if PX[k] and realized(k)) ]
print('realized-only n', len(real), 'mean', round(st.mean(real), 1), 'sd', round(st.pstdev(real), 1))
json.dump(rows, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lx_pe_band.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
