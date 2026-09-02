-- Provider-specific profile fields are superseded by social_profiles. Remove
-- them so full profile reads cannot expose or repopulate retired destinations.

revoke insert (linkedin_url) on public.profiles from authenticated;
revoke insert (user_id, network, url) on public.social_profiles from authenticated;
revoke update (url) on public.social_profiles from authenticated;

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
  return new;
end;
$$;

alter table public.profiles
  drop column if exists linkedin_url,
  drop column if exists linkedin_url_suggestion,
  drop column if exists linkedin_url_lookup_at,
  drop column if exists instagram_url,
  drop column if exists instagram_photo_url,
  drop column if exists facebook_url,
  drop column if exists facebook_photo_url;

grant execute on function private.is_google_user() to authenticated;

drop policy "Users can update own profile" on public.profiles;
create policy "Google users can update own profile"
  on public.profiles for update to authenticated
  using (
    (select auth.uid()) = id
    and (select private.is_google_user())
  )
  with check (
    (select auth.uid()) = id
    and (select private.is_google_user())
  );

drop policy "Users can insert own profile" on public.profiles;
create policy "Google users can insert own profile"
  on public.profiles for insert to authenticated
  with check (
    (select auth.uid()) = id
    and (select private.is_google_user())
  );

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
        url ~ '^https://www\.facebook\.com/(profile\.php\?id=[0-9]{1,200}|[a-z0-9.]{1,50})/?$'
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
