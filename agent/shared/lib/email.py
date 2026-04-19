"""Render and send the weekly digest email via Resend.

All three versions use this exact function. The email is the product;
what changes between versions is how we produce the `matches` argument.
"""

from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from shared.lib.logging import get_logger
from shared.lib.settings import settings

logger = get_logger(__name__)

resend.api_key = settings.resend_api_key

TEMPLATES_DIR = Path(__file__).parent.parent / "email_templates"
_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_digest(user: dict, matches: list[dict]) -> tuple[str, str, str]:
    """Return (subject, html_body, text_body)."""
    ideal = [m for m in matches if m["verdict"] == "ideal"]
    worth_a_look = [m for m in matches if m["verdict"] == "worth_a_look"]

    subject_tmpl = _env.get_template("digest_subject.txt")
    html_tmpl = _env.get_template("digest.html")
    text_tmpl = _env.get_template("digest.txt")

    ctx = {
        "user": user,
        "ideal_matches": ideal,
        "worth_a_look_matches": worth_a_look,
        "total": len(matches),
    }
    return (
        subject_tmpl.render(**ctx).strip(),
        html_tmpl.render(**ctx),
        text_tmpl.render(**ctx),
    )


def send_digest(user: dict, matches: list[dict]) -> str:
    """Send the digest email. Returns Resend message ID."""
    if not matches:
        raise ValueError("No matches to send — caller should skip empty digests")

    subject, html, text = render_digest(user, matches)
    logger.info(
        "sending_digest",
        user=user["email"],
        match_count=len(matches),
        subject=subject,
    )
    response = resend.Emails.send({
        "from": f"{settings.digest_from_name} <{settings.digest_from_email}>",
        "to": [user["email"]],
        "subject": subject,
        "html": html,
        "text": text,
        "reply_to": settings.digest_from_email,
    })
    return response["id"]
