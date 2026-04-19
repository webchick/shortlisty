# job-agent

A personal job-search agent for people I care about. Same problem, built three ways.

## What it does

An AI agent that:
- Learns a person's profile, criteria, and "heck no" list
- Discovers the right job sources for their profession
- Crawls those sources on a schedule (shared across users to stay polite and cheap)
- Scores new postings against each user's personal criteria
- Sends a weekly digest email and lets them give feedback via a simple web UI

## Monorepo layout

```
job-agent/
├── agent/                   # Python: the AI pipeline (three parallel versions)
│   ├── shared/              # used by all three versions
│   │   ├── lib/             # pure-function utilities
│   │   ├── prompts/         # LLM prompt templates (Jinja2)
│   │   ├── email_templates/ # digest email templates
│   │   └── schema.sql       # Supabase schema
│   ├── v1_claude_native/    # managed agent loop via Claude SDK
│   ├── v2_hybrid_diy/       # hand-rolled orchestration + Playwright
│   ├── v3_hybrid_temporal/  # Temporal workflows
│   └── scripts/             # seeding, manual triggers
│
├── web/                     # Next.js: user-facing UI + /admin for you
│   ├── app/(user)/          # dashboard, settings, onboarding
│   ├── app/admin/           # your admin-only routes
│   ├── components/          # shadcn/ui components
│   └── lib/supabase/        # client helpers
│
└── docs/                    # setup guide, architecture notes
```

## The three agent versions

| | V1: Claude-native | V2: Hybrid DIY | V3: Hybrid + Temporal |
|---|---|---|---|
| LLM | Claude | Claude | Claude |
| Orchestration | Claude agent loop via SDK | Hand-rolled Python | Temporal |
| Browser | Claude computer use | Playwright | Playwright |
| Scheduling | Plain cron | Plain cron | Temporal schedules |
| State/retry | Handled by Claude | Hand-rolled | Temporal |
| Complexity | Thin | Thickest | Clean again |

All three share the same database, same prompts, same email templates, same web UI.
Only the *orchestration layer* differs.

## Getting started

See [docs/SETUP.md](docs/SETUP.md) for the full walkthrough. Short version:

```bash
# 1. Install tooling
curl -LsSf https://astral.sh/uv/install.sh | sh       # Python package manager
# (also: Node.js 20+)

# 2. Set up Supabase project, apply schema
psql $SUPABASE_DB_URL < agent/shared/schema.sql

# 3. Agent side
cd agent
uv sync
cp .env.example .env                                   # fill in secrets
uv run python scripts/seed_user.py                     # add mom as the first user
uv run python -m v1_claude_native.run_once             # first manual run

# 4. Web side
cd ../web
npm install
cp .env.local.example .env.local                       # fill in Supabase keys
npm run dev
```

## Why three versions?

To actually understand modern agent orchestration rather than just read about it.
Building the same thing three ways makes the tradeoffs concrete:

- **V1** shows the ceiling of managed agent platforms
- **V2** shows why you eventually need a workflow engine (by not having one)
- **V3** shows what a good workflow engine actually gives you

## License

MIT.
