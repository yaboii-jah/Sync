-- Widen the linkedin_url check to match the client-side validation:
-- accept http/https, optional www./m. subdomain, sub-page paths,
-- and query strings / hash fragments. Stored values are canonicalized
-- by the app before write; the constraint is a backstop only.

alter table public.profiles drop constraint profiles_linkedin_url_check;

alter table public.profiles add constraint profiles_linkedin_url_check
  check (
    linkedin_url is null
    or linkedin_url ~* '^https?://(www\.|m\.)?linkedin\.com/in/[a-z0-9\-_%]+'
  );
