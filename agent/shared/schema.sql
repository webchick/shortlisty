-- job-agent database schema
-- This schema is shared across V1, V2, and V3. Only orchestration differs.

-- Users: people on whose behalf we're running searches.
-- Populated manually via scripts/seed_user.py for MVP; later via signup flow.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,                  -- link to Supabase auth.users once they sign in
  name text not null,
  email text not null unique,
  profession_category text,           -- 'nursing', 'developer-education', etc.
  profile_summary text,               -- free-text persona summary used in prompts
  location jsonb not null,            -- {city, state, country, lat, lng, radius_miles, remote_ok}
  criteria jsonb not null,            -- {ideal: [], acceptable: [], heck_no: []}
  notification_schedule text not null default 'weekly',  -- 'weekly', 'daily', 'manual'
  notification_day text default 'sunday',
  notification_hour int default 18,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_auth on users(auth_user_id);

-- Sources: job boards, aggregators, niche sites. Shared across users.
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  type text not null,                 -- 'api', 'rss', 'browse'
  search_url_pattern text,
  access_notes text,
  crawl_frequency_hours int not null default 24,
  last_crawled_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Per-user source preferences.
create table if not exists user_sources (
  user_id uuid references users(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  search_terms text[] not null default '{}',
  confidence int,
  enabled boolean not null default true,
  added_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

-- Jobs: the shared pool of crawled postings.
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  external_id text,
  content_hash text not null unique,
  title text not null,
  company text,
  location_text text,
  location_normalized jsonb,
  description text,
  url text not null,
  posted_at timestamptz,
  category_tags text[] not null default '{}',
  shift_pattern text,
  employment_type text,
  remote text,                        -- 'yes' | 'no' | 'hybrid'
  seniority text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (source_id, external_id)
);

create index if not exists idx_jobs_category_tags on jobs using gin (category_tags);
create index if not exists idx_jobs_posted_at on jobs (posted_at desc);
create index if not exists idx_jobs_active on jobs (is_active, last_seen_at desc);

-- User-specific scoring of a job.
create table if not exists user_job_matches (
  user_id uuid references users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  score int not null,
  verdict text not null,              -- 'ideal' | 'worth_a_look' | 'skip'
  one_line_summary text,
  matched_criteria text[] not null default '{}',
  concerns text[] not null default '{}',
  raw_llm_response jsonb,
  scored_at timestamptz not null default now(),
  notified_at timestamptz,
  user_feedback text,                 -- 'good_match' | 'bad_match' | 'applied' | null
  feedback_note text,
  primary key (user_id, job_id)
);

create index if not exists idx_matches_pending on user_job_matches (user_id, notified_at) where notified_at is null;
create index if not exists idx_matches_user_scored on user_job_matches (user_id, scored_at desc);

-- Jobs already seen, to avoid re-scoring/re-sending.
create table if not exists user_seen_jobs (
  user_id uuid references users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  primary key (user_id, job_id)
);

-- Run log for every agent execution.
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  version text not null,              -- 'v1' | 'v2' | 'v3'
  agent_type text not null,           -- 'discovery' | 'crawl' | 'match' | 'digest'
  user_id uuid references users(id),
  source_id uuid references sources(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',  -- 'running' | 'success' | 'failed' | 'timeout'
  summary jsonb,
  error text
);

create index if not exists idx_agent_runs_recent on agent_runs (started_at desc);

-- Row Level Security: locked down by default; service role bypasses.
alter table users enable row level security;
alter table user_sources enable row level security;
alter table user_job_matches enable row level security;
alter table user_seen_jobs enable row level security;

-- Users can read and update their own row (matched on auth_user_id).
create policy "users_self_read" on users for select
  using (auth_user_id = auth.uid());
create policy "users_self_update" on users for update
  using (auth_user_id = auth.uid());

create policy "user_sources_self" on user_sources for all
  using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "user_matches_self_read" on user_job_matches for select
  using (user_id in (select id from users where auth_user_id = auth.uid()));
create policy "user_matches_self_update" on user_job_matches for update
  using (user_id in (select id from users where auth_user_id = auth.uid()));
