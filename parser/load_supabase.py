"""
MHT CET — Supabase Loader
Reads processed CSV files and loads them into Supabase.

Usage:
    pip3 install supabase python-dotenv
    python3 load_supabase.py

Expects a .env file in ~/mhtcet-finder/ with:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_KEY=your-anon-public-key
"""

import csv
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# ── Load .env from project root ──────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in your .env file.")
    print(f"Looking for .env at: {env_path}")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
BATCH_SIZE = 500  # Supabase handles up to 1000 per insert; 500 is safe


def load_colleges(rows: list[dict]):
    """Upsert unique colleges from cutoff rows."""
    print("  Upserting colleges ...")
    seen = {}
    for r in rows:
        code = r["college_code"]
        if code not in seen:
            seen[code] = {
                "college_code": code,
                "college_name": r["college_name"],
                # city/type can be enriched later
                "city":         None,
                "university":   None,
                "college_type": None,
            }
    colleges = list(seen.values())
    for i in range(0, len(colleges), BATCH_SIZE):
        batch = colleges[i:i+BATCH_SIZE]
        supabase.table("colleges").upsert(batch, on_conflict="college_code").execute()
    print(f"  {len(colleges)} colleges upserted.")


def load_cutoffs(rows: list[dict]):
    """Insert cutoff rows in batches."""
    # Strip college_name — it lives in the colleges table
    clean = []
    for r in rows:
        clean.append({
            "year":               int(r["year"]),
            "cap_round":          int(r["cap_round"]),
            "college_code":       r["college_code"],
            "branch_code":        r["branch_code"],
            "branch_name":        r["branch_name"],
            "category":           r["category"],
            "gender_quota":       r["gender_quota"],
            "seat_type":          r["seat_type"],
            "stage":              r["stage"],
            "closing_merit_no":   int(r["closing_merit_no"]),
            "closing_percentile": float(r["closing_percentile"]),
        })

    total = len(clean)
    print(f"  Inserting {total:,} cutoff rows in batches of {BATCH_SIZE} ...")
    for i in range(0, total, BATCH_SIZE):
        batch = clean[i:i+BATCH_SIZE]
        supabase.table("cutoffs").insert(batch).execute()
        done = min(i + BATCH_SIZE, total)
        print(f"    {done:,}/{total:,}", end="\r")
    print(f"  Done — {total:,} rows inserted.      ")


def load_csv(csv_path: Path):
    print(f"\nLoading {csv_path.name} ...")
    with open(csv_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"  {len(rows):,} rows read.")
    load_colleges(rows)
    load_cutoffs(rows)


if __name__ == "__main__":
    csv_files = sorted(PROCESSED_DIR.glob("*.csv"))

    if not csv_files:
        print(f"No CSV files found in {PROCESSED_DIR}")
        sys.exit(1)

    print(f"Found {len(csv_files)} CSV file(s):")
    for f in csv_files:
        print(f"  {f.name}")

    for csv_file in csv_files:
        load_csv(csv_file)

    print("\nAll done! Your Supabase database is loaded.")
    print("Go to your Supabase Table Editor to verify the data.")