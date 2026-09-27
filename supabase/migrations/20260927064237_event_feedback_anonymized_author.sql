-- Keep historical feedback but stop exposing stale membership name snapshots
-- after the account identity is removed.
create or replace function public.list_event_feedback(target_event_id uuid, result_limit integer default 100)
returns table (id uuid, category text, message text, attendee_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.event_memberships m join public.events e on e.id = m.event_id
    where m.event_id = target_event_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin') and m.status = 'active' and e.suspended_at is null
  ) then raise exception 'event manager required'; end if;
  return query select f.id, f.category, f.message,
    case when m.user_id is null then 'Former attendee'::text
      else coalesce(nullif(btrim(p.name), ''), nullif(btrim(m.display_name_snapshot), ''), 'Unnamed attendee') end, f.created_at
    from public.event_feedback f
    join public.event_memberships m on m.event_id = f.event_id and m.id = f.membership_id
    left join public.profiles p on p.id = m.user_id
    where f.event_id = target_event_id
    order by f.created_at desc, f.id desc
    limit least(greatest(coalesce(result_limit, 100), 1), 100);
end $$;
