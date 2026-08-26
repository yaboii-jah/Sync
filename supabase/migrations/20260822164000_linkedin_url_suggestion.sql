-- Auto-lookup support: LinkFinderAI email→LinkedIn-URL suggestions are
-- cached per profile so repeat onboarding visits never re-bill credits,
-- and the lookup runs at most once per attendee.

alter table public.profiles
  add column linkedin_url_suggestion text;

alter table public.profiles
  add column linkedin_url_lookup_at timestamptz;
