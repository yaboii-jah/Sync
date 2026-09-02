-- Google-authenticated attendees manage optional social links behind one stable,
-- explicitly published bearer card. Anonymous readers never receive table access.

create table public.networking_cards (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_profiles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  network text not null check (network in ('linkedin', 'instagram', 'facebook')),
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, network),
  constraint social_profiles_canonical_url_check check (
    case network
      when 'linkedin' then
        url ~ '^https://www\.linkedin\.com/in/[a-z0-9_%\-]+/?$'
      when 'instagram' then
        url ~ '^https://www\.instagram\.com/[a-z0-9._]+/$'
      when 'facebook' then
        url ~ '^https://www\.facebook\.com/(profile\.php\?id=[0-9]+|[a-z0-9.]+)/?$'
      else false
    end
  )
);

alter table public.networking_cards enable row level security;

alter table public.social_profiles enable row level security;

create policy "Users can view own networking card"
  on public.networking_cards for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own social profiles"
  on public.social_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own social profiles"
  on public.social_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own social profiles"
  on public.social_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own social profiles"
  on public.social_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger networking_cards_set_updated_at
  before update on public.networking_cards
  for each row execute function public.set_updated_at();

create trigger social_profiles_set_updated_at
  before update on public.social_profiles
  for each row execute function public.set_updated_at();

create or replace function private.create_networking_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.networking_cards (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_networking_card() from public;

revoke all on function private.create_networking_card() from anon, authenticated;

create trigger profiles_create_networking_card
  after insert on public.profiles
  for each row execute function private.create_networking_card();

insert into public.networking_cards (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Preserve any useful existing LinkedIn destination before removing the
-- provider-specific columns from the attendee profile model.
insert into public.social_profiles (user_id, network, url)
select id,
       'linkedin',
       'https://www.linkedin.com/in/' ||
         substring(lower(linkedin_url) from 'linkedin\.com/in/([a-z0-9_%\-]+)')
  from public.profiles
 where linkedin_url is not null
on conflict (user_id, network) do update
  set url = excluded.url;

drop function public.admin_search_attendees(text, integer, integer);

create function public.admin_search_attendees(
  search_query text default '',
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  id uuid,
  name text,
  photo_url text,
  created_at timestamptz,
  push_device_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  return query
  select profiles.id,
         profiles.name,
         profiles.photo_url,
         profiles.created_at,
         count(subscriptions.id)
    from public.profiles as profiles
    left join public.push_subscriptions as subscriptions
      on subscriptions.user_id = profiles.id
   where trim(coalesce(search_query, '')) = ''
      or profiles.name ilike '%' || trim(search_query) || '%'
   group by profiles.id
   order by profiles.name, profiles.id
   limit least(greatest(result_limit, 1), 100)
  offset greatest(result_offset, 0);
end;
$$;

revoke all on function public.admin_search_attendees(
  text, integer, integer
) from public, anon;

grant execute on function public.admin_search_attendees(
  text, integer, integer
) to authenticated;

create function public.set_networking_card_public(published boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;

  if published and not exists (
    select 1
      from public.social_profiles
     where user_id = caller_id
  ) then
    raise exception 'add at least one social profile before publishing';
  end if;

  update public.networking_cards
     set is_public = published
   where user_id = caller_id;

  if not found then
    raise exception 'networking card not found';
  end if;

  return published;
end;
$$;

create function public.get_own_networking_card()
returns table (
  public_token uuid,
  is_public boolean,
  network text,
  url text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select networking_cards.public_token,
         networking_cards.is_public,
         social_profiles.network,
         social_profiles.url
    from public.networking_cards
    left join public.social_profiles
      on social_profiles.user_id = networking_cards.user_id
   where networking_cards.user_id = (select auth.uid())
   order by case social_profiles.network
     when 'linkedin' then 1
     when 'instagram' then 2
     when 'facebook' then 3
   end;
$$;

create function public.save_social_profiles(
  linkedin_url text,
  instagram_url text,
  facebook_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;

  delete from public.social_profiles
   where user_id = caller_id;

  insert into public.social_profiles (user_id, network, url)
  select caller_id, values_to_save.network, values_to_save.url
    from (values
      ('linkedin', nullif(linkedin_url, '')),
      ('instagram', nullif(instagram_url, '')),
      ('facebook', nullif(facebook_url, ''))
    ) as values_to_save(network, url)
   where values_to_save.url is not null;

  if not exists (
    select 1 from public.social_profiles where user_id = caller_id
  ) then
    update public.networking_cards
       set is_public = false
     where user_id = caller_id;
  end if;
end;
$$;

create function public.get_public_networking_card(card_token uuid)
returns table (
  name text,
  photo_url text,
  network text,
  url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.name,
         profiles.photo_url,
         social_profiles.network,
         social_profiles.url
    from public.networking_cards
    join public.profiles
      on profiles.id = networking_cards.user_id
    join public.social_profiles
      on social_profiles.user_id = networking_cards.user_id
   where networking_cards.public_token = card_token
     and networking_cards.is_public
   order by case social_profiles.network
     when 'linkedin' then 1
     when 'instagram' then 2
     when 'facebook' then 3
   end;
$$;

revoke all on table public.networking_cards from anon, authenticated;

revoke all on table public.social_profiles from anon, authenticated;

grant select on table public.networking_cards to authenticated;

grant select, delete on table public.social_profiles to authenticated;

grant insert (user_id, network, url) on table public.social_profiles to authenticated;

grant update (url) on table public.social_profiles to authenticated;

revoke all on function public.set_networking_card_public(boolean) from public, anon;

grant execute on function public.set_networking_card_public(boolean) to authenticated;

revoke all on function public.get_own_networking_card() from public, anon;

grant execute on function public.get_own_networking_card() to authenticated;

revoke all on function public.save_social_profiles(text, text, text) from public, anon;

grant execute on function public.save_social_profiles(text, text, text) to authenticated;

revoke all on function public.get_public_networking_card(uuid) from public;

grant execute on function public.get_public_networking_card(uuid) to anon, authenticated;
