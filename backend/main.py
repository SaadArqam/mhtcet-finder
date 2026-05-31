"""
MHT CET College Finder — Backend API
FastAPI app with a single /recommend endpoint.

Usage:
    pip3 install fastapi uvicorn supabase python-dotenv
    uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path
import os
from typing import List, Optional

# ── Load .env ────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="MHT CET College Finder API")

# Allow frontend (localhost dev + production) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Top 5 fixed colleges (shown to everyone regardless of percentile) ────────
TOP_5_COLLEGE_CODES = [
    "16006",  # COEP Technological University, Pune
    "03012",  # Veermata Jijabai Technological Institute (VJTI), Mumbai
    "03036",  # Institute of Chemical Technology, Mumbai
    "04025",  # Government College of Engineering, Nagpur
    "01002",  # Government College of Engineering, Amravati
]

COLLEGE_SELECT = (
    "college_code, branch_name, category, gender_quota, closing_percentile, "
    "colleges(college_name, city, college_type, naac_grade, is_autonomous, "
    "is_nba, is_girls_only, is_minority)"
)

# ── Request / Response models ────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    percentile:    float     = Field(..., ge=0, le=100, description="MHT CET percentile")
    category:      str       = Field(..., description="OPEN / OBC / SC / ST / EWS / NT1 / NT2 / NT3 / VJ / SEBC")
    branch:        List[str] = Field(..., description="List of preferred branches")
    cities:        List[str] = Field(default=[], description="Filter by city")
    gender:        str       = Field("General", description="General or Ladies")
    cap_round:     int       = Field(3, description="Which CAP round data to use (1 or 3). Default: 3")
    window:        float     = Field(5.0, description="Percentile window for matching (default ±5)")
    seat_type:     str       = Field("all", description='"all", "State", or "Other"')
    minority_only: bool      = Field(False, description="Filter only minority colleges")

class CollegeResult(BaseModel):
    college_code:       str
    college_name:       str
    branch_name:        str
    category:           str
    gender_quota:       str
    closing_percentile: float
    difference:         float
    is_top5:            bool
    city:               Optional[str] = None
    college_type:       Optional[str] = None
    naac_grade:         Optional[str] = None
    is_autonomous:      bool = False
    is_nba:             bool = False
    is_girls_only:      bool = False
    is_minority:        bool = False

class RecommendResponse(BaseModel):
    percentile:   float
    category:     str
    branch:       List[str]
    top5:         list[CollegeResult]
    personalized: list[CollegeResult]


# ── Helpers ──────────────────────────────────────────────────────────────────
BRANCH_ALIASES = {
    "Computer Science and Engineering": [
        "Computer Science and Engineering",
        "Computer Engineering",
        "Computer Science",
        "Computer Science & Engineering",
    ],
    "Information Technology": [
        "Information Technology",
        "Information Technology (Engineering)",
    ],
    "Mechanical Engineering": [
        "Mechanical Engineering",
        "Mechanical & Automation Engineering",
    ],
    "Electronics and Telecommunication Engg": [
        "Electronics and Telecommunication Engg",
        "Electronics Engineering",
        "Electronics & Telecommunication Engineering",
    ],
}

def _branch_variants(branches: List[str]) -> list[str]:
    variants = []
    for b in branches:
        variants.extend(BRANCH_ALIASES.get(b, [b]))
    return list(set(variants))


def fetch_top5(
    branches: List[str],
    category: str,
    gender: str,
    cap_round: int,
    seat_type: str,
    minority_only: bool,
    cities: List[str],
) -> list[dict]:
    """Fetch top 5 colleges — checks all branch aliases for the requested branches."""
    branch_variants = _branch_variants(branches)

    results = []
    for cap in [cap_round, 1]:
        query = (
            supabase.table("cutoffs")
            .select(COLLEGE_SELECT)
            .in_("college_code", TOP_5_COLLEGE_CODES)
            .in_("branch_name", branch_variants)
            .eq("category", category)
            .eq("gender_quota", gender)
            .eq("cap_round", cap)
            .eq("stage", "I")
        )

        if seat_type != "all":
            query = query.eq("seat_type", seat_type)
        if minority_only:
            query = query.eq("colleges.is_minority", True)
        if cities:
            query = query.in_("colleges.city", cities)

        res = query.order("closing_percentile", desc=True).execute()
        if res.data:
            results.extend(res.data)

    return results


def fetch_personalized(
    percentile: float,
    branches: List[str],
    category: str,
    gender: str,
    cap_round: int,
    window: float,
    seat_type: str,
    minority_only: bool,
    cities: List[str],
) -> list[dict]:
    """
    Fetch colleges where last year's closing percentile was within ±window
    of the student's percentile, excluding the top 5 fixed colleges.
    Sorted by closest match first.
    """
    low  = round(percentile - window, 7)
    high = round(percentile + window, 7)

    query = (
        supabase.table("cutoffs")
        .select(COLLEGE_SELECT)
        .in_("branch_name", branches)
        .eq("category", category)
        .eq("gender_quota", gender)
        .eq("cap_round", cap_round)
        .eq("stage", "I")
        .gte("closing_percentile", low)
        .lte("closing_percentile", high)
        .not_.in_("college_code", TOP_5_COLLEGE_CODES)
    )

    if seat_type != "all":
        query = query.eq("seat_type", seat_type)
    if minority_only:
        query = query.eq("colleges.is_minority", True)
    if cities:
        query = query.in_("colleges.city", cities)

    res = query.order("closing_percentile", desc=True).limit(50).execute()
    return [row for row in (res.data or []) if row.get("colleges") is not None]


def format_result(row: dict, student_percentile: float, is_top5: bool) -> CollegeResult:
    colleges_data = row.get("colleges") or {}
    college_name = colleges_data.get("college_name", "") if isinstance(colleges_data, dict) else ""
    closing = float(row["closing_percentile"])

    return CollegeResult(
        college_code=row["college_code"],
        college_name=college_name,
        branch_name=row["branch_name"],
        category=row["category"],
        gender_quota=row["gender_quota"],
        closing_percentile=closing,
        difference=round(closing - student_percentile, 2),
        is_top5=is_top5,
        city=colleges_data.get("city"),
        college_type=colleges_data.get("college_type"),
        naac_grade=colleges_data.get("naac_grade"),
        is_autonomous=colleges_data.get("is_autonomous", False),
        is_nba=colleges_data.get("is_nba", False),
        is_girls_only=colleges_data.get("is_girls_only", False),
        is_minority=colleges_data.get("is_minority", False),
    )


# ── Main endpoint ────────────────────────────────────────────────────────────
@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    category = req.category.upper()
    gender   = req.gender.capitalize()

    valid_categories = {"OPEN", "OBC", "SC", "ST", "EWS", "NT1", "NT2", "NT3", "VJ", "SEBC", "TFWS"}
    if category not in valid_categories:
        raise HTTPException(400, f"Invalid category '{category}'. Must be one of: {valid_categories}")

    valid_genders = {"General", "Ladies"}
    if gender not in valid_genders:
        raise HTTPException(400, f"Invalid gender '{gender}'. Must be General or Ladies.")

    top5_rows = fetch_top5(
        req.branch, category, gender, req.cap_round, req.seat_type, req.minority_only, req.cities
    )
    top5 = [format_result(r, req.percentile, is_top5=True) for r in top5_rows]

    seen_top5 = set()
    dedup_top5 = []
    for t in top5:
        key = f"{t.college_code}::{t.branch_name}"
        if key not in seen_top5:
            seen_top5.add(key)
            dedup_top5.append(t)
    top5 = dedup_top5

    personalized_rows = fetch_personalized(
        req.percentile, req.branch, category, gender, req.cap_round, req.window,
        req.seat_type, req.minority_only, req.cities,
    )
    personalized = [format_result(r, req.percentile, is_top5=False) for r in personalized_rows]
    personalized.sort(key=lambda x: abs(x.difference))

    return RecommendResponse(
        percentile=req.percentile,
        category=req.category,
        branch=req.branch,
        top5=top5,
        personalized=personalized,
    )


# ── Utility endpoints ────────────────────────────────────────────────────────
@app.get("/branches")
def list_branches():
    """Returns all unique branch names — for populating the frontend dropdown."""
    res = supabase.table("cutoffs").select("branch_name").execute()
    branches = sorted(set(r["branch_name"] for r in res.data))
    return {"branches": branches}


@app.get("/cities")
def list_cities():
    """Returns distinct non-null cities from colleges table, sorted alphabetically."""
    res = supabase.table("colleges").select("city").execute()
    cities = sorted(set(r["city"] for r in res.data if r["city"]))
    return {"cities": cities}


@app.get("/health")
def health():
    return {"status": "ok"}
