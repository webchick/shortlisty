"""The three agent loops for V1.

Each agent is a Claude tool-use loop: we give Claude a prompt and a set of tools,
it plans, searches, saves results, and reports back. The agent decides when it's
done and emits a final text response.
"""

from datetime import datetime, timezone
from uuid import UUID

from anthropic import RateLimitError
from anthropic.types import MessageParam
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from shared.lib.claude import MODEL_FAST, MODEL_SMART, get_client
from shared.lib.db import get_client as db_client
from shared.lib.logging import get_logger
from shared.lib.prompts import render_prompt
from v1_claude_native.tools import CRAWL_TOOLS, DISCOVERY_TOOLS, MATCH_TOOLS, dispatch_tool

logger = get_logger(__name__)

# Web search is provided by Anthropic as a built-in tool.
WEB_SEARCH_TOOL = {"type": "web_search_20250305", "name": "web_search"}


def _is_retryable_rate_limit(exc: BaseException) -> bool:
    """Return True only for transient rate limits, not credit-balance exhaustion."""
    if not isinstance(exc, RateLimitError):
        return False
    body = getattr(exc, "body", {}) or {}
    error_type = (body.get("error") or {}).get("type", "") if isinstance(body, dict) else ""
    if error_type == "billing_error":
        logger.error("billing_error_no_retry", detail=str(exc))
        return False
    return True


def _run_agent_loop(
    *,
    agent_type: str,
    system: str,
    initial_user_message: str,
    tools: list[dict],
    model: str,
    max_iterations: int = 30,
    user_id: UUID | None = None,
    source_id: UUID | None = None,
    category: str | None = None,
) -> dict:
    """Generic tool-use loop. Runs until Claude stops requesting tools or we hit max."""
    run_id = _start_run(agent_type, user_id=user_id, source_id=source_id, category=category)
    client = get_client()
    messages: list[MessageParam] = [{"role": "user", "content": initial_user_message}]
    summary = {"iterations": 0, "tool_calls": {}}

    @retry(
        retry=retry_if_exception(_is_retryable_rate_limit),
        wait=wait_exponential(multiplier=1, min=60, max=120),
        stop=stop_after_attempt(5),
        before_sleep=lambda s: logger.warning("rate_limit_retry", attempt=s.attempt_number, wait=s.next_action.sleep),
    )
    def _call_api():
        return client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            tools=tools,
            messages=messages,
        )

    try:
        for i in range(max_iterations):
            summary["iterations"] = i + 1
            response = _call_api()

            # Append Claude's response to history
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                logger.info("agent_done", agent=agent_type, iterations=i + 1)
                break

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    summary["tool_calls"].setdefault(block.name, 0)
                    summary["tool_calls"][block.name] += 1

                    # Web search is handled server-side by Anthropic; skip dispatch.
                    if block.name == "web_search":
                        logger.info("web_search", query=block.input.get("query", ""))
                        continue

                    try:
                        logger.info("tool_call", tool=block.name, input=block.input)
                        result = dispatch_tool(
                            block.name,
                            block.input,
                            user_id=user_id,
                            source_id=source_id,
                            category=category,
                        )
                        logger.info("tool_result", tool=block.name, result=str(result)[:200])
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result),
                        })
                    except Exception as e:
                        logger.exception("tool_error", tool=block.name)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": f"Error: {e}",
                            "is_error": True,
                        })

                if tool_results:
                    messages.append({"role": "user", "content": tool_results})
            else:
                logger.warning("unexpected_stop_reason", reason=response.stop_reason)
                break

        _finish_run(run_id, status="success", summary=summary)
        return summary
    except Exception as e:
        logger.exception("agent_failed", agent=agent_type)
        _finish_run(run_id, status="failed", summary=summary, error=str(e))
        raise


def run_discovery(user: dict, uc: dict) -> dict:
    """Discover sources for this user+category and save them to user_sources.

    uc is a row from user_categories: {category, criteria, ...}.
    The category prefix ('jobs:', 'volunteer:') determines which prompt and
    which kind of sources to look for.
    """
    domain = uc["category"].split(":")[0]  # 'jobs', 'volunteer', etc.
    prompt = render_prompt(f"{domain}/discovery", user=user, criteria=uc["criteria"])
    system = (
        f"You are a {domain}-source research agent. Use web search to find real, currently-active "
        f"sites for category '{uc['category']}'. For each source you want to recommend, call save_source. "
        "When you've recorded 5-10 good sources, stop."
    )
    return _run_agent_loop(
        agent_type="discovery",
        system=system,
        initial_user_message=prompt,
        tools=[WEB_SEARCH_TOOL] + DISCOVERY_TOOLS,
        model=MODEL_SMART,
        user_id=user["id"],
        category=uc["category"],
        max_iterations=40,
    )


