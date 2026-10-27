# -*- coding: utf-8 -*-
"""开工前体检 —— 在开始一家新公司之前跑一次，30 秒。

存在的理由：002749 那一单跑到第一步才发现 Alpha 派取不到数，而 skill 的
HARD RULE 又写着「必须检索 Alpha 派最新纪要」。规则无法满足却不中止，
结果是报告带着一条没人注意的未满足红线交付了。体检要在开工前做，不是事后补。

    python _shared/preflight.py
    python _shared/preflight.py --company "Company - 国光股份 (002749)"

退出码：0=全通过；1=有 BLOCK 级问题（该项依赖的 HARD RULE 无法满足）。
"""
import argparse
import glob
import importlib
import json
import os
import sys

# --- UTF-8 stdout (Windows cp1252 consoles mangle CJK without this) ---
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
SKILLS = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SKILLS))     # 项目根

OK, WARN, BLOCK = 'OK', 'WARN', 'BLOCK'
rows = []


def add(name, status, detail):
    rows.append((name, status, detail))


def check_deps():
    need = {'docx': 'python-docx（报告渲染）',
            'openpyxl': 'openpyxl（读模型）',
            'win32com.client': 'pywin32（Excel COM 写盘/重算）',
            'fitz': 'PyMuPDF（年报 PDF 抽表）',
            'matplotlib': 'matplotlib（报告图表）',
            'requests': 'requests（Alpha 派）'}
    for mod, what in need.items():
        try:
            importlib.import_module(mod)
            add(f'依赖 {mod}', OK, what)
        except ImportError:
            add(f'依赖 {mod}', BLOCK, f'缺失 —— {what}')


def check_fonts():
    try:
        import matplotlib.font_manager as fm
        names = {f.name for f in fm.fontManager.ttflist}
        miss = [n for n in ('Microsoft YaHei', 'SimHei') if n not in names]
        add('图表中文字体', OK if not miss else WARN,
            '微软雅黑可用' if not miss else f'缺 {miss}，图里中文会变豆腐块')
    except Exception as e:
        add('图表中文字体', WARN, str(e)[:60])


def check_encoding():
    add('控制台编码', OK if sys.stdout.encoding.lower().startswith('utf')
        else WARN,
        f'stdout={sys.stdout.encoding}（脚本内已自带 UTF-8 shim）')


def check_alphapai():
    cfg = os.path.join(SKILLS, 'alphapai-research', 'config.json')
    if not os.path.exists(cfg):
        add('Alpha派 鉴权', BLOCK, 'config.json 不存在')
        return
    try:
        c = json.load(open(cfg, encoding='utf-8'))
        k = c.get('api_key', '')
        masked = f'{k[:4]}…{k[-3:]}' if len(k) > 8 else '(空)'
    except Exception as e:
        add('Alpha派 鉴权', BLOCK, f'config.json 读取失败：{e}')
        return
    # 用客户端自己发请求，不要在这里重写一遍 —— 鉴权头是 `app-agent` 而不是
    # `api_key`，手搓请求会得到一个和真实情况不符的结论。
    try:
        sys.path.insert(0, os.path.join(SKILLS, 'alphapai-research', 'scripts'))
        from alphapai_client import AlphaPaiClient
        import requests
        cli = AlphaPaiClient(c)
        cli._post('/alpha/open-api/v1/sync/auth/hello', {}, timeout=20)
        add('Alpha派 鉴权', OK, f'连通正常（key {masked}）')
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code if e.response is not None else '?'
        add('Alpha派 鉴权',
            BLOCK if code in (401, 403) else WARN,
            f'HTTP {code}（key {masked}）'
            + (' 鉴权失败 —— 纪要类 HARD RULE 无法满足，见下方处置'
               if code in (401, 403) else ''))
    except Exception as e:
        add('Alpha派 鉴权', WARN,
            f'{type(e).__name__} —— 网络不可达，无法判定 key 是否有效')


