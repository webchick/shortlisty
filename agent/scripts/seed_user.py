"""Seed the first users. Edit this file with real info before running.

    uv run python scripts/seed_user.py
"""

from shared.lib.db import get_client
from shared.lib.logging import get_logger

logger = get_logger(__name__)

# -----------------------------------------------------------------------------
# EDIT THIS with real info before running.
# Each entry has a top-level user record plus a list of categories.
# Criteria and notification prefs live per-category — a user tracking both
# jobs and volunteer work can have different "heck no" lists for each.
# -----------------------------------------------------------------------------

USERS = [
    {
        "user": {
            "name": "Linda Example",
            "email": "mom@example.com",
            "profile_summary": (
                "Retired RN with 30+ years of experience, mostly in hospital settings. "
                "Looking to continue practicing in a 1:1 capacity — home health or private "
                "duty nursing. Prefers small-agency or family-direct arrangements over "
                "large corporate home-care chains. Values autonomy and relationship-based "
                "care. Comfortable with pediatrics through geriatrics."
            ),
            "location": {
                "city": "Portland",
                "state": "OR",
                "country": "US",
                "radius_miles": 25,
                "remote_ok": False,
            },
        },
        "categories": [
            {
                "category": "jobs:nursing",
                "criteria": {
                    "ideal": [
                        "1:1 care, single patient or family assignment",
                        "Daytime hours, predictable schedule",
                        "Small agency or direct-hire by family",
                        "Pediatric home health or adult private duty",
                        "Chance to build a long-term relationship with the patient",
                    ],
                    "acceptable": [
                        "Per-diem or part-time",
                        "Occasional weekend shifts",
                        "Hourly rate above regional average",
                    ],
                    "heck_no": [
                        "Overnight-only shifts",
                        "Large corporate home-care chains known for understaffing",
                        "Roles requiring heavy lifting without support",
                        "Travel nursing / short-term contracts far from home",
                        "Anywhere that treats nurses like a number",
                    ],
                },
                "notification_schedule": "weekly",
                "notification_day": "sunday",
                "notification_hour": 18,
            },
        ],
    },
    {
        "user": {
            "name": "Alex Example",
            "email": "friend@example.com",
            "profile_summary": (
                "Developer educator and video producer. Specializes in structured "
                "learning content, screencasts, and hands-on tutorials. 10+ years "
                "experience bridging engineering and education. Strong in modern web "
                "stacks; comfortable on-camera. Looking for senior IC or team-lead roles "
                "at companies that take developer education seriously as a discipline."
            ),
            "location": {
                "city": "Austin",
                "state": "TX",
                "country": "US",
                "radius_miles": 50,
                "remote_ok": True,
            },
        },
        "categories": [
            {
                "category": "jobs:developer-education",
                "criteria": {
                    "ideal": [
                        "Senior developer educator / developer advocate / DevRel engineer",
                        "Structured learning or video-first content strategy",
                        "Product where developer experience is a top-3 priority",
                        "Remote-first or hybrid with strong async culture",
                        "Team includes both engineers and educators",
                    ],
                    "acceptable": [
                        "Individual contributor or small-team lead",
                        "Travel up to 20% for conferences or workshops",
                        "Part-time or contract",
                    ],
                    "heck_no": [
                        "Pure marketing / evangelism with no engineering depth",
                        "Early-stage startup (pre-seed / seed) with no educator on staff",
                        "Roles that are 'create content we'll tell you what' with no ownership",
                        "In-person only",
                        "Companies with reputations for DevRel churn",
                    ],
                },
                "notification_schedule": "weekly",
                "notification_day": "sunday",
                "notification_hour": 18,
            },
        ],
    },
    {
        "user": {
            "name": "Partner Example",
            "email": "partner@example.com",
            "profile_summary": (
                "Former nurse, now pivoting into graphic design. Currently completing a "
                "design course. Looking to build a real portfolio through volunteer and "
                "pro-bono work before moving into paid roles. Strong visual sensibility, "
                "detail-oriented, comfortable with fast feedback loops."
            ),
            "location": {
                "city": "Portland",
                "state": "OR",
                "country": "US",
                "radius_miles": 30,
                "remote_ok": True,
            },
        },
        "categories": [
            {
                "category": "volunteer:graphic-design",
                "criteria": {
                    "ideal": [
                        "Nonprofit or community org that needs real design work, not busywork",
                        "Project with a clear deliverable (poster, brand guide, social assets)",
                        "Flexible timing, async-friendly",
                        "Cause areas: health, environment, animals, social services",
                        "Opportunity to own the design direction, not just execute",
                    ],
                    "acceptable": [
                        "Short-term or one-off project",
                        "Some in-person collaboration",
                        "Organization new to working with designers (willing to educate)",
                    ],
                    "heck_no": [
                        "Spec work or 'contest' with no guaranteed outcome",
                        "Orgs that expect free work in exchange for 'exposure'",
                        "Rigid corporate style guides with no creative latitude",
                        "More than 10 hours/week commitment",
                    ],
                },
                "notification_schedule": "weekly",
                "notification_day": "sunday",
                "notification_hour": 18,
            },
        ],
    },
]


def main() -> None:
    db = get_client()
    for entry in USERS:
        user_data = entry["user"]
        existing = db.table("users").select("id").eq("email", user_data["email"]).execute()
        if existing.data:
            logger.info("user_exists_skipping", email=user_data["email"])
            continue
        result = db.table("users").insert(user_data).execute()
        user_id = result.data[0]["id"]
        logger.info("seeded_user", email=user_data["email"], id=user_id)

        for uc in entry["categories"]:
            db.table("user_categories").insert({"user_id": user_id, **uc}).execute()
            logger.info("seeded_category", email=user_data["email"], category=uc["category"])


if __name__ == "__main__":
    main()
