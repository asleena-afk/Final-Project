-- Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  status text not null default 'active' check (status in ('active','on_hold','done')),
  health text not null default 'green' check (health in ('green','amber','red')),
  health_note text check (health_note is null or char_length(health_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  meeting_date date,
  meeting_time text,
  location text,
  attendees text,
  transcript text not null default '' check (char_length(transcript) <= 200000),
  summary_rows jsonb,
  next_actions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  meeting_id uuid references meetings(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','pending_review','done')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  due_date date,
  assignee text,
  is_blocked boolean not null default false,
  blocker_reason text check (blocker_reason is null or char_length(blocker_reason) <= 300),
  ticket_ref text check (ticket_ref is null or char_length(ticket_ref) <= 40),
  module text check (module is null or char_length(module) <= 60),
  estimate_hrs numeric check (estimate_hrs is null or estimate_hrs >= 0),
  ticket_stage text check (ticket_stage in (
    'NEW / CLARIFICATION','FOR DEVELOPMENT','PENDING DEV ASSIGNMENT',
    'DEVELOPMENT IN PROGRESS','TEST FAILED','FOR CODE MERGE & DEPLOYMENT','FOR TESTING',
    'FOR UAT DEPLOYMENT','UAT FIXPACK','FOR PROD DEPLOYMENT','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_blocked or (blocker_reason is not null and char_length(blocker_reason) > 0))
);

create index if not exists tasks_project_idx on tasks(project_id, status);
create index if not exists tasks_owner_idx on tasks(owner_id);
create index if not exists meetings_project_idx on meetings(project_id);

-- RLS on with no browser policies: only the backend (service connection) touches the data,
-- and it checks owner_id on every query.
alter table projects enable row level security;
alter table tasks enable row level security;
alter table meetings enable row level security;

alter database postgres set timezone to 'Asia/Kuala_Lumpur';