"""Claude client + helpers for JSON-mode calls.

All three agent versions use this. V1 uses it for agent-loop tool calls;
V2 and V3 use it for single scoring/enrichment/discovery calls.
"""

import json
from functools import cache

from anthropic import Anthropic

from shared.lib.logging import get_logger
from shared.lib.settings import settings

logger = get_logger(__name__)

# Model names — centralized so you can swap them in one place.
MODEL_SMART = "claude-opus-4-7"           # scoring, discovery (quality matters)
MODEL_FAST = "claude-haiku-4-5-20251001"  # enrichment, cheap classification


@cache
def get_client() -> Anthropic:
    return Anthropic(api_key=settings.claude_api_key)


def call_json(
    prompt: str,
    *,
    model: str = MODEL_SMART,
    max_tokens: int = 1024,
    system: str | None = None,
) -> dict:
    """Call Claude expecting JSON output. Strips markdown fences if present."""
    client = get_client()
    messages = [{"role": "user", "content": prompt}]
    kwargs = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system:
        kwargs["system"] = system
    response = client.messages.create(**kwargs)
    text = response.content[0].text.strip()

    # Strip ```json ... ``` fences if Claude included them despite instructions.
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error("claude_returned_invalid_json", response=text[:500])
        raise
