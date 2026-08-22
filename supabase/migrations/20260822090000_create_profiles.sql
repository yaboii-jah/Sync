-- Profiles: one row per authenticated attendee.
-- Created automatically by the on_auth_user_created trigger;
-- clients may select/update only their own row (architecture.md §7).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  photo_url text,
  linkedin_url text check (
    linkedin_url is null
    or linkedin_url ~* '^https://(www\.)?linkedin\.com/in/'
  ),
  pass_type text not null default 'regular' check (pass_type in ('pro', 'regular')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(
      new.raw_user_meta_data ->> 'picture',
      new.raw_user_meta_data ->> 'avatar_url'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
