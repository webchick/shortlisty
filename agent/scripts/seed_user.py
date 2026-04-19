"""Seed the first users. Edit this file with real info before running.

    uv run python scripts/seed_user.py
"""

from shared.lib.db import get_client
from shared.lib.logging import get_logger

logger = get_logger(__name__)

# -----------------------------------------------------------------------------
# EDIT THIS with real info before running.
# -----------------------------------------------------------------------------

USERS = [
    {
        "name": "Linda Example",
        "email": "mom@example.com",
        "profession_category": "nursing",
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
    {
        "name": "Alex Example",
        "email": "friend@example.com",
        "profession_category": "developer-education",
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
]


def main() -> None:
    db = get_client()
    for user_data in USERS:
        existing = db.table("users").select("id").eq("email", user_data["email"]).execute()
        if existing.data:
            logger.info("user_exists_skipping", email=user_data["email"])
            continue
        result = db.table("users").insert(user_data).execute()
        logger.info("seeded_user", email=user_data["email"], id=result.data[0]["id"])


if __name__ == "__main__":
    main()
