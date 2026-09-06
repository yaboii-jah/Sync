alter table public.social_profiles
  add column if not exists templates integer not null default 1;

do $$
begin
  alter table public.social_profiles
    add constraint social_profiles_templates_check check (templates in (1, 2, 3, 4));
exception when duplicate_object then null;
end $$;

update public.social_profiles set templates = 1 where templates not in (1,2,3,4);

create or replace function public.set_networking_card_template(p_template integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then raise exception 'authentication required'; end if;
  if not (select private.is_google_user()) then raise exception 'Google authentication required'; end if;
  if p_template not in (1,2,3,4) then raise exception 'invalid template'; end if;

  if not exists (select 1 from public.social_profiles where user_id = caller_id) then
    raise exception 'no social profiles to template';
  end if;

  update public.social_profiles set templates = p_template where user_id = caller_id;
end;
$$;

revoke all on function public.set_networking_card_template(integer) from public, anon;
grant execute on function public.set_networking_card_template(integer) to authenticated;

create or replace function public.save_social_profiles(
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  github_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  v_template integer := coalesce((select templates from public.social_profiles where user_id = caller_id limit 1), 1);
begin
  if caller_id is null then raise exception 'authentication required'; end if;
  if not (select private.is_google_user()) then raise exception 'Google authentication required'; end if;

  delete from public.social_profiles where user_id = caller_id;

  insert into public.social_profiles (user_id, network, url, templates)
  select caller_id, values_to_save.network, values_to_save.url, v_template
    from (values
      ('linkedin', nullif(linkedin_url, '')),
      ('instagram', nullif(instagram_url, '')),
      ('facebook', nullif(facebook_url, '')),
      ('github', nullif(github_url, ''))
    ) as values_to_save(network, url)
   where values_to_save.url is not null;

  if not exists (select 1 from public.social_profiles where user_id = caller_id) then
    update public.networking_cards set is_public = false where user_id = caller_id;
  else
    update public.networking_cards set is_public = true where user_id = caller_id;
  end if;
end;
$$;

create or replace function public.save_social_profiles(
  linkedin_url text,
  instagram_url text,
  facebook_url text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select public.save_social_profiles(
    linkedin_url,
    instagram_url,
    facebook_url,
    coalesce((select social_profiles.url from public.social_profiles where social_profiles.user_id = (select auth.uid()) and social_profiles.network = 'github'), '')
  );
$$;

drop function if exists public.get_own_networking_card();
drop function if exists public.get_public_networking_card(uuid);

create function public.get_own_networking_card()
returns table (public_token uuid, is_public boolean, network text, url text, templates integer)
language sql stable security invoker set search_path = ''
as $$
  select networking_cards.public_token, networking_cards.is_public, social_profiles.network, social_profiles.url, social_profiles.templates
    from public.networking_cards
    left join public.social_profiles on social_profiles.user_id = networking_cards.user_id
   where networking_cards.user_id = (select auth.uid())
   order by case social_profiles.network when 'linkedin' then 1 when 'instagram' then 2 when 'facebook' then 3 when 'github' then 4 end;
$$;

create function public.get_public_networking_card(card_token uuid)
returns table (name text, photo_url text, network text, url text, templates integer)
language sql stable security definer set search_path = ''
as $$
  select profiles.name, profiles.photo_url, social_profiles.network, social_profiles.url, social_profiles.templates
    from public.networking_cards
    join public.profiles on profiles.id = networking_cards.user_id
    join public.social_profiles on social_profiles.user_id = networking_cards.user_id
   where networking_cards.public_token = card_token and networking_cards.is_public
   order by case social_profiles.network when 'linkedin' then 1 when 'instagram' then 2 when 'facebook' then 3 when 'github' then 4 end;
$$;

revoke all on function public.save_social_profiles(text, text, text, text) from public, anon;
grant execute on function public.save_social_profiles(text, text, text, text) to authenticated;
revoke all on function public.save_social_profiles(text, text, text) from public, anon;
grant execute on function public.save_social_profiles(text, text, text) to authenticated;
