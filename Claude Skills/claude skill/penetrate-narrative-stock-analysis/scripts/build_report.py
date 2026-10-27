# -*- coding: utf-8 -*-
"""穿透叙事报告构建器 —— 把一个「内容模块」渲染成合规的 DOCX + HTML。

替代了旧的 generate_report.py：那份是中际旭创(300308) 报告的硬编码快照
（1,021 行、54 处公司名），无法复用，实际每次都在从零重写排版器。
现在排版在 `_shared/report_emit.py`，自检在 `_shared/report_check.py`，
本脚本只负责串起来并强制自检通过才允许落盘。

内容模块的契约（照 scripts/content_template.py 抄）：

    TITLE    = '国光股份 002749.SZ 穿透叙事分析'
    SUBTITLE = '截至 2026-08-03 收盘 · 货币单位：人民币亿元'
    STEM     = '国光股份002749_穿透叙事'      # 文件名前缀
    CORE_TABLES = {'表2','表3','表5','表6','表17'}   # 需 500 字论证的核心表
    def build(R):                              # R 是 report_emit.Report
        R.h1('摘要'); R.p('……')

用法：
    python build_report.py --content content_002749.py --outdir ../../../output/xxx
    python build_report.py --content content_002749.py --outdir out --no-strict
"""
import argparse
import importlib.util
import os
import sys

# --- UTF-8 stdout (Windows cp1252 consoles mangle CJK without this) ---
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

_SHARED = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', '_shared'))
if _SHARED not in sys.path:
    sys.path.insert(0, _SHARED)

from report_emit import Report            # noqa: E402
from report_check import check_blocks, check_docx, report  # noqa: E402


def load_content(path):
    path = os.path.abspath(path)
    # 内容模块常拆成 content1/2/3 互相 import，把它所在目录也加进来
    d = os.path.dirname(path)
    if d not in sys.path:
        sys.path.insert(0, d)
    spec = importlib.util.spec_from_file_location('_content', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for attr in ('TITLE', 'STEM', 'build'):
        if not hasattr(mod, attr):
            raise SystemExit(f'内容模块缺少必需属性 {attr}：{path}')
    return mod


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--content', required=True, help='内容模块 .py 路径')
    ap.add_argument('--outdir', required=True, help='输出目录')
    ap.add_argument('--date', default='', help='文件名日期后缀，如 20260804')
    ap.add_argument('--no-strict', action='store_true',
                    help='自检不通过时仍然落盘（只在草稿阶段用）')
    ap.add_argument('--skip-length', action='store_true',
                    help='跳过字数下限检查（只查排版与来源标记）')
    a = ap.parse_args()

    mod = load_content(a.content)
    R = Report(mod.TITLE, getattr(mod, 'SUBTITLE', ''))
    mod.build(R)
    print(f'内容模块已加载：{len(R.blocks)} 个 block')

    bad = check_blocks(R.blocks,
                       core_tables=getattr(mod, 'CORE_TABLES', ()),
                       require_lengths=not a.skip_length)
    ok = report(bad, '① 内容自检')
    if not ok and not a.no_strict:
        raise SystemExit('\n内容自检未通过，已中止落盘。'
                         '补足内容后重跑，或加 --no-strict 出草稿。')

    os.makedirs(a.outdir, exist_ok=True)
    suffix = f'_{a.date}' if a.date else ''
    dp = os.path.join(a.outdir, f'{mod.STEM}_详细版{suffix}.docx')
    hp = os.path.join(a.outdir, f'{mod.STEM}_简要版{suffix}.html')
    R.docx(dp)
    R.html(hp)

    ok2 = report(check_docx(dp), '② DOCX 排版自检')
    if not ok2 and not a.no_strict:
        raise SystemExit('\nDOCX 排版自检未通过 —— 这是渲染器的 bug，请修 report_emit.py。')

    ntab = sum(1 for k, _ in R.blocks if k == 'table')
    nfig = sum(1 for k, _ in R.blocks if k == 'chart')
    print(f'\n已输出：\n  {dp}  ({os.path.getsize(dp) / 1024:.0f} KB)'
          f'\n  {hp}  ({os.path.getsize(hp) / 1024:.0f} KB)'
          f'\n  表 {ntab} 张 · 图 {nfig} 张')
    print('\n⚠ 页数下限（≥20 页）本脚本无法核验，请转 PDF 后确认。')


if __name__ == '__main__':
    main()
