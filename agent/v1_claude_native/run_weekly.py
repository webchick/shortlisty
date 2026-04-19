"""CLI: run the weekly pipeline for all active users. Cron-friendly.

Intended to run once a week (or daily if a user's schedule is daily).

Example cron:
    0 18 * * 0 cd /path/to/agent && uv run python -m v1_claude_native.run_weekly
"""

from shared.lib.db import get_client
from shared.lib.logging import get_logger
from v1_claude_native.run_once import main as run_once_main
from click.testing import CliRunner  # used only to re-invoke run_once with flags

logger = get_logger(__name__)


def main() -> None:
    db = get_client()
    users = db.table("users").select("id, email").eq("active", True).execute().data
    logger.info("weekly_run_start", user_count=len(users))

    for u in users:
        logger.info("processing_user", email=u["email"])
        try:
            # Re-run the end-to-end flow with --send for each active user.
            CliRunner().invoke(
                run_once_main,
                ["--user", u["email"], "--send"],
                catch_exceptions=False,
            )
        except Exception:
            logger.exception("weekly_user_failed", email=u["email"])
            # Continue to next user; partial failures should not halt the batch.

    logger.info("weekly_run_done")


if __name__ == "__main__":
    main()
