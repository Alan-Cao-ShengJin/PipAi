# -*- coding: utf-8 -*-
"""报告图表 —— 返回 PNG bytes，交给 report_emit 的 Report.chart()。

配色纪律（中国股市惯例，强制，见各 SKILL.md「图表配色」）：
    涨 / 公司自身 → 红      跌 → 绿      行业基准 / 趋势线 → 蓝（常放右轴）

字体全部 微软雅黑，与 DOCX / HTML 一致。所有函数只返回 bytes，不落盘、不弹窗。

    from report_charts import bar_yoy, line_rebased, waterfall, scenario_band
    r.chart(bar_yoy(['FY23','FY24','FY25'], [12.3, -4.1, 8.8]), '图1  归母净利润同比')
"""
import io

import matplotlib
matplotlib.use('Agg')                     # 无窗口后端，必须在 pyplot 之前设
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

# --- UTF-8 stdout (Windows cp1252 consoles mangle CJK without this) ---
import sys as _sys
try:
    _sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    _sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

UP_RED = '#C0392B'
DOWN_GREEN = '#1E8449'
BENCH_BLUE = '#1F3C5F'
GREY = '#8A9199'
GRID = '#E3E7EC'

plt.rcParams.update({
    'font.sans-serif': ['Microsoft YaHei', 'SimHei'],
    'axes.unicode_minus': False,          # 否则负号变成豆腐块
    'figure.dpi': 170,
    'savefig.dpi': 170,
    'font.size': 9,
    'axes.edgecolor': GRID,
    'axes.labelcolor': '#333333',
    'text.color': '#333333',
    'xtick.color': '#555555',
    'ytick.color': '#555555',
})


