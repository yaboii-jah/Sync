-- Event feedback is separate from global app_feedback. No direct Data API
-- access is granted: narrow RPCs authorize each read and write independently.
create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  membership_id uuid not null,
  category text not null check (category in ('bug', 'usability', 'idea')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint event_feedback_membership_fkey foreign key (event_id, membership_id)
    references public.event_memberships (event_id, id) on delete cascade,
  constraint event_feedback_request_unique unique (event_id, membership_id, request_id)
);
create index event_feedback_event_created_idx on public.event_feedback (event_id, created_at desc, id desc);
create index event_feedback_membership_idx on public.event_feedback (membership_id);
alter table public.event_feedback enable row level security;
revoke all on public.event_feedback from public, anon, authenticated;

create function public.submit_event_feedback(
  target_event_id uuid, feedback_category text, feedback_message text, feedback_request_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_membership uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select m.id into actor_membership from public.event_memberships m
    where m.event_id = target_event_id and m.user_id = (select auth.uid())
      and m.role = 'attendee' and m.status = 'active';
  if actor_membership is null then raise exception 'active attendee membership required'; end if;
  -- A completed request remains successful if the event was archived between retries.
  if exists (select 1 from public.event_feedback f where f.event_id = target_event_id
    and f.membership_id = actor_membership and f.request_id = feedback_request_id) then return; end if;
  if not exists (select 1 from public.events e where e.id = target_event_id
    and e.lifecycle = 'published' and e.suspended_at is null) then
    raise exception 'published event required';
  end if;
  if feedback_category is null or feedback_category not in ('bug', 'usability', 'idea')
    or feedback_message is null or char_length(btrim(feedback_message)) not between 1 and 2000
    or feedback_request_id is null then raise exception 'invalid feedback'; end if;
  insert into public.event_feedback(event_id, membership_id, category, message, request_id)
    values (target_event_id, actor_membership, feedback_category, btrim(feedback_message), feedback_request_id)
    on conflict (event_id, membership_id, request_id) do nothing;
end $$;

create function public.list_event_feedback(target_event_id uuid, result_limit integer default 100)
returns table (id uuid, category text, message text, attendee_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.event_memberships m join public.events e on e.id = m.event_id
    where m.event_id = target_event_id and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin') and m.status = 'active' and e.suspended_at is null
  ) then raise exception 'event manager required'; end if;
  return query select f.id, f.category, f.message,
    coalesce(nullif(btrim(p.name), ''), nullif(btrim(m.display_name_snapshot), ''), 'Unnamed attendee'), f.created_at
    from public.event_feedback f
    join public.event_memberships m on m.event_id = f.event_id and m.id = f.membership_id
    left join public.profiles p on p.id = m.user_id
    where f.event_id = target_event_id
    order by f.created_at desc, f.id desc
    limit least(greatest(coalesce(result_limit, 100), 1), 100);
end $$;

create function public.get_event_raffle_attendees(target_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.event_memberships manager join public.events e on e.id = manager.event_id
    where manager.event_id = target_event_id and manager.user_id = (select auth.uid())
      and manager.role in ('owner', 'admin') and manager.status = 'active'
      and e.suspended_at is null and e.lifecycle in ('published', 'archived')
  ) then raise exception 'published event manager required'; end if;
  return (select jsonb_build_object(
    'attendees', coalesce(jsonb_agg(jsonb_build_object('id', eligible.id, 'name', eligible.name)
      order by lower(eligible.name), eligible.id) filter (where eligible.name <> ''), '[]'::jsonb),
    'excluded_blank_count', count(*) filter (where eligible.name = '')
  ) from (
    select m.id, btrim(regexp_replace(coalesce(p.name, ''), '[[:space:]]+', ' ', 'g')) as name
    from public.event_memberships m join public.profiles p on p.id = m.user_id
    where m.event_id = target_event_id and m.role = 'attendee' and m.status = 'active'
  ) eligible);
end $$;

revoke all on function public.submit_event_feedback(uuid, text, text, uuid) from public, anon;
revoke all on function public.list_event_feedback(uuid, integer) from public, anon;
revoke all on function public.get_event_raffle_attendees(uuid) from public, anon;
grant execute on function public.submit_event_feedback(uuid, text, text, uuid) to authenticated;
grant execute on function public.list_event_feedback(uuid, integer) to authenticated;
grant execute on function public.get_event_raffle_attendees(uuid) to authenticated;
