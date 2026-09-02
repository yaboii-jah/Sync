-- Social profiles: one row per user per network for LinkedIn, Instagram, Facebook.
-- Used by the Connect page to persist social profile URLs.
--
-- HISTORY: this ran against the project outside the migration runner, so
-- `supabase_migrations.schema_migrations` has no row for it and `supabase db
-- push` would try to run it again on a table that already exists. It replaced
-- the table created by `20260901152106`, which dropped that table's rows along
-- with its canonical-URL check constraint, and restored the direct write path
-- that `20260901160915` and `20260901162556` had closed. See
-- `20260902130000_restore_social_profile_write_gate.sql`, which puts both back.

create table public.social_profiles (
  user_id uuid references public.profiles (id) on delete cascade,
  network text not null check (network in ('linkedin', 'instagram', 'facebook')),
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, network)
);

-- Enable RLS
alter table public.social_profiles enable row level security;

-- Users can view own social profiles
create policy "Users can view own social profiles"
  on public.social_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users can insert own social profiles
create policy "Users can insert own social profiles"
  on public.social_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Users can update own social profiles
create policy "Users can update own social profiles"
  on public.social_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Users can delete own social profiles
create policy "Users can delete own social profiles"
  on public.social_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Trigger to update updated_at on social_profiles
create trigger social_profiles_set_updated_at
  before update on public.social_profiles
  for each row
  execute function public.set_updated_at();