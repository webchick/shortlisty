"""Send the weekly digest email for a user."""

from datetime import datetime, timezone
from uuid import UUID

from shared.lib.db import get_client
from shared.lib.email import send_digest as send_email
from shared.lib.logging import get_logger

logger = get_logger(__name__)


def send_digest_for_user(user_id: UUID) -> str | None:
    """Send digest for one user. Returns Resend message ID, or None if no matches."""
    db = get_client()
    user_result = db.table("users").select("*").eq("id", str(user_id)).single().execute()
    user = user_result.data

    matches_result = (
        db.table("user_job_matches")
        .select("*, jobs(*)")
        .eq("user_id", str(user_id))
        .is_("notified_at", "null")
        .gte("score", 60)
        .order("score", desc=True)
        .execute()
    )
    if not matches_result.data:
        logger.info("no_pending_matches", user=user["email"])
        return None

    # Flatten job fields into the match dict for the email template.
    matches = []
    match_ids = []
    for row in matches_result.data:
        job = row["jobs"]
        matches.append({
            **row,
            "title": job["title"],
            "company": job.get("company"),
            "location_text": job.get("location_text"),
            "url": job["url"],
        })
        match_ids.append(row["job_id"])

    message_id = send_email(user, matches)

    # Mark as notified.
    now = datetime.now(timezone.utc).isoformat()
    db.table("user_job_matches").update({"notified_at": now}).eq(
        "user_id", str(user_id)
    ).in_("job_id", match_ids).execute()

    return message_id
