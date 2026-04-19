-- shortlisty database schema
-- Shared across V1, V2, and V3. Only orchestration differs.
-- Pattern: domain-agnostic infrastructure (users, sources, agent_runs) + per-domain tables
-- (jobs/user_job_matches, volunteer_positions/user_volunteer_matches, etc.).
-- New domains add their own tables without touching shared infrastructure.

-- Users: people on whose behalf we're running searches.
-- Populated manually via scripts/seed_user.py for MVP; later via signup flow.
-- profile_summary and location are user-level (shared across all their categories).
-- Criteria and notification preferences live in user_categories (per-category).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,                  -- link to Supabase auth.users once they sign in
  name text not null,
  email text not null unique,
  profile_summary text,               -- free-text persona summary used in prompts
  location jsonb not null,            -- {city, state, country, lat, lng, radius_miles, remote_ok}
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_auth on users(auth_user_id);

-- User categories: what each user wants to shortlist, with per-category criteria.
-- A user can have multiple active categories (e.g. volunteer:graphic-design now,
-- jobs:graphic-design later). Criteria differ per category — "heck no" for paid
-- work is different from "heck no" for volunteer work.
create table if not exists user_categories (
  user_id uuid references users(id) on delete cascade,
  category text not null,             -- 'jobs:nursing', 'volunteer:graphic-design', etc.
  criteria jsonb not null,            -- {ideal: [], acceptable: [], heck_no: []}
  notification_schedule text not null default 'weekly',  -- 'weekly', 'daily', 'manual'
  notification_day text default 'sunday',
  notification_hour int default 18,
  active boolean not null default true,
  added_at timestamptz not null default now(),
  primary key (user_id, category)
);

create index if not exists idx_user_categories_user on user_categories(user_id) where active = true;

-- Sources: listing boards, aggregators, niche sites. Shared across users.
-- A source can serve multiple categories (e.g. Craigslist has jobs AND housing).
-- last_crawled_at = last attempt; last_successful_crawl_at = last clean crawl.
-- The distinction prevents a source outage from marking all its listings stale.
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  type text not null,                 -- 'api', 'rss', 'browse'
  categories text[] not null default '{}',  -- e.g. ['jobs:nursing', 'jobs:developer-education']
  search_url_pattern text,
  access_notes text,
  crawl_frequency_hours int not null default 24,
  last_crawled_at timestamptz,
  last_successful_crawl_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DOMAIN: jobs
-- ============================================================

-- Jobs: the shared pool of crawled job postings.
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
  application_deadline timestamptz,
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

create index if not exists idx_job_matches_pending on user_job_matches (user_id, notified_at) where notified_at is null;
create index if not exists idx_job_matches_user_scored on user_job_matches (user_id, scored_at desc);

-- Jobs already seen, to avoid re-scoring/re-sending.
create table if not exists user_seen_jobs (
  user_id uuid references users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  primary key (user_id, job_id)
);

-- ============================================================
-- DOMAIN: volunteer
-- ============================================================

-- Volunteer positions: crawled listings from boards like VolunteerMatch, Idealist, Catchafire.
-- Structurally parallel to jobs but with domain-appropriate columns.
-- event_date + is_ongoing distinguishes one-off events (bake sale Sat 10am) from
-- ongoing roles (monthly tutoring program). Reaper expires one-off events after event_date.
create table if not exists volunteer_positions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  external_id text,
  content_hash text not null unique,
  title text not null,
  organization text,
  location_text text,
  location_normalized jsonb,
  description text,
  url text not null,
  posted_at timestamptz,
  application_deadline timestamptz,
  category_tags text[] not null default '{}',
  cause_area text,                    -- 'environment', 'education', 'animals', 'health', etc.
  time_commitment jsonb,              -- {hours_per_week, total_duration}
  skills_sought text[] not null default '{}',
  remote text,                        -- 'yes' | 'no' | 'hybrid'
  event_date timestamptz,             -- for one-off events
  is_ongoing boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (source_id, external_id)
);

create index if not exists idx_volunteer_category_tags on volunteer_positions using gin (category_tags);
create index if not exists idx_volunteer_active on volunteer_positions (is_active, last_seen_at desc);

-- User-specific scoring of a volunteer position. Same shape as user_job_matches.
create table if not exists user_volunteer_matches (
  user_id uuid references users(id) on delete cascade,
  volunteer_id uuid references volunteer_positions(id) on delete cascade,
  score int not null,
  verdict text not null,              -- 'ideal' | 'worth_a_look' | 'skip'
  one_line_summary text,
  matched_criteria text[] not null default '{}',
  concerns text[] not null default '{}',
  raw_llm_response jsonb,
  scored_at timestamptz not null default now(),
  notified_at timestamptz,
  user_feedback text,
  feedback_note text,
  primary key (user_id, volunteer_id)
);

create index if not exists idx_volunteer_matches_pending on user_volunteer_matches (user_id, notified_at) where notified_at is null;

-- Volunteer positions already seen, to avoid re-scoring/re-sending.
create table if not exists user_seen_volunteer (
  user_id uuid references users(id) on delete cascade,
  volunteer_id uuid references volunteer_positions(id) on delete cascade,
  primary key (user_id, volunteer_id)
);

-- ============================================================
-- SHARED INFRASTRUCTURE
-- ============================================================

-- Per-user source preferences. Scoped to a category so discovery for jobs:nursing
-- doesn't mix sources with volunteer:graphic-design.
create table if not exists user_sources (
  user_id uuid references users(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  category text not null,             -- which category this source was discovered for
  search_terms text[] not null default '{}',
  confidence int,
  enabled boolean not null default true,
  added_at timestamptz not null default now(),
  primary key (user_id, source_id, category)
);

-- Run log for every agent execution.
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  version text not null,              -- 'v1' | 'v2' | 'v3'
  agent_type text not null,           -- 'discovery' | 'crawl' | 'match' | 'digest'
  user_id uuid references users(id),
  source_id uuid references sources(id),
  category text,                      -- which category this run was for
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',  -- 'running' | 'success' | 'failed' | 'timeout'
  summary jsonb,
  error text
);

create index if not exists idx_agent_runs_recent on agent_runs (started_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Locked down by default; service role bypasses for all agent operations.
alter table users enable row level security;
alter table user_categories enable row level security;
alter table user_sources enable row level security;
alter table user_job_matches enable row level security;
alter table user_seen_jobs enable row level security;
alter table user_volunteer_matches enable row level security;
alter table user_seen_volunteer enable row level security;

-- Users can read and update their own row.
create policy "users_self_read" on users for select
  using (auth_user_id = auth.uid());
create policy "users_self_update" on users for update
  using (auth_user_id = auth.uid());

create policy "user_categories_self" on user_categories for all
  using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "user_sources_self" on user_sources for all
  using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "user_job_matches_self_read" on user_job_matches for select
  using (user_id in (select id from users where auth_user_id = auth.uid()));
create policy "user_job_matches_self_update" on user_job_matches for update
  using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "user_volunteer_matches_self_read" on user_volunteer_matches for select
  using (user_id in (select id from users where auth_user_id = auth.uid()));
create policy "user_volunteer_matches_self_update" on user_volunteer_matches for update
  using (user_id in (select id from users where auth_user_id = auth.uid()));
