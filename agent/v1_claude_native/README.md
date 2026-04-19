# V1: Claude-native

**Philosophy:** Let Claude do as much as possible. Our code is thin glue.

This version uses Claude's tool-use loop with server-side web search as the
agent runtime. Claude plans its own search, evaluates its own results, and
reports back structured output. We provide:

- The prompts
- A small set of tools (save_source, save_job, save_match, mark_seen)
- A thin loop that dispatches tool calls to DB writes

## Files

- `agents.py` — the three agent loops (discovery, crawl, match)
- `tools.py` — tool schemas + their Python handlers
- `digest.py` — sends the weekly email
- `run_once.py` — CLI: run end-to-end for one user
- `run_weekly.py` — CLI: run for all active users (cron target)
- `discover.py` — CLI: run just the discovery agent
- `send_digest.py` — CLI: send the digest email

## Running

```bash
# One-off end-to-end run for mom
uv run python -m v1_claude_native.run_once --user mom@example.com

# Just discover sources (first-time setup)
uv run python -m v1_claude_native.discover --user mom@example.com

# Send the digest for one user
uv run python -m v1_claude_native.send_digest --user mom@example.com

# Weekly cron job for all users
uv run python -m v1_claude_native.run_weekly
```

## What V1 doesn't do

- Doesn't retry failed LLM calls (Claude SDK handles transport-level retries;
  logic-level retries are up to you)
- Doesn't persist state mid-run (if a run dies halfway, next run starts fresh)
- Doesn't handle rate limits gracefully — if Anthropic rate-limits, the run fails
- Doesn't coordinate crawls across users (minor issue at N=2, big issue at N=200)

These pain points motivate V2 and V3.
