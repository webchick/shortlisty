"""CLI: just run the discovery agent for one user.

    uv run python -m v1_claude_native.discover --user mom@example.com
"""

import click

from shared.lib.db import get_client
from shared.lib.logging import get_logger
from v1_claude_native.agents import run_discovery

logger = get_logger(__name__)


@click.command()
@click.option("--user", "email", required=True, help="User email")
def main(email: str) -> None:
    db = get_client()
    user = db.table("users").select("*").eq("email", email).single().execute().data
    categories = db.table("user_categories").select("*").eq("user_id", user["id"]).execute().data
    for uc in categories:
        logger.info("discovery_start", user=email, category=uc["category"])
        summary = run_discovery(user, uc)
        logger.info("discovery_done", user=email, category=uc["category"], summary=summary)


if __name__ == "__main__":
    main()
