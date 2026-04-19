# V3: Hybrid + Temporal (placeholder)

**Not yet implemented.** V2 first.

## Plan

V3 will take the logic from V2 and refactor it onto Temporal. The LLM prompts
and DB writes stay identical; what changes is that orchestration moves from
hand-rolled Python into Temporal Workflows and Activities.

Expected components:

- `workflows.py`
  - `DiscoveryWorkflow(user_id)` — on-demand and monthly schedule
  - `CrawlSourceWorkflow(source_id)` — per-source schedule (weighted by demand)
  - `MatchWorkflow(user_id)` — weekly per user
  - `SendDigestWorkflow(user_id)` — triggered by MatchWorkflow completion
- `activities.py`
  - `llm_classify_job`, `llm_score_job`, `llm_discover_sources`
  - `fetch_url`, `browse_page` (Playwright)
  - `db_upsert_job`, `db_save_match`, `db_mark_seen`, `send_email`
- `worker.py` — Temporal worker process
- `schedules.py` — `temporal schedule create` declarations

## Setup

- Temporal Cloud free tier OR self-hosted via Docker Compose
- Python SDK: `temporalio`
- Worker runs as a long-lived process (not a cron)

## What this buys you

- Durable execution: partial runs resume exactly where they left off
- Declarative retries: each activity gets its own retry policy in one line
- Observability: Temporal Web UI shows every step's input/output
- Versioning: change workflow code mid-flight without breaking in-flight runs
- Scheduling: built-in, no separate cron system

The learning value here is in deleting code from V2 and seeing what remains.
