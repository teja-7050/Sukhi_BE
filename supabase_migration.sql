-- ============================================================
-- Sukhi – Supabase schema migration
-- Run this in the Supabase SQL editor (dashboard.supabase.com)
-- ============================================================

-- ─── USERS ───────────────────────────────────────────────────
create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── SESSIONS ────────────────────────────────────────────────
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);

-- ─── OTPS ────────────────────────────────────────────────────
create table if not exists public.otps (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  otp        integer not null,
  timestamp  timestamptz not null default now()
);

create index if not exists otps_user_id_idx on public.otps(user_id);

-- ─── CHAT SESSIONS ───────────────────────────────────────────
create table if not exists public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null default 'New Conversation',
  start_mood text,
  end_mood   text,
  rating     integer check (rating >= 1 and rating <= 5),
  feedback   text,
  ended      boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);

-- ─── CHAT MESSAGES ───────────────────────────────────────────
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on public.chat_messages(session_id);

-- ─── Row Level Security (RLS) ─────────────────────────────────
-- Disable RLS for backend access via service key (the anon key
-- used here is sufficient if you only access via your server).
-- Alternatively, enable RLS and add policies tied to JWT sub.
alter table public.users       disable row level security;
alter table public.sessions    disable row level security;
alter table public.otps        disable row level security;
alter table public.chat_sessions disable row level security;
alter table public.chat_messages disable row level security;
