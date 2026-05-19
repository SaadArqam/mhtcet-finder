"""
MHT CET CAP Cutoff Parser
Converts DTE Maharashtra cutoff PDFs → clean CSV.

Works in two steps:
  1. pdftotext (CLI) → .txt   [fast, handles 1500+ page PDFs]
  2. This script parses the .txt → .csv

Usage:
    # Parse a PDF directly (auto-runs pdftotext internally):
    python parse_cutoff.py --pdf ../data/raw/2024ENGG_CAP1_CutOff.pdf --year 2024 --round 1

    # Or parse a pre-extracted .txt file:
    python parse_cutoff.py --txt ../data/raw/2024ENGG_CAP1_CutOff.txt --year 2024 --round 1
"""

import re
import csv
import argparse
import subprocess
from pathlib import Path

# ── Category code → (category, gender_quota, seat_type) ─────────────────────
CATEGORY_MAP = {
    "GOPENS":    ("OPEN", "General", "State"),
    "GSCS":      ("SC",   "General", "State"),
    "GSTS":      ("ST",   "General", "State"),
    "GVJS":      ("VJ",   "General", "State"),
    "GNT1S":     ("NT1",  "General", "State"),
    "GNT2S":     ("NT2",  "General", "State"),
    "GNT3S":     ("NT3",  "General", "State"),
    "GOBCS":     ("OBC",  "General", "State"),
    "GSEBCS":    ("SEBC", "General", "State"),
    "EWS":       ("EWS",  "General", "State"),
    "LOPENS":    ("OPEN", "Ladies",  "State"),
    "LSCS":      ("SC",   "Ladies",  "State"),
    "LSTS":      ("ST",   "Ladies",  "State"),
    "LVJS":      ("VJ",   "Ladies",  "State"),
    "LNT1S":     ("NT1",  "Ladies",  "State"),
    "LNT2S":     ("NT2",  "Ladies",  "State"),
    "LNT3S":     ("NT3",  "Ladies",  "State"),
    "LOBCS":     ("OBC",  "Ladies",  "State"),
    "LSEBCS":    ("SEBC", "Ladies",  "State"),
    "PWDOPENS":  ("OPEN", "PWD",     "State"),
    "PWDOBCS":   ("OBC",  "PWD",     "State"),
    "PWDRSCS":   ("SC",   "PWD",     "State"),
    "PWDROBCS":  ("OBC",  "PWD",     "State"),
    "DEFOPENS":  ("OPEN", "Defence", "State"),
    "DEFOBCS":   ("OBC",  "Defence", "State"),
    "DEFROBCS":  ("OBC",  "Defence", "State"),
    "DEFRSCS":   ("SC",   "Defence", "State"),
    "DEFRSEBC":  ("SEBC", "Defence", "State"),
    "DEFRNT1S":  ("NT1",  "Defence", "State"),
    "TFWS":      ("OPEN", "TFWS",    "State"),
    "ORPHAN":    ("OPEN", "Orphan",  "State"),
    "GOPENO":    ("OPEN", "General", "Other"),
    "GSCO":      ("SC",   "General", "Other"),
    "GOBCO":     ("OBC",  "General", "Other"),
    "LOPENO":    ("OPEN", "Ladies",  "Other"),
    "PWDROBCS":  ("OBC",  "PWD",     "State"),
    "DEFRSEBC":  ("SEBC", "Defence", "State"),
}

SUFFIX_TOKENS = {"S", "C", "BC"}

SKIP_PHRASES = [
    "Government of Maharashtra",
    "State Common Entrance Test Cell",
    "Cut Off List",
    "Degree Courses",
    "Legends:",
    "Maharashtra State Seats",
    "Status:",
    "Home University",
    "State Level",
    "Other than Home",
    "All India Seat",
]

RE_COLLEGE    = re.compile(r'^(\d{5})\s*-\s*(.+)$')
RE_BRANCH     = re.compile(r'^(\d{10})\s*-\s*(.+)$')
RE_STAGE_ROW  = re.compile(r'^\s*(I{1,3}|IV)\s')
RE_HEADER_TOK = re.compile(r'^[GL][A-Z0-9]{2,}$|^TFWS$|^EWS$|^ORPHAN$|^DEF[A-Z]+$|^PWD[A-Z]+$')
RE_PERCENTILE = re.compile(r'\((\d+\.\d+)\)')
RE_MERIT      = re.compile(r'(?<!\()\b(\d{4,6})\b(?!\))')

OUTPUT_COLS = [
    "year", "cap_round",
    "college_code", "college_name",
    "branch_code", "branch_name",
    "category", "gender_quota", "seat_type",
    "stage", "closing_merit_no", "closing_percentile",
]


def pdf_to_txt(pdf_path: str) -> str:
    txt_path = str(Path(pdf_path).with_suffix(".txt"))
    print(f"  Running pdftotext on {pdf_path} ...")
    subprocess.run(["pdftotext", "-layout", pdf_path, txt_path], check=True)
    print(f"  -> {txt_path}")
    return txt_path


def is_skip_line(line: str) -> bool:
    return any(p in line for p in SKIP_PHRASES)


