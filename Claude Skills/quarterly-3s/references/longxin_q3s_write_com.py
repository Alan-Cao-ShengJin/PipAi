"""Write 3S interim layout via Excel COM (keeps x14 formats): L..R quarters, T/U 1H, W/X 9M."""
import json, os, sys, shutil
import win32com.client as w32
S=sys.argv[1]; F=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=os.path.join(F,'隆鑫通用 0630.xlsx'); dst=os.path.join(F,'隆鑫通用 1025.xlsx')
assert not os.path.exists(os.path.join(F,'~$隆鑫通用 0630.xlsx')), 'model open in Excel'
assert not os.path.exists(dst), 'target exists'
shutil.copy2(src,dst)
V=json.load(open(os.path.join(S,'lx_q3s_values.json'),encoding='utf-8'))
Q,CUM=V['quarters'],V['cum']
R=[4,6,10,12,14,16,18,20,22,33,37]
COL={'1Q25':'L','2Q25':'M','3Q25':'N','4Q25':'O','1Q26':'P','2Q26':'Q','3Q26':'R','1H25':'T','1H26':'U','9M25':'W','9M26':'X'}
SRC={'1Q25':'2026一季报（上年同期，重述口径）','2Q25':'2026半年报上年同期 − 2026一季报上年同期','3Q25':'2026三季报上年同期 − 2026半年报上年同期',
     '4Q25':'2025年报 − 2026三季报上年同期','1Q26':'2026一季报','2Q26':'2026半年报 − 2026一季报','3Q26':'2026三季报 − 2026半年报',
     '1H25':'2026半年报（上年同期）','1H26':'2026半年报','9M25':'2026三季报（上年同期）','9M26':'2026三季报'}
xl=w32.DispatchEx('Excel.Application'); xl.Visible=False; xl.DisplayAlerts=False
try:
    wb=xl.Workbooks.Open(dst); ws=wb.Worksheets('3S')
    ws.Range('M1:M231').Copy(ws.Range('P1'))          # 1Q26 template → P (formats + formulas)
    for c in 'LMNOQRTUWX': ws.Range('P1:P231').Copy(ws.Range(f'{c}1'))
    for c in 'SV':
        ws.Range(f'{c}1:{c}231').Clear(); ws.Columns(c).ColumnWidth=2
    def k(x): return round(x,5)
    for p,c in COL.items():
        ws.Range(f'{c}1').Value=p; ws.Range(f'{c}2').Value='ACT实际'
        if p in CUM:   # cumulative: other income / non-op as transparent constant formulas
            d=CUM[p]
            for r in R: ws.Range(f'{c}{r}').Value=k(d[str(r)])
            o=d['_other']; ws.Range(f'{c}20').Formula='='+'+'.join(f'({k(x)})' for x in o).replace('+(-','-(').replace('(','').replace(')','')
            n=d['_nonop']; ws.Range(f'{c}22').Formula=f'={k(n[0])}-{k(n[1])}'
        else:
            d=Q[p]
            for r in R: ws.Range(f'{c}{r}').Value=k(d[str(r)])
        cm=ws.Range(f'{c}1').Comment
        if cm is not None: cm.Delete()
        note=f'{p}实际数：{SRC[p]}。'
        if p not in CUM: note+='已与FactSet单季数据核对（收入、归母净利、所得税、税金及附加、税前利润−联营）。' if p!='4Q25' else '已与FactSet核对收入、归母净利、所得税、税金及附加。'
        ws.Range(f'{c}1').AddComment(note)
    # YoY rows: only where a same-period prior year exists
    for r,base in [(5,4),(38,37)]:
        for c in 'LMNOQRTUWXP': ws.Range(f'{c}{r}').ClearContents()
        for cur,prev in [('P','L'),('Q','M'),('R','N'),('U','T'),('X','W')]:
            ws.Range(f'{cur}{r}').Formula=f'={cur}{base}/{prev}{base}-1'
    xl.CalculateFull(); wb.Save()
    print('saved',dst)
finally:
    wb.Close(False); xl.Quit()
