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
# These are the aspirational/prestige colleges your client wants shown first.
# Update this list as needed — use the exact college_code from your DB.
TOP_5_COLLEGE_CODES = [
    "16006",  # COEP Technological University, Pune
    "03012",  # Veermata Jijabai Technological Institute (VJTI), Mumbai
    "03036",  # Institute of Chemical Technology, Mumbai
    "04025",  # Government College of Engineering, Nagpur
    "01002",  # Government College of Engineering, Amravati
]

# ── Request / Response models ────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    percentile: float = Field(..., ge=0, le=100, description="MHT CET percentile")
    category:   str   = Field(..., description="OPEN / OBC / SC / ST / EWS / NT1 / NT2 / NT3 / VJ / SEBC")
    branch:     str   = Field(..., description="e.g. Computer Science and Engineering")
    gender:     str   = Field("General", description="General or Ladies")
    cap_round:  int   = Field(3, description="Which CAP round data to use (1 or 3). Default: 3")
    window:     float = Field(5.0, description="Percentile window for matching (default ±5)")

class CollegeResult(BaseModel):
    college_code:        str
    college_name:        str
    branch_name:         str
    category:            str
    gender_quota:        str
    closing_percentile:  float
    difference:          float   # how far from student's percentile
    is_top5:             bool

class RecommendResponse(BaseModel):
    percentile:   float
    category:     str
    branch:       str
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

def fetch_top5(branch: str, category: str, gender: str, cap_round: int) -> list[dict]:
    """Fetch top 5 colleges — tries exact branch first, then aliases, then CAP1 fallback."""
    branch_variants = BRANCH_ALIASES.get(branch, [branch])

    for cap in [cap_round, 1]:  # fallback to CAP1 if CAP3 has no data
        for variant in branch_variants:
            res = (
                supabase.table("cutoffs")
                .select("college_code, branch_name, category, gender_quota, closing_percentile, colleges(college_name)")
                .in_("college_code", TOP_5_COLLEGE_CODES)
                .eq("branch_name", variant)
                .eq("category", category)
                .eq("gender_quota", gender)
                .eq("cap_round", cap)
                .eq("stage", "I")
                .order("closing_percentile", desc=True)
                .execute()
            )
            if res.data:
                return res.data

    return []


def fetch_personalized(
    percentile: float,
    branch: str,
    category: str,
    gender: str,
    cap_round: int,
    window: float,
) -> list[dict]:
    """
    Fetch colleges where last year's closing percentile was within ±window
    of the student's percentile, excluding the top 5 fixed colleges.
    Sorted by closest match first.
    """
    low  = round(percentile - window, 7)
    high = round(percentile + window, 7)

    res = (
        supabase.table("cutoffs")
        .select("college_code, branch_name, category, gender_quota, closing_percentile, colleges(college_name)")
        .eq("branch_name", branch)
        .eq("category", category)
        .eq("gender_quota", gender)
        .eq("cap_round", cap_round)
        .eq("stage", "I")
        .gte("closing_percentile", low)
        .lte("closing_percentile", high)
        .not_.in_("college_code", TOP_5_COLLEGE_CODES)
        .order("closing_percentile", desc=True)
        .limit(20)
        .execute()
    )
    return res.data or []


def format_result(row: dict, student_percentile: float, is_top5: bool) -> CollegeResult:
    college_name = (
        row.get("colleges", {}).get("college_name", "")
        if isinstance(row.get("colleges"), dict)
        else row.get("college_name", "")
    )
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
    )


# ── Main endpoint ────────────────────────────────────────────────────────────
@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    category = req.category.upper()
    gender   = req.gender.capitalize()

    # Validate category
    valid_categories = {"OPEN","OBC","SC","ST","EWS","NT1","NT2","NT3","VJ","SEBC","TFWS"}
    if category not in valid_categories:
        raise HTTPException(400, f"Invalid category '{category}'. Must be one of: {valid_categories}")

    valid_genders = {"General", "Ladies"}
    if gender not in valid_genders:
        raise HTTPException(400, f"Invalid gender '{gender}'. Must be General or Ladies.")

    # Fetch top 5 fixed colleges
    top5_rows = fetch_top5(req.branch, category, gender, req.cap_round)
    top5 = [format_result(r, req.percentile, is_top5=True) for r in top5_rows]

    # Fetch personalized colleges (±window)
    personalized_rows = fetch_personalized(
        req.percentile, req.branch, category, gender, req.cap_round, req.window
    )
    personalized = [format_result(r, req.percentile, is_top5=False) for r in personalized_rows]

    # Sort personalized by closest match
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
    res = (
        supabase.table("cutoffs")
        .select("branch_name")
        .execute()
    )
    branches = sorted(set(r["branch_name"] for r in res.data))
    return {"branches": branches}


@app.get("/health")
def health():
    return {"status": "ok"}