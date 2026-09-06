-- The previous rollout used dollar-quoted regexes whose closing delimiter
-- consumed the intended end anchors. Recreate the check with ordinary SQL
-- strings so every accepted URL must match its complete shape.

alter table public.social_profiles
  drop constraint social_profiles_canonical_url_check;

alter table public.social_profiles
  add constraint social_profiles_canonical_url_check check (
    length(url) <= 256
    and url !~ '[[:space:]]'
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
        (
          (
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
          )
          or url ~ '^https://www\.facebook\.com/share/[A-Za-z0-9_-]{1,200}/?(\?.*)?$'
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
