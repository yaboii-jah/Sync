-- Close legacy and direct-write paths that could bypass explicit publication.

drop function public.get_scan_profile(uuid);

update public.profiles
   set linkedin_url = null,
       linkedin_url_suggestion = null
 where linkedin_url is not null
    or linkedin_url_suggestion is not null;

revoke insert on public.profiles from authenticated;
grant insert (id, name, photo_url) on public.profiles to authenticated;

create or replace function public.protect_managed_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.pass_type is distinct from old.pass_type
     and not (select private.is_admin()) then
    raise exception 'pass type is not attendee-editable';
  end if;

  if new.linkedin_url is distinct from old.linkedin_url
     or new.linkedin_url_suggestion is distinct from old.linkedin_url_suggestion then
    raise exception 'legacy social fields are retired';
  end if;

  return new;
end;
$$;

drop policy "Users can create own social profiles" on public.social_profiles;
drop policy "Users can update own social profiles" on public.social_profiles;
drop policy "Users can delete own social profiles" on public.social_profiles;
revoke insert, update, delete on public.social_profiles from authenticated;

alter table public.social_profiles
  drop constraint social_profiles_canonical_url_check;

alter table public.social_profiles
  add constraint social_profiles_canonical_url_check check (
    length(url) <= 256
    and case network
      when 'linkedin' then
        url ~ '^https://www\.linkedin\.com/in/[a-z0-9_%\-]{1,100}/?$'
      when 'instagram' then
        url ~ '^https://www\.instagram\.com/[a-z0-9._]{1,30}/$'
        and trim(trailing '/' from url) not in (
          'https://www.instagram.com/about',
          'https://www.instagram.com/accounts',
          'https://www.instagram.com/direct',
          'https://www.instagram.com/explore',
          'https://www.instagram.com/p',
          'https://www.instagram.com/reel',
          'https://www.instagram.com/reels',
          'https://www.instagram.com/stories'
        )
      when 'facebook' then
        url ~ '^https://www\.facebook\.com/(profile\.php\?id=[0-9]+|[a-z0-9.]{1,50})/?$'
        and trim(trailing '/' from url) not in (
          'https://www.facebook.com/about',
          'https://www.facebook.com/events',
          'https://www.facebook.com/groups',
          'https://www.facebook.com/help',
          'https://www.facebook.com/marketplace',
          'https://www.facebook.com/pages',
          'https://www.facebook.com/photo',
          'https://www.facebook.com/reel',
          'https://www.facebook.com/share',
          'https://www.facebook.com/stories',
          'https://www.facebook.com/watch'
        )
      else false
    end
  );

create function private.is_google_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()) is not null
    and (
      (select auth.jwt()) #>> '{app_metadata,provider}' = 'google'
      or ((select auth.jwt()) #> '{app_metadata,providers}') ? 'google'
    ),
    false
  );
$$;

revoke all on function private.is_google_user() from public, anon, authenticated;

create or replace function public.set_networking_card_public(published boolean)
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

  if not (select private.is_google_user()) then
    raise exception 'Google authentication required';
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

create or replace function public.save_social_profiles(
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

  if not (select private.is_google_user()) then
    raise exception 'Google authentication required';
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
