-- Networking cards are active whenever at least one approved destination exists.
-- `is_public` remains as derived state for the bearer-card reader, but attendees
-- no longer control it through a separate publication RPC.

alter table public.social_profiles
  drop constraint social_profiles_canonical_url_check;

alter table public.social_profiles
  add constraint social_profiles_canonical_url_check check (
    length(url) <= 256
    and url !~ '[[:space:]]'
    and case network
      when 'linkedin' then
        url ~ $$^https://www\.linkedin\.com/in/[a-z0-9_%\-]{1,100}/?$$
      when 'instagram' then
        url ~ $$^https://www\.instagram\.com/[a-z0-9._]{1,30}/$$
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
        (
          (
            url ~ $$^https://www\.facebook\.com/(profile\.php\?id=[0-9]{1,200}|[a-z0-9.]{1,50})/?$$
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
          )
          or url ~ $$^https://www\.facebook\.com/share/[A-Za-z0-9_-]{1,200}/?(\?.*)?$$
        )
      when 'github' then
        url ~ $$^https://github\.com/[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$$
        and url not in (
          'https://github.com/about',
          'https://github.com/apps',
          'https://github.com/collections',
          'https://github.com/contact',
          'https://github.com/enterprise',
          'https://github.com/events',
          'https://github.com/explore',
          'https://github.com/features',
          'https://github.com/login',
          'https://github.com/marketplace',
          'https://github.com/new',
          'https://github.com/notifications',
          'https://github.com/organizations',
          'https://github.com/orgs',
          'https://github.com/pricing',
          'https://github.com/search',
          'https://github.com/settings',
          'https://github.com/signup',
          'https://github.com/sponsors',
          'https://github.com/topics',
          'https://github.com/trending',
          'https://github.com/users'
        )
      else false
    end
  );

update public.networking_cards as cards
   set is_public = exists (
     select 1
       from public.social_profiles
      where social_profiles.user_id = cards.user_id
   )
 where cards.is_public is distinct from exists (
   select 1
     from public.social_profiles
    where social_profiles.user_id = cards.user_id
 );

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
      ('facebook', nullif(facebook_url, '')),
      ('github', nullif(github_url, ''))
    ) as values_to_save(network, url)
   where values_to_save.url is not null;

  update public.networking_cards
     set is_public = exists (
       select 1
         from public.social_profiles
        where social_profiles.user_id = caller_id
     )
   where user_id = caller_id;
end;
$$;

-- The three-field signature is retained for already-open older app sessions;
-- it delegates to the same derived activation behavior and preserves GitHub.
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
    coalesce(
      (
        select social_profiles.url
          from public.social_profiles
         where social_profiles.user_id = (select auth.uid())
           and social_profiles.network = 'github'
      ),
      ''
    )
  );
$$;

revoke all on function public.set_networking_card_public(boolean) from public, anon, authenticated;
drop function public.set_networking_card_public(boolean);
