"""CLI: run the full pipeline once for one user.

    uv run python -m v1_claude_native.run_once --user mom@example.com
    uv run python -m v1_claude_native.run_once --user partner@example.com --category volunteer:graphic-design
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
@click.option("--category", default=None, help="Run only this category (e.g. jobs:nursing). Defaults to all active.")
@click.option("--skip-discovery", is_flag=True, help="Skip discovery even if stale")
@click.option("--skip-crawl", is_flag=True, help="Skip crawl (use existing listings)")
@click.option("--send", is_flag=True, help="Also send the digest email at the end")
def main(email: str, category: str | None, skip_discovery: bool, skip_crawl: bool, send: bool) -> None:
    db = get_client()
    user = db.table("users").select("*").eq("email", email).single().execute().data
    logger.info("run_start", user=email)

    # Load active categories for this user (optionally filtered to one).
    uc_query = db.table("user_categories").select("*").eq("user_id", user["id"]).eq("active", True)
    if category:
        uc_query = uc_query.eq("category", category)
    user_categories = uc_query.execute().data

    if not user_categories:
        logger.error("no_active_categories", user=email)
        return

    for uc in user_categories:
        cat = uc["category"]
        logger.info("processing_category", user=email, category=cat)

        # 1. Discovery if the user has no sources for this category or they're stale.
        user_sources = (
            db.table("user_sources")
            .select("*, sources(*)")
            .eq("user_id", user["id"])
            .eq("category", cat)
            .execute()
            .data
        )
        stale = False
        if user_sources:
            oldest = min(datetime.fromisoformat(s["added_at"]) for s in user_sources)
            stale = oldest < datetime.now(timezone.utc) - timedelta(days=30)

        if (not user_sources or stale) and not skip_discovery:
            logger.info("running_discovery", user=email, category=cat)
            run_discovery(user, uc)
            user_sources = (
                db.table("user_sources")
                .select("*, sources(*)")
                .eq("user_id", user["id"])
                .eq("category", cat)
                .execute()
                .data
            )

        # 2. Crawl each source (respecting per-source freshness).
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
                        "last_crawled_at": datetime.now(timezone.utc).isoformat(),
                        "last_successful_crawl_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", source["id"]).execute()
                except Exception:
                    logger.exception("crawl_failed_continuing", source=source["name"])
                    db.table("sources").update({
                        "last_crawled_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", source["id"]).execute()

        # 3. Match.
        logger.info("running_match", user=email, category=cat)
        run_match(user, uc)

    # 4. Optionally send digest (covers all categories in one email).
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
