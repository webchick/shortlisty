# Setup

Complete walkthrough from zero to "mom gets her first digest email."

All commands run from the project root unless otherwise noted.

## Prerequisites

- Python 3.12+
- Node.js 20+
- A Supabase account (free tier)
- An Claude Platfom API key
- A Resend account (free tier) + a domain you can send from

## 0. Get your config files ready

Before you collect any keys, set up the files you'll paste them into:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # if you don't have uv
uv sync --project agent
cp agent/.env.example agent/.env

npm install --prefix web
cp web/.env.local.example web/.env.local
```

Now open `agent/.env` and `web/.env.local` side by side — the steps below will tell you what to fill in.

## 1. Supabase

1. Create a new project at https://supabase.com
2. Once ready, grab these from the 'Copy' button on the Project Overview:
   - Project URL (looks like `https://xxx.supabase.co`)
   - Publishable key (for the Next.js frontend)
   - Direct DB connection string (looks like `postgresql://...`)
3. Grab this from Settings > API keys:
   - Secret key (for the Python backend)
4. Apply the schema. You have two options:

   **Option A — Supabase SQL editor (no psql needed):**
   Open your project in the Supabase dashboard → SQL Editor, paste the contents of `agent/shared/schema.sql`, and run it.

   **Option B — psql from the terminal:**
   ```bash
   # macOS: install psql if you don't have it
   brew install postgresql@15
   brew link postgresql@15
   # load your .env so SUPABASE_DB_URL is available:
   source agent/.env
   psql "$SUPABASE_DB_URL" < agent/shared/schema.sql
   ```
5. Verify your Supabase variables are working:
   ```bash
   uv run --directory agent python -c "from shared.lib.db import get_client; get_client().table('users').select('id').limit(1).execute(); print('Supabase OK')"
   ```
   You should see `Supabase OK`. Any error means a wrong URL or key.
6. In Authentication → Sign In / Providers, make sure Email is enabled, and set "Confirm email" OFF for the MVP (we're using magic links, not passwords).

## 2. Resend

1. Create an account at https://resend.com
2. Grab your API key from the dashboard
3. Set up a sender — you have two options:

   **Option A — Resend's test domain (no DNS setup):**
   Use `onboarding@resend.dev` as your `DIGEST_FROM_EMAIL`. Works immediately, but can only send to the email address you signed up to Resend with. Good enough to verify the pipeline end-to-end.

   Verify it's working (replace `you@example.com` with your Resend account email):
   ```bash
   uv run --directory agent python -c "import resend; from shared.lib.settings import settings; resend.api_key = settings.resend_api_key; r = resend.Emails.send({'from': settings.digest_from_email, 'to': ['you@example.com'], 'subject': 'Test', 'text': 'It works!'}); print('Resend OK:', r['id'])"
   ```

   **Option B — your own domain:**
   Add and verify a domain in Resend's dashboard (requires adding DKIM DNS records). Lets you send to anyone. Come back to this when you're ready.

## 3. Claude Platform

1. Get an API key from https://platform.claude.com
2. Make sure your account has credit — [name] > Organization settings > Billing
3. Paste your API key into `agent/.env`, then verify it's working:
   ```bash
   uv run --directory agent python -c "from shared.lib.claude import get_client; print(get_client().messages.create(model='claude-haiku-4-5-20251001', max_tokens=16, messages=[{'role': 'user', 'content': 'say ok'}]).content[0].text)"
   ```

## 4. Agent setup

By now your `agent/.env` should be filled in (from step 0). You're ready to run the agent.

## 5. Create the first user (mom)

Edit `agent/scripts/seed_user.py` with her real info, then:

```bash
uv run --directory agent python scripts/seed_user.py
```

This inserts her into the `users` table. No password; she'll sign in via magic link.

## 6. Discovery agent — first run

```bash
uv run --directory agent python -m v1_claude_native.discover --user mom@example.com
```

This figures out where to search for her and populates `user_sources`. Takes a minute or two.

## 7. First match run

```bash
uv run --directory agent python -m v1_claude_native.run_once --user mom@example.com
```

This runs crawl + match end-to-end. Takes 5-15 minutes on a first run (backfill).
Check the output; matches should appear in the `user_job_matches` table.

## 8. Frontend setup

By now your `web/.env.local` should be filled in (from step 0). Start the dev server:

```bash
npm run dev --prefix web
```

Visit http://localhost:3000. Log in as mom with her email; she'll get a magic link via Supabase.

## 9. Send the first digest email

```bash
uv run --directory agent python -m v1_claude_native.send_digest --user mom@example.com
```

She should receive the email within a minute. Check the spam folder.

## 10. Schedule everything

See `docs/SCHEDULING.md` for the cron configs for each agent version.

## Troubleshooting

- **"Permission denied" when writing to Supabase from Python** — make sure you're using the Secret key, not the Publishable key
- **Magic link emails not arriving** — check Supabase Auth logs; most likely the Email provider isn't configured
- **Claude rate limits on first run** — the discovery agent does a lot of searches; rerun with `--user` filter or upgrade your Claude tier
