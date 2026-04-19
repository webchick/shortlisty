"""CLI: send the digest email for one user.

    uv run python -m v1_claude_native.send_digest --user mom@example.com
"""

import click

from shared.lib.db import get_client
from shared.lib.logging import get_logger
from v1_claude_native.digest import send_digest_for_user

logger = get_logger(__name__)


@click.command()
@click.option("--user", "email", required=True, help="User email")
def main(email: str) -> None:
    db = get_client()
    user = db.table("users").select("*").eq("email", email).single().execute().data
    message_id = send_digest_for_user(user["id"])
    if message_id:
        logger.info("digest_sent", user=email, message_id=message_id)
    else:
        logger.info("nothing_to_send", user=email)


if __name__ == "__main__":
    main()