def _png(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return buf.getvalue()


def _style(ax, title=None, ylab=None):
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', color=GRID, lw=.8)
    ax.set_axisbelow(True)
    if title:
        ax.set_title(title, fontsize=10.5, fontweight='bold',
                     color='#1F3C5F', pad=10)
    if ylab:
        ax.set_ylabel(ylab, fontsize=8.5)


def bar_yoy(labels, values, title=None, ylab=None, pct=False, figsize=(7.2, 3.2)):
    """涨红跌绿柱状图 —— 同比、单季利润、分部增速都用这个。"""
    fig, ax = plt.subplots(figsize=figsize)
    cols = [UP_RED if v >= 0 else DOWN_GREEN for v in values]
    ax.bar(labels, values, color=cols, width=.62)
    ax.axhline(0, color='#666666', lw=.9)
    span = (max(values) - min(values)) or 1
    for x, v in zip(labels, values):
        ax.text(x, v + (span * .03 if v >= 0 else -span * .03),
                f'{v:+.1f}%' if pct else f'{v:,.2f}',
                ha='center', va='bottom' if v >= 0 else 'top', fontsize=8)
    if pct:
        ax.yaxis.set_major_formatter(FuncFormatter(lambda y, _: f'{y:.0f}%'))
    _style(ax, title, ylab)
    return _png(fig)


def line_rebased(dates, series, title=None, base=100.0, figsize=(7.6, 3.4)):
    """个股 vs 指数的归一化走势 —— 第二步「重合段/分离段」判别就靠这张。

    series: {'国光股份': [...], '沪深300': [...]}；第一条画红，其余画蓝/灰。
    """
    fig, ax = plt.subplots(figsize=figsize)
    pal = [UP_RED, BENCH_BLUE, GREY, '#B07D2B']
    for i, (name, vals) in enumerate(series.items()):
        v0 = next((v for v in vals if v), 1.0)
        ax.plot(dates, [base * v / v0 for v in vals], label=name,
                color=pal[i % len(pal)], lw=1.9 if i == 0 else 1.4,
                alpha=1.0 if i == 0 else .85)
    ax.axhline(base, color=GRID, lw=1, ls='--')
    ax.legend(frameon=False, fontsize=8.5, ncol=len(series))
    if len(dates) > 12:
        step = max(1, len(dates) // 10)
        ax.set_xticks(range(0, len(dates), step))
        ax.set_xticklabels([dates[i] for i in range(0, len(dates), step)],
                           rotation=30, ha='right', fontsize=8)
    _style(ax, title, f'归一化（起点={base:g}）')
    return _png(fig)


def waterfall(labels, deltas, start=0.0, title=None, ylab=None,
              figsize=(7.6, 3.4)):
    """瀑布图 —— 利润变动归因（税/毛利/费用各贡献多少）、毛利率结构分解。"""
    fig, ax = plt.subplots(figsize=figsize)
    run = start
    for i, (lab, d) in enumerate(zip(labels, deltas)):
        col = UP_RED if d >= 0 else DOWN_GREEN
        ax.bar(i, d, bottom=run, color=col, width=.6)
        ax.text(i, run + d + (abs(d) * .06 + .02) * (1 if d >= 0 else -1),
                f'{d:+,.2f}', ha='center',
                va='bottom' if d >= 0 else 'top', fontsize=8)
        if i:
            ax.plot([i - .7, i - .3], [run, run], color=GREY, lw=.8, ls='--')
        run += d
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, fontsize=8.5)
    ax.axhline(start, color='#666666', lw=.9)
    _style(ax, title, ylab)
    return _png(fig)


def scenario_band(scen_names, scen_L, implied, title=None, ylab='终局利润 L（亿元）',
                  figsize=(7.2, 3.2)):
    """理论业绩空间四档 L 区间 + 当前股价隐含 L 三档 —— 第一步最关键的一张图。

    一眼看出隐含 L 落在区间内 / 上沿 / 之外，正是核心结论②要的东西。
    """
    fig, ax = plt.subplots(figsize=figsize)
    ax.bar(scen_names, scen_L, color='#CBD6E2', width=.55,
           edgecolor=BENCH_BLUE, lw=.9, label='理论业绩空间四档')
    for x, v in zip(scen_names, scen_L):
        ax.text(x, v, f'{v:,.2f}', ha='center', va='bottom', fontsize=8)
    lo, hi = min(scen_L), max(scen_L)
    ax.axhspan(lo, hi, color=BENCH_BLUE, alpha=.06)
    # 注意：这张图的红色是「落在理论区间之外」的告警，不是「上涨」。
    # 区间内用中性蓝而不是绿 —— 绿在 A 股语境里读作「跌」，语义会冲突。
    for lab, v in implied.items():
        inside = lo <= v <= hi
        col = BENCH_BLUE if inside else UP_RED
        ax.axhline(v, color=col, lw=1.3, ls='--')
        ax.text(len(scen_names) - .42, v,
                f'  隐含L {lab}={v:,.2f}{"" if inside else "（区间外）"}',
                fontsize=8, va='center', color=col)
    ax.legend(frameon=False, fontsize=8.5, loc='upper left')
    _style(ax, title, ylab)
    return _png(fig)


def sens_heat(row_labels, col_labels, grid, title=None, fmt='{:,.2f}',
              figsize=(7.4, 3.0)):
    """敏感性表热力图（如 L × 折现率 → 合理股价）。红=高，绿=低。"""
    fig, ax = plt.subplots(figsize=figsize)
    im = ax.imshow(grid, cmap='RdYlGn_r', aspect='auto')
    ax.set_xticks(range(len(col_labels)))
    ax.set_xticklabels(col_labels, fontsize=8.5)
    ax.set_yticks(range(len(row_labels)))
    ax.set_yticklabels(row_labels, fontsize=8.5)
    for i, row in enumerate(grid):
        for j, v in enumerate(row):
            ax.text(j, i, fmt.format(v), ha='center', va='center', fontsize=8)
    ax.grid(False)
    for s in ax.spines.values():
        s.set_visible(False)
    if title:
        ax.set_title(title, fontsize=10.5, fontweight='bold',
                     color='#1F3C5F', pad=10)
    fig.colorbar(im, ax=ax, fraction=.025, pad=.02)
    return _png(fig)
