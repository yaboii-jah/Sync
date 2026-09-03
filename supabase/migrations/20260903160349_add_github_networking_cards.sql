-- Extend the stable networking card with GitHub while retaining the deployed
-- three-argument save RPC during the frontend rollout.

alter table public.social_profiles
  drop constraint social_profiles_network_check;

alter table public.social_profiles
  add constraint social_profiles_network_check
  check (network in ('linkedin', 'instagram', 'facebook', 'github'));

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
      when 'github' then
        url ~ '^https://github\.com/[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$'
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

create function public.save_social_profiles(
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

  if not exists (
    select 1 from public.social_profiles where user_id = caller_id
  ) then
    update public.networking_cards
       set is_public = false
     where user_id = caller_id;
  end if;
end;
$$;

-- Keep the currently deployed client operational until the four-field frontend
-- reaches production. It cannot create or overwrite a GitHub row.
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

create or replace function public.get_own_networking_card()
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
     when 'github' then 4
   end;
$$;

create or replace function public.get_public_networking_card(card_token uuid)
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
     when 'github' then 4
   end;
$$;

revoke all on function public.save_social_profiles(
  text, text, text, text
) from public, anon;

grant execute on function public.save_social_profiles(
  text, text, text, text
) to authenticated;

revoke all on function public.save_social_profiles(
  text, text, text
) from public, anon;

grant execute on function public.save_social_profiles(
  text, text, text
) to authenticated;
