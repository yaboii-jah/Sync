-- Private same-event identity check for duplicate raffle labels. The exported
-- text remains names-only; email is fetched only when a manager opens a row.
create function public.get_event_raffle_attendee_detail(target_event_id uuid, target_membership_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.event_memberships manager join public.events e on e.id = manager.event_id
    where manager.event_id = target_event_id and manager.user_id = (select auth.uid())
      and manager.role in ('owner', 'admin') and manager.status = 'active'
      and e.suspended_at is null and e.lifecycle in ('published', 'archived')
  ) then raise exception 'published event manager required'; end if;
  select jsonb_build_object('name', btrim(regexp_replace(p.name, '[[:space:]]+', ' ', 'g')),
    'email', m.email_snapshot) into result
    from public.event_memberships m join public.profiles p on p.id = m.user_id
    where m.event_id = target_event_id and m.id = target_membership_id
      and m.role = 'attendee' and m.status = 'active'
      and btrim(regexp_replace(p.name, '[[:space:]]+', ' ', 'g')) <> '';
  return result;
end $$;
revoke all on function public.get_event_raffle_attendee_detail(uuid, uuid) from public, anon;
grant execute on function public.get_event_raffle_attendee_detail(uuid, uuid) to authenticated;