def looks_like_header(line: str) -> bool:
    tokens = [t for t in line.split() if t != "Stage"]
    known = sum(1 for t in tokens if t in CATEGORY_MAP or RE_HEADER_TOK.match(t))
    return known >= 3


def parse_header_line(line: str, next_line: str = "") -> list:
    combined = line + " " + next_line
    tokens = combined.split()
    result = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in ("Stage",):
            i += 1
            continue
        if tok in CATEGORY_MAP:
            result.append(tok)
        elif RE_HEADER_TOK.match(tok):
            # Could be a split token like PWDROBC + S next
            if i + 1 < len(tokens) and tokens[i+1] in SUFFIX_TOKENS:
                merged = tok + tokens[i+1]
                if merged in CATEGORY_MAP:
                    result.append(merged)
                    i += 2
                    continue
                else:
                    result.append(tok)
            else:
                result.append(tok)
        elif tok in SUFFIX_TOKENS and result:
            # Orphaned suffix — merge with last
            merged = result[-1] + tok
            if merged in CATEGORY_MAP:
                result[-1] = merged
        i += 1
    return [t for t in result if t in CATEGORY_MAP]


def parse_stage_row(raw: str, header: list) -> list:
    stage_m = RE_STAGE_ROW.match(raw)
    stage = stage_m.group(1).strip() if stage_m else "I"
    percentiles = RE_PERCENTILE.findall(raw)
    merit_nos   = RE_MERIT.findall(raw)
    results = []
    for i, cat_code in enumerate(header):
        if i >= len(percentiles) or i >= len(merit_nos):
            break
        results.append((stage, int(merit_nos[i]), float(percentiles[i]), cat_code))
    return results


def parse_txt(txt_path: str, year: int, cap_round: int) -> list:
    with open(txt_path, encoding="utf-8", errors="replace") as f:
        raw_lines = f.readlines()

    records = []
    college_code = college_name = ""
    branch_code  = branch_name  = ""
    header = []
    in_block = False

    i = 0
    while i < len(raw_lines):
        line = raw_lines[i].rstrip("\n")
        stripped = line.strip()

        if not stripped or is_skip_line(line):
            i += 1
            continue

        cm = RE_COLLEGE.match(stripped)
        if cm:
            college_code = cm.group(1)
            college_name = cm.group(2).strip()
            in_block = False
            header = []
            i += 1
            continue

        bm = RE_BRANCH.match(stripped)
        if bm:
            branch_code = bm.group(1)
            branch_name = bm.group(2).strip()
            in_block = True
            header = []
            i += 1
            continue

        if not in_block:
            i += 1
            continue

        if looks_like_header(line):
            next_line = raw_lines[i+1].rstrip("\n") if i+1 < len(raw_lines) else ""
            next_tokens = next_line.split()
            if next_tokens and all(len(t) <= 3 and t.isalpha() for t in next_tokens):
                header = parse_header_line(line, next_line)
                i += 2
            else:
                header = parse_header_line(line)
                i += 1
            continue

        if RE_STAGE_ROW.match(line) and header:
            combined = line
            if i+1 < len(raw_lines):
                nxt = raw_lines[i+1].strip()
                if nxt.startswith("(") or RE_PERCENTILE.match(nxt):
                    combined = line + " " + raw_lines[i+1]
                    i += 1
            pairs = parse_stage_row(combined, header)
            for stage, merit_no, percentile, cat_code in pairs:
                cat_info = CATEGORY_MAP.get(cat_code, (cat_code, "General", "State"))
                records.append({
                    "year":               year,
                    "cap_round":          cap_round,
                    "college_code":       college_code,
                    "college_name":       college_name,
                    "branch_code":        branch_code,
                    "branch_name":        branch_name,
                    "category":           cat_info[0],
                    "gender_quota":       cat_info[1],
                    "seat_type":          cat_info[2],
                    "stage":              stage,
                    "closing_merit_no":   merit_no,
                    "closing_percentile": percentile,
                })

        i += 1

    return records


def save_csv(records: list, out_path: str):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLS)
        writer.writeheader()
        writer.writerows(records)
    print(f"  Saved {len(records):,} rows -> {out_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--pdf", help="Path to cutoff PDF")
    src.add_argument("--txt", help="Path to pre-extracted .txt file")
    ap.add_argument("--year",  type=int, required=True)
    ap.add_argument("--round", type=int, required=True, dest="cap_round")
    ap.add_argument("--out",   default=None)
    args = ap.parse_args()

    if args.pdf:
        txt_path = pdf_to_txt(args.pdf)
        base = Path(args.pdf)
    else:
        txt_path = args.txt
        base = Path(args.txt)

    out_path = args.out or str(
        base.parent.parent / "processed" /
        f"{args.year}_CAP{args.cap_round}_cutoffs.csv"
    )

    print(f"Parsing {txt_path} ...")
    records = parse_txt(txt_path, args.year, args.cap_round)
    print(f"  Total records parsed: {len(records):,}")
    save_csv(records, out_path)

    print("\nSample output (first 5 rows):")
    for r in records[:5]:
        print(f"  {r['college_name']} | {r['branch_name']} | "
              f"{r['category']}/{r['gender_quota']} | "
              f"Stage {r['stage']} | {r['closing_percentile']:.2f}%ile")
    print("\nDone!")