-- A remembered scan remains visible after a target leaves or loses all shared
-- links, but must not retain a clickable token for an unavailable card.
create or replace function public.get_my_event_networking_scans(target_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', case when m.user_id is null then 'Former attendee' else coalesce(p.name, m.display_name_snapshot) end,
    'photo_url', p.photo_url,
    'token', case when m.status = 'active' and m.user_id is not null
      and exists (
        select 1 from public.event_networking_card_links l
        join public.social_profiles s on s.user_id = m.user_id and s.network = l.network
        where l.event_id = m.event_id and l.membership_id = m.id
      ) then c.public_token else null end,
    'scanned_at', h.scanned_at) order by h.scanned_at desc), '[]'::jsonb)
  from public.event_networking_scan_history h
  join public.event_memberships m on m.event_id = h.event_id and m.id = h.scanned_membership_id
  left join public.profiles p on p.id = m.user_id
  left join public.event_networking_cards c on c.event_id = m.event_id and c.membership_id = m.id
  where h.event_id = target_event_id and h.scanner_membership_id = private.networking_membership(target_event_id);
$$;
revoke all on function public.get_my_event_networking_scans(uuid) from public, anon;
grant execute on function public.get_my_event_networking_scans(uuid) to authenticated;
