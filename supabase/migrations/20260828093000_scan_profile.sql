-- Scan cards: let one signed-in attendee read the three fields another
-- attendee's networking QR needs, and nothing else.
--
-- `profiles` is own-row read only (see 20260822090000_create_profiles.sql), so
-- before this a scanned QR could not render the card of the person who was
-- scanned. Widening the SELECT policy to all rows would have worked, but RLS is
-- row-level and column privileges are global, so it would also have exposed
-- `pass_type` — who bought a Pro pass — to every other attendee. A security
-- definer function is the only way to expose exactly three columns and stop.
--
-- The function is STABLE and takes the profile id straight from the scanned
-- URL. Ids are uuids, so they are not guessable by enumeration, and the three
-- fields returned are precisely what the attendee is already handing out by
-- showing their QR.
--
-- architecture.md Invariant 3 is untouched: this reads, it never writes, and no
-- attendee gains a write path to another attendee's row.

create or replace function public.get_scan_profile(profile_id uuid)
returns table (
  id uuid,
  name text,
  photo_url text,
  linkedin_url text
)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.name, p.photo_url, p.linkedin_url
  from public.profiles p
  where p.id = profile_id;
$$;

-- Signed-in attendees only. Anonymous visitors must not be able to walk the
-- table, even with a valid uuid.
revoke all on function public.get_scan_profile(uuid) from public;
revoke all on function public.get_scan_profile(uuid) from anon;
grant execute on function public.get_scan_profile(uuid) to authenticated;
