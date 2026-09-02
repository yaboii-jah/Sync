-- Social profiles: one row per user per network for LinkedIn, Instagram, Facebook.
-- Used by the Connect page to persist social profile URLs.

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