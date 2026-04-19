"""Tools Claude can call during agent runs.

Each tool has:
  - a schema (for the Anthropic API)
  - a handler (Python function that executes the side-effect)

The agent loop in agents.py dispatches tool_use blocks to these handlers.
"""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from shared.lib.db import get_client
from shared.lib.jobs import job_content_hash, should_save_match, verdict_from_score
from shared.lib.logging import get_logger

logger = get_logger(__name__)


# ----- Schemas (exposed to Claude) -----

SAVE_SOURCE_TOOL = {
    "name": "save_source",
    "description": "Record a discovered job source for this user. Creates the source if it doesn't exist, then links it to the user.",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "url": {"type": "string"},
            "search_url_pattern": {"type": "string"},
            "type": {"type": "string", "enum": ["api", "rss", "browse"]},
            "access_notes": {"type": "string"},
            "best_search_terms": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
            "reasoning": {"type": "string"},
        },
        "required": ["name", "url", "type", "best_search_terms", "confidence"],
    },
}

SAVE_JOB_TOOL = {
    "name": "save_job",
    "description": "Save a normalized job posting to the shared jobs pool. Returns the job_id. Use this during crawl runs.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "company": {"type": "string"},
            "location_text": {"type": "string"},
            "description": {"type": "string"},
            "url": {"type": "string"},
            "external_id": {"type": "string"},
            "posted_at": {"type": "string", "description": "ISO 8601 timestamp"},
            "category_tags": {"type": "array", "items": {"type": "string"}},
            "shift_pattern": {
                "type": "string",
                "enum": ["days", "nights", "weekends", "rotating", "flexible"],
            },
            "employment_type": {
                "type": "string",
                "enum": ["full-time", "part-time", "contract", "per-diem", "temporary"],
            },
            "remote": {"type": "string", "enum": ["yes", "no", "hybrid"]},
            "seniority": {"type": "string", "enum": ["entry", "mid", "senior", "lead"]},
        },
        "required": ["title", "url", "description"],
    },
}

SAVE_MATCH_TOOL = {
    "name": "save_match",
    "description": "Save a scored match for the current user. Use this during match runs.",
    "input_schema": {
        "type": "object",
        "properties": {
            "job_id": {"type": "string", "description": "UUID returned from save_job"},
            "score": {"type": "integer", "minimum": 0, "maximum": 100},
            "one_line_summary": {"type": "string"},
            "matched_criteria": {"type": "array", "items": {"type": "string"}},
            "concerns": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["job_id", "score", "one_line_summary"],
    },
}

MARK_SEEN_TOOL = {
    "name": "mark_seen",
    "description": "Mark a job as seen by the current user so it won't be re-surfaced.",
    "input_schema": {
        "type": "object",
        "properties": {
            "job_id": {"type": "string"},
        },
        "required": ["job_id"],
    },
}


DISCOVERY_TOOLS = [SAVE_SOURCE_TOOL]
CRAWL_TOOLS = [SAVE_JOB_TOOL]
MATCH_TOOLS = [SAVE_MATCH_TOOL, MARK_SEEN_TOOL]


# ----- Handlers -----


def handle_save_source(input: dict, *, user_id: UUID, category: str | None = None) -> dict:
    db = get_client()
    # Upsert source by URL.
    existing = db.table("sources").select("id").eq("url", input["url"]).execute()
    if existing.data:
        source_id = existing.data[0]["id"]
    else:
        inserted = db.table("sources").insert({
            "name": input["name"],
            "url": input["url"],
            "type": input["type"],
            "search_url_pattern": input.get("search_url_pattern"),
            "access_notes": input.get("access_notes"),
        }).execute()
        source_id = inserted.data[0]["id"]

    db.table("user_sources").upsert({
        "user_id": str(user_id),
        "source_id": source_id,
        "category": category,
        "search_terms": input["best_search_terms"],
        "confidence": input["confidence"],
        "enabled": True,
    }).execute()

    logger.info("saved_source", user_id=str(user_id), source=input["name"])
    return {"source_id": source_id}


def handle_save_job(input: dict, *, source_id: UUID | None = None) -> dict:
    db = get_client()
    content_hash = job_content_hash(
        input["title"], input.get("company"), input.get("location_text")
    )
    payload = {
        "source_id": str(source_id) if source_id else None,
        "external_id": input.get("external_id"),
        "content_hash": content_hash,
        "title": input["title"],
        "company": input.get("company"),
        "location_text": input.get("location_text"),
        "description": input["description"],
        "url": input["url"],
        "posted_at": input.get("posted_at"),
        "category_tags": input.get("category_tags", []),
        "shift_pattern": input.get("shift_pattern"),
        "employment_type": input.get("employment_type"),
        "remote": input.get("remote"),
        "seniority": input.get("seniority"),
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    }
    # Upsert by content_hash so re-seeing a job just bumps last_seen_at.
    existing = db.table("jobs").select("id").eq("content_hash", content_hash).execute()
    if existing.data:
        job_id = existing.data[0]["id"]
        db.table("jobs").update({"last_seen_at": payload["last_seen_at"]}).eq("id", job_id).execute()
    else:
        inserted = db.table("jobs").insert(payload).execute()
        job_id = inserted.data[0]["id"]

    logger.info("saved_job", job_id=job_id, title=input["title"])
    return {"job_id": job_id}


def handle_save_match(input: dict, *, user_id: UUID) -> dict:
    db = get_client()
    score = input["score"]
    if not should_save_match(score):
        return {"saved": False, "reason": "score below threshold"}

    db.table("user_job_matches").upsert({
        "user_id": str(user_id),
        "job_id": input["job_id"],
        "score": score,
        "verdict": verdict_from_score(score),
        "one_line_summary": input["one_line_summary"],
        "matched_criteria": input.get("matched_criteria", []),
        "concerns": input.get("concerns", []),
    }).execute()

    # Also mark as seen so we don't re-score it.
    db.table("user_seen_jobs").upsert({
        "user_id": str(user_id),
        "job_id": input["job_id"],
    }).execute()

    logger.info("saved_match", user_id=str(user_id), score=score)
    return {"saved": True}


def handle_mark_seen(input: dict, *, user_id: UUID) -> dict:
    db = get_client()
    db.table("user_seen_jobs").upsert({
        "user_id": str(user_id),
        "job_id": input["job_id"],
    }).execute()
    return {"ok": True}


def dispatch_tool(
    tool_name: str,
    tool_input: dict,
    *,
    user_id: UUID | None = None,
    source_id: UUID | None = None,
    category: str | None = None,
) -> Any:
    """Single entry point for tool dispatch from the agent loop."""
    if tool_name == "save_source":
        return handle_save_source(tool_input, user_id=user_id, category=category)
    if tool_name == "save_job":
        return handle_save_job(tool_input, source_id=source_id)
    if tool_name == "save_match":
        return handle_save_match(tool_input, user_id=user_id)
    if tool_name == "mark_seen":
        return handle_mark_seen(tool_input, user_id=user_id)
    raise ValueError(f"Unknown tool: {tool_name}")
