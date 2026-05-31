"""
College Metadata Enricher
Uses Groq API (free) to fill in city, college_type, naac_grade, is_autonomous etc.
for all 307 colleges based on their names.

Usage:
    pip3 install groq supabase python-dotenv
    Add GROQ_API_KEY to your .env file (get free key at console.groq.com)
    python3 enrich_colleges.py
"""

import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
groq     = Groq(api_key=GROQ_API_KEY)

BATCH_SIZE = 20  # colleges per API call

SYSTEM_PROMPT = """You are a database assistant helping enrich a list of Maharashtra engineering colleges.

For each college name provided, return a JSON array with one object per college containing:
- college_code: (same as input, return as-is)
- city: the city where the college is located (e.g. "Mumbai", "Pune", "Nagpur", "Amravati", "Aurangabad", "Kolhapur", "Nashik", "Jalgaon", "Solapur", "Latur" etc.)
- university: the affiliating university (e.g. "Sant Gadge Baba Amravati University", "Dr. Babasaheb Ambedkar Technological University", "Savitribai Phule Pune University", "University of Mumbai", "RTM Nagpur University", "SRTM University", "North Maharashtra University", "Shivaji University")
- college_type: one of "Government", "Aided", "Unaided", "Deemed", "University Department"
- naac_grade: one of "A++", "A+", "A", "B++", "B+", "B", "C", or null if unknown
- is_autonomous: true or false (autonomous colleges set their own exam papers)
- is_girls_only: true or false
- is_minority: true or false (minority institution status)

Rules:
- Colleges with "Government College of Engineering" in name → college_type: "Government"
- VJTI Mumbai → Government, Autonomous, A++ NAAC
- COEP Pune → Government, Autonomous, A++ NAAC
- ICT Mumbai → Deemed, Autonomous, A NAAC
- If unsure about NAAC grade → return null, do NOT guess
- If unsure about city → infer from college name or address if visible
- Return ONLY a valid JSON array, no markdown, no explanation, no preamble
"""

def enrich_batch(colleges: list) -> list:
    college_list = "\n".join(
        f'{c["college_code"]}: {c["college_name"]}' for c in colleges
    )

    response = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Enrich these Maharashtra engineering colleges:\n\n{college_list}"}
        ],
        temperature=0.1,
        max_tokens=4096,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def update_colleges(enriched: list):
    for row in enriched:
        update_data = {k: v for k, v in row.items() if k != "college_code"}
        supabase.table("colleges") \
            .update(update_data) \
            .eq("college_code", row["college_code"]) \
            .execute()


def main():
    print("Fetching colleges from Supabase...")
    res = supabase.table("colleges") \
        .select("college_code, college_name") \
        .order("college_code") \
        .execute()

    colleges = res.data
    print(f"  {len(colleges)} colleges to enrich.")

    total_updated = 0
    total_batches = (len(colleges) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(colleges), BATCH_SIZE):
        batch = colleges[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"\nBatch {batch_num}/{total_batches} ({len(batch)} colleges)...")

        try:
            enriched = enrich_batch(batch)
            update_colleges(enriched)
            total_updated += len(enriched)
            print(f"  ✓ Updated {len(enriched)} colleges.")
        except json.JSONDecodeError as e:
            print(f"  ✗ JSON parse error: {e} — skipping, re-run to retry.")
        except Exception as e:
            print(f"  ✗ Error: {e}")

        if i + BATCH_SIZE < len(colleges):
            time.sleep(0.5)  # stay within free tier rate limits

    print(f"\nDone! {total_updated}/{len(colleges)} colleges enriched.")
    print("Check Supabase Table Editor → colleges to verify.")

if __name__ == "__main__":
    main()