"""CLI: run the full pipeline once for one user.

    uv run python -m v1_claude_native.run_once --user mom@example.com
"""

from datetime import datetime, timedelta, timezone

import click

from shared.lib.db import get_client
from shared.lib.logging import get_logger
from v1_claude_native.agents import run_crawl, run_discovery, run_match
from v1_claude_native.digest import send_digest_for_user

logger = get_logger(__name__)


@click.command()
@click.option("--user", "email", required=True, help="User email")
@click.option("--skip-discovery", is_flag=True, help="Skip discovery even if stale")
@click.option("--skip-crawl", is_flag=True, help="Skip crawl (use existing jobs)")
@click.option("--send", is_flag=True, help="Also send the digest email at the end")
def main(email: str, skip_discovery: bool, skip_crawl: bool, send: bool) -> None:
    db = get_client()
    user = db.table("users").select("*").eq("email", email).single().execute().data
    logger.info("run_start", user=email)

    # 1. Discovery if the user has no sources or they're old
    user_sources = (
        db.table("user_sources").select("*, sources(*)").eq("user_id", user["id"]).execute().data
    )
    stale = False
    if user_sources:
        oldest = min(datetime.fromisoformat(s["added_at"]) for s in user_sources)
        stale = oldest < datetime.now(timezone.utc) - timedelta(days=30)

    if (not user_sources or stale) and not skip_discovery:
        logger.info("running_discovery", user=email)
        run_discovery(user)
        user_sources = (
            db.table("user_sources").select("*, sources(*)").eq("user_id", user["id"]).execute().data
        )

    # 2. Crawl each source (respecting per-source freshness)
    if not skip_crawl:
        for us in user_sources:
            source = us["sources"]
            if not source or not us["enabled"]:
                continue
            freshness = timedelta(hours=source.get("crawl_frequency_hours", 24))
            last = source.get("last_crawled_at")
            if last and datetime.fromisoformat(last) > datetime.now(timezone.utc) - freshness:
                logger.info("skipping_crawl_fresh", source=source["name"])
                continue
            logger.info("running_crawl", source=source["name"])
            try:
                run_crawl(source, us["search_terms"], user["location"])
                db.table("sources").update({
                    "last_crawled_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", source["id"]).execute()
            except Exception:
                logger.exception("crawl_failed_continuing", source=source["name"])

    # 3. Match
    logger.info("running_match", user=email)
    run_match(user)

    # 4. Optionally send digest
    if send:
        logger.info("sending_digest", user=email)
        message_id = send_digest_for_user(user["id"])
        if message_id:
            logger.info("digest_sent", user=email, message_id=message_id)
        else:
            logger.info("no_digest_needed", user=email)

    logger.info("run_complete", user=email)


if __name__ == "__main__":
    main()
