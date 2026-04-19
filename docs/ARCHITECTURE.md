# Architecture

## The shared data model

```
users ──< user_sources >── sources
  │                          │
  │                          │  crawl agent populates
  │                          ▼
  │                        jobs (shared pool, crawled once, matched many)
  │                          │
  │                          │  match agent scores
  │                          ▼
  └─────────< user_job_matches
  │                          │
  │                          │  digest sender reads
  │                          ▼
  └─────── weekly email ─────┘
```

### Why share the job pool?

Two nurses searching don't need two separate crawls of nursa.com. We crawl each
source once (respectful to the site, cheap for us) into a shared `jobs` table,
then score per user against their personal criteria. At scale this is the
difference between O(users × sources) and O(sources) + O(users × jobs).

### Why enrich jobs at crawl time?

The crawl agent tags each job with objective attributes (profession category,
shift pattern, employment type, remote status). These don't vary by user, so
it's wasteful to have every match run re-determine them. Pre-filtering candidates
by tags means the match agent only scores 20-100 plausibly-relevant jobs per
user, not thousands.

## The three agents

### 1. Discovery agent
- **When:** Once per user at onboarding, then monthly
- **What:** Figures out which sources to crawl for this user
- **Why separate:** Source lists don't change often; no point re-discovering weekly
- **LLM usage:** Heavy — web searches, page fetches, reasoning about relevance

### 2. Crawl agent
- **When:** Per source, on a schedule tuned to source volume (hourly to daily)
- **What:** Fetches new postings, normalizes them, enriches with objective tags
- **Why separate:** Decouples data collection from per-user matching
- **LLM usage:** Light per job (enrichment is a small classification call)

### 3. Match agent
- **When:** Per user, on their schedule (weekly default)
- **What:** Reads fresh jobs matching their categories, scores against criteria,
  saves matches above threshold
- **Why separate:** Scoring is the expensive per-user cost; isolate it
- **LLM usage:** Medium per job (careful scoring against nuanced criteria)

## V1 vs V2 vs V3

All three versions implement the three agents above. The implementation differs:

### V1: Claude-native
- Each agent is a single `Messages.create` call with tool use
- Claude decides when to use which tool, loops automatically
- Retries, state, browsing: all handled by Claude's harness
- Our code is ~500 lines of glue: build the prompt, inject tools, save results

### V2: Hybrid DIY
- Each agent is explicit Python code: a loop over sources, try/except per job,
  manual state tracking, explicit retry logic with tenacity
- Playwright for browser automation (replaces computer use)
- Crawl4AI for LLM-friendly page extraction
- Every "failure to resume from where we left off" requires manual DB checkpointing

### V3: Hybrid + Temporal
- Each agent is a Temporal Workflow; each side-effect is an Activity
- Retries, timeouts, scheduling, observability: all from Temporal
- "Workflow died mid-crawl" → resumes at the activity that was running
- You can edit workflow code mid-flight without breaking old runs

## Why not build just one version?

Pedagogical. Building the same system three ways shows the cost of each piece
of orchestration infrastructure concretely. After V2 you'll hate writing retry
logic by hand; V3 will feel like magic. That contrast is the learning.

## Data flow during a single weekly run (V1 example)

```
Sunday 6pm: cron fires `v1/run_weekly.py`
  for each active user:
    1. Read user + their enabled sources from Supabase
    2. Call discovery agent if their source list is older than 30 days
    3. For each source not crawled in the last 24h:
         - Queue a crawl agent run (shared — don't re-crawl per user)
         - Crawl agent normalizes + enriches + inserts into jobs
    4. Run match agent for this user:
         - Pre-filter: jobs with matching category_tags, within location,
           not in user_seen_jobs, posted in last 14 days
         - For each candidate (capped at ~50): score via Claude
         - Save matches with score ≥ 60 into user_job_matches
    5. If user's digest day is today: render + send email
```

## Observability

Every agent run writes to the `agent_runs` table: start time, status, summary,
errors. The admin UI (`/admin/runs`) reads this for a quick health check.

In V3, Temporal Web UI supersedes most of this — you get per-step visibility
automatically.
