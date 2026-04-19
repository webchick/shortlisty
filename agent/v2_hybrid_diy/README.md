# V2: Hybrid DIY (placeholder)

**Not yet implemented.** V1 first.

## Plan

V2 will reimplement the three agents (discovery, crawl, match) as explicit Python
code rather than Claude agent loops. The LLM is still Claude, but for single-purpose
calls (score this job, classify this job, recommend sources) — not for the overall
control flow.

Expected components:

- `discovery.py` — uses Claude with web_search tool for research; you wrap the loop
- `crawler.py` — Playwright-driven browser automation per source; Crawl4AI for
  LLM-friendly page extraction; Claude for per-job enrichment
- `matcher.py` — straightforward loop: fetch candidates, call Claude to score each,
  save matches
- `retries.py` — tenacity-based retry policies per failure class
- `state.py` — manual checkpointing so partial runs can be resumed
- `run_weekly.py` — cron target, same interface as V1's version

The pain points that will motivate V3:

- Writing your own retry logic for every I/O call
- Writing your own checkpointing so crashes don't lose progress
- Debugging "what was the state when this failed" from logs
- Coordinating schedules across sources and users

## When to build V2

After V1 has run for your mom for a few weeks and the prompts are tuned.
By then you'll have real data about which parts are flaky and worth rewriting.
