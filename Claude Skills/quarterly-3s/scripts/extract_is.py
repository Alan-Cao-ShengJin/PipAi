"""Extract the consolidated income statement (合并利润表) and the single-quarter key-data table
from an A-share periodic report PDF (一季报/半年报/三季报/年报).

Usage:
  python extract_is.py <report.pdf> <out.json>

Output JSON:
  {"file": ..., "columns": ["2026年前三季度（1-9月）", "2025年前三季度（1-9月）"],
   "income_statement": {"营业收入": [cur, prior], ...},          # 元, as printed (signs as printed)
   "single_quarter": {"营业收入": value, "利润总额": ..., ...}}  # 本报告期 column of 主要会计数据, if present

Labels are normalised: numbering ("一、", "1.", "（一）"), "其中："/"加："/"减：" prefixes and
"（损失以“-”号填列）"-style notes are stripped. Labels that wrap onto the next line are joined.
Check the printed result against the PDF: unusual layouts can still split a row.
"""
import json
import re
import subprocess
import sys

try:
    from pypdf import PdfReader
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "-q"])
    from pypdf import PdfReader

NUM = r"-?[\d,]+\.\d{2}"


def clean(label):
    label = re.sub(r"[（(][^）)]*填列[）)]", "", label)
    label = re.sub(r"^(其中|加|减)[:：]", "", label.strip())
    label = re.sub(r"^([一二三四五六七八九十]+、|\d+\.|[（(][一二三四五六七八九十\d]+[）)])", "", label)
    label = re.sub(r"^(其中|加|减)[:：]", "", label.strip())
    label = re.sub(r"^按\S*?分类", "", label.replace(" ", ""))
    label = re.sub(r"^每股收益[:：]", "", label)
    label = re.sub(r"^([一二三四五六七八九十]+、|\d+\.|[（(][一二三四五六七八九十\d]+[）)])", "", label)
    return label.strip()


def main():
    pdf, out = sys.argv[1], sys.argv[2]
    text = "\n".join(p.extract_text() or "" for p in PdfReader(pdf).pages)
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # ---- income statement section ----
    start = next(i for i, l in enumerate(lines) if l.startswith("合并利润表"))
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith(("合并现金流量表", "母公司资产负债表", "母公司利润表"))), len(lines))
    sec = lines[start:end]
    header = next((l for l in sec if l.startswith("项目")), "")
    cols = re.findall(r"\d{4}\s*年[^\d]*?(?:[（(][^）)]*[）)])?(?=\s*\d{4}|$)", header.replace("项目", ""))
    rows, pending = {}, ""
    for l in sec:
        m = re.match(rf"^(.*?)\s*({NUM})\s+({NUM})$", l)
        m1 = re.match(rf"^(.*?)\s*({NUM})$", l)
        if m:
            lab = clean(pending + m.group(1))
            vals = [float(m.group(2).replace(",", "")), float(m.group(3).replace(",", ""))]
            pending = ""
        elif m1 and not re.search(NUM + r"\s+" + NUM, l):
            # only one figure printed (prior period blank) -> current only
            lab = clean(pending + m1.group(1))
            vals = [float(m1.group(2).replace(",", "")), None]
            pending = ""
        else:
            if not l.startswith(("项目", "编制单位", "单位", "合并利润表", "公司负责人")) and not re.match(r"^\d+ / \d+$", l) \
                    and "年第" not in l and not re.match(r"^\d{4}\s*年", l):
                pending += l
            continue
        if lab and lab not in rows:
            rows[lab] = vals

    # ---- single-quarter key data (主要会计数据: 本报告期 ...) ----
    single = {}
    for i, l in enumerate(lines[:start]):
        m = re.match(rf"^(营业收入|利润总额)\s+({NUM})\s", l)
        if m:
            single[m.group(1)] = float(m.group(2).replace(",", ""))
    joined = " ".join(lines[:start])
    for key, pat in (("归属于上市公司股东的净利润", r"归属于上市公司股东\s*的净利润\s+(" + NUM + ")"),
                     ("归属于上市公司股东的扣除非经常性损益的净利润", r"的扣除非经常性损益\s*的净利润\s+(" + NUM + ")"),
                     ("经营活动产生的现金流量净额", r"经营活动产生的现金\s*流量净额\s+(" + NUM + ")")):
        m = re.search(pat, joined)
        if m:
            single[key] = float(m.group(1).replace(",", ""))

    json.dump({"file": pdf, "columns": cols, "income_statement": rows, "single_quarter": single},
              open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("columns:", cols)
    for k, v in rows.items():
        print(f"  {k}: {v}")
    print("single quarter:", single)


if __name__ == "__main__":
    main()
