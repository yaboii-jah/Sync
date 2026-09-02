-- Restores the two guarantees `20260902120000_social_profiles.sql` removed when
-- it dropped and recreated `social_profiles`.
--
-- 1. The canonical URL shape. Without the check constraint, `url` accepts any
--    string, and both the owner's card and every scanner's card render it as an
--    `href`. The column is the only place this can be enforced for every
--    writer.
-- 2. Writes through `save_social_profiles` only. That function additionally
--    requires a Google identity, which a direct insert bypasses.
--
-- Existing rows were checked against the constraint before this was written:
-- all five are already canonical, so the constraint validates without a
-- rewrite.

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

drop policy "Users can insert own social profiles" on public.social_profiles;

drop policy "Users can update own social profiles" on public.social_profiles;

drop policy "Users can delete own social profiles" on public.social_profiles;

revoke insert, update, delete, truncate on public.social_profiles from anon, authenticated;