def run_crawl(source: dict, search_terms: list[str], location: dict) -> dict:
    """Browse one source, extract new postings, enrich with tags, save to jobs table."""
    instructions = (
        f"Search the job site at {source['url']} for roles matching these search terms: "
        f"{search_terms}. Location focus: {location.get('city')}, {location.get('state')} "
        f"(within {location.get('radius_miles', 50)} miles, remote OK: {location.get('remote_ok')}). "
        f"For each unique posting you find (up to 20), call save_job with the full description "
        f"and appropriate tags. Use web search to locate listings and read individual postings. "
        f"Access notes for this source: {source.get('access_notes') or 'none'}."
    )
    system = (
        "You are a job-crawling agent. Use web search to find current postings on the given site. "
        "Extract the title, company, location, full description, and URL for each. "
        "Tag each job with category_tags, shift_pattern, employment_type, remote, and seniority. "
        "Use the enrichment prompt guidance: tags are lowercase hyphenated, 3-8 per job. "
        "Don't invent jobs — only save ones you actually found."
    )
    return _run_agent_loop(
        agent_type="crawl",
        system=system,
        initial_user_message=instructions,
        tools=[WEB_SEARCH_TOOL] + CRAWL_TOOLS,
        model=MODEL_FAST,  # crawl/enrich is a cheap classification job
        source_id=source["id"],
        max_iterations=40,
    )


def run_match(user: dict, uc: dict) -> dict:
    """Score candidate listings for this user+category and save matches ≥ 60.

    uc is a row from user_categories: {category, criteria, ...}.
    Currently implements jobs matching; volunteer matching will dispatch to
    volunteer_positions once that domain is fully wired.
    """
    db = db_client()
    category = uc["category"]
    criteria = uc["criteria"]

    # Pull candidates: matching tags, not yet seen.
    candidate_tags = _infer_tags(category)
    seen_result = db.table("user_seen_jobs").select("job_id").eq("user_id", user["id"]).execute()
    seen_ids = {row["job_id"] for row in seen_result.data}

    candidates_query = db.table("jobs").select("*").eq("is_active", True)
    if candidate_tags:
        candidates_query = candidates_query.overlaps("category_tags", candidate_tags)
    candidates = candidates_query.limit(100).execute().data
    candidates = [c for c in candidates if c["id"] not in seen_ids][:50]

    if not candidates:
        logger.info("no_candidates", user=user["email"], category=category)
        return {"candidates": 0, "matches_saved": 0}

    job_summaries = "\n\n---\n\n".join(
        f"job_id: {j['id']}\nTitle: {j['title']}\nCompany: {j.get('company')}\n"
        f"Location: {j.get('location_text')}\nURL: {j['url']}\n\n{j.get('description', '')[:2000]}"
        for j in candidates
    )
    prompt = (
        f"Score each of the following {len(candidates)} job postings for this user.\n\n"
        f"## User profile\n{user['profile_summary']}\n\n"
        f"## Criteria\n"
        f"IDEAL: {criteria['ideal']}\n"
        f"ACCEPTABLE: {criteria['acceptable']}\n"
        f"HECK NO: {criteria['heck_no']}\n\n"
        f"## Location\n{user['location']}\n\n"
        f"## Postings\n\n{job_summaries}\n\n"
        f"For each job, call save_match if score ≥ 60, or mark_seen if score < 60 "
        f"(so we don't re-score it). Work through all jobs before stopping."
    )
    system = (
        "You are a job-scoring agent. Use the scoring rubric strictly: "
        "≥80 ideal, 60-79 worth a look, <60 skip. Any HECK NO match scores 0. "
        "Be concrete about matched_criteria and concerns — reference specific phrases "
        "from the user's criteria list, not generic categories."
    )
    return _run_agent_loop(
        agent_type="match",
        system=system,
        initial_user_message=prompt,
        tools=MATCH_TOOLS,
        model=MODEL_SMART,
        user_id=user["id"],
        category=category,
        max_iterations=60,
    )


def _infer_tags(shortlist_category: str | None) -> list[str]:
    """Rough mapping from shortlist_category to relevant tags for pre-filter.

    This is deliberately simple — tags are the LLM's output from enrichment,
    and we just want a broad net here. Match scoring does the nuanced work.
    """
    if not shortlist_category:
        return []
    mapping = {
        "jobs:nursing": ["nursing", "rn", "home-health", "private-duty"],
        "jobs:developer-education": ["developer-education", "developer-relations", "software-engineering"],
    }
    return mapping.get(shortlist_category, [shortlist_category])


def _start_run(
    agent_type: str,
    user_id: UUID | None = None,
    source_id: UUID | None = None,
    category: str | None = None,
) -> str:
    db = db_client()
    result = db.table("agent_runs").insert({
        "version": "v1",
        "agent_type": agent_type,
        "user_id": str(user_id) if user_id else None,
        "source_id": str(source_id) if source_id else None,
        "category": category,
    }).execute()
    return result.data[0]["id"]


def _finish_run(
    run_id: str,
    *,
    status: str,
    summary: dict | None = None,
    error: str | None = None,
) -> None:
    db = db_client()
    db.table("agent_runs").update({
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "summary": summary,
        "error": error,
    }).eq("id", run_id).execute()