def check_company(pattern):
    if not pattern:
        add('公司数据目录', WARN, '未指定 --company，跳过')
        return
    base = os.path.join(ROOT, 'Company Data')
    hits = glob.glob(os.path.join(base, f'*{pattern}*')) or \
        glob.glob(os.path.join(base, pattern))
    if not hits:
        add('公司数据目录', WARN,
            f'「{pattern}」不存在 —— 无自建 3S 模型，'
            f'③ 只能跑「市场版」DCF，缺预期差')
        return
    d = hits[0]
    xl = [p for p in glob.glob(os.path.join(d, '*.xlsx'))
          if not os.path.basename(p).startswith('~$')]
    tr = os.path.join(d, 'Transcripts')
    ntr = len(os.listdir(tr)) if os.path.isdir(tr) else 0
    add('公司数据目录', OK, os.path.basename(d))
    add('  3S 模型', OK if xl else WARN,
        os.path.basename(xl[0]) if xl else '无 xlsx —— ①② 尚未跑')
    add('  Transcripts', OK if ntr else WARN,
        f'{ntr} 份本地纪要' if ntr else '无本地纪要（Alpha 派又不通时无软信息来源）')


def check_shared():
    for m in ('report_emit', 'report_check', 'report_charts'):
        try:
            sys.path.insert(0, HERE)
            importlib.import_module(m)
            add(f'共享模块 {m}', OK, '可导入')
        except Exception as e:
            add(f'共享模块 {m}', BLOCK, f'{type(e).__name__}: {e}')


def check_dcf():
    try:
        sys.path.insert(0, os.path.join(SKILLS, 'penetrate-narrative-stock-analysis',
                                        'scripts'))
        import dcf_implied as D
        n = D.get_growth_years()
        got = round(D.implied_ceiling(49.58, 3.95, 4.41, 4.59, 10.0), 2)
        # 回归基准：002749 在 base=2025/N=7 下 r=10% 隐含 L=5.36
        note = f'基准年 {D.DEFAULT_BASE_YEAR} → N={n}'
        if D.DEFAULT_BASE_YEAR == 2025:
            add('DCF 反算', OK if abs(got - 5.36) < 0.01 else BLOCK,
                f'{note}；002749 回归 L={got}（应 5.36）')
        else:
            add('DCF 反算', WARN,
                f'{note} —— 基准年已前移，N 变了，'
                f'旧报告的 L 不可与新报告直接比较')
    except Exception as e:
        add('DCF 反算', BLOCK, f'{type(e).__name__}: {e}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--company', default='', help='Company Data 下的目录名或片段')
    a = ap.parse_args()

    check_deps()
    check_fonts()
    check_encoding()
    check_shared()
    check_dcf()
    check_alphapai()
    check_company(a.company)

    w = max(len(r[0]) for r in rows) + 2
    print('\n开工前体检')
    print('=' * (w + 60))
    icon = {OK: ' ✓ ', WARN: ' ! ', BLOCK: ' ✗ '}
    for name, st, detail in rows:
        print(f'{icon[st]}{name:<{w}}{detail}')
    print('=' * (w + 60))

    nb = sum(1 for r in rows if r[1] == BLOCK)
    nw = sum(1 for r in rows if r[1] == WARN)
    print(f'{len(rows)} 项：{len(rows) - nb - nw} 通过 / {nw} 警告 / {nb} 阻断')

    if any(r[1] == BLOCK and 'Alpha派' in r[0] for r in rows):
        print("""
Alpha 派不可用时的处置（不要装作红线满足了）：
  1. 先试换 key：python alphapai-research/scripts/alphapai_client.py config --set-key <KEY>
  2. 仍不通，则改用降级路径取软信息，按可靠性排序：
       ① Company Data/<公司>/Transcripts/ 本地纪要（目录名前缀 Important>Medium>Low）
       ② 交易所互动易 / investor Q&A、业绩说明会公告原文
       ③ 券商深度研报里的调研转述（二手，要标为二手）
  3. 报告附录必须写明「本次分析未取得一手调研纪要，TAM 与稳态假设主要基于
     行业静态数据与公司披露推导」——用不含机构名的概括表述，但不得省略这句。
     这是对假设可靠性的披露，不是来源标注，与 v3.0.0「不展示来源」不冲突。""")
    return 1 if nb else 0


if __name__ == '__main__':
    sys.exit(main())
