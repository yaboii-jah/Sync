begin;

-- A seat belongs to the same event as its session. Existing claims inherit
-- that event; claims held by inactive/non-members are released at cutover.
alter table public.session_seat_claims add column event_id uuid;
update public.session_seat_claims c set event_id=s.event_id
  from public.sessions s where s.id=c.session_id;
do $$ begin
  if exists(select 1 from public.session_seat_claims where event_id is null) then
    raise exception 'seat claim without an event-owned session';
  end if;
end $$;
delete from public.session_seat_claims c where not exists (
  select 1 from public.event_memberships m
   where m.event_id=c.event_id and m.user_id=c.user_id and m.status='active'
);
alter table public.session_seat_claims alter column event_id set not null;
alter table public.session_seat_claims drop constraint session_seat_claims_session_id_fkey;
alter table public.session_seat_claims add constraint session_seat_claims_event_session_fkey
  foreign key(event_id,session_id) references public.sessions(event_id,id) on delete cascade;
create index session_seat_claims_event_user_idx on public.session_seat_claims(event_id,user_id,session_id);

-- Repair any historical counter drift before the triggers become its sole writer.
update public.sessions s set claimed_seats=(
  select count(*)::integer from public.session_seat_claims c
   where c.event_id=s.event_id and c.session_id=s.id
) where claimed_seats is distinct from (
  select count(*)::integer from public.session_seat_claims c
   where c.event_id=s.event_id and c.session_id=s.id
);

drop policy "Attendees can view their own seat claims" on public.session_seat_claims;
create policy "Attendees can view their own seat claims" on public.session_seat_claims
  for select to authenticated using (
    user_id=(select auth.uid())
    and (select private.has_event_role(event_id,array['owner','admin','attendee']))
  );
revoke all on public.session_seat_claims from public,anon,authenticated;
grant select on public.session_seat_claims to authenticated;

create function private.count_session_seat_claim()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    update public.sessions set claimed_seats=claimed_seats+1
      where event_id=new.event_id and id=new.session_id;
    return new;
  end if;
  update public.sessions set claimed_seats=claimed_seats-1
    where event_id=old.event_id and id=old.session_id;
  return old;
end $$;
revoke all on function private.count_session_seat_claim() from public,anon,authenticated;
create trigger session_seat_claim_count after insert or delete on public.session_seat_claims
  for each row execute function private.count_session_seat_claim();

create function private.release_inactive_member_seats()
returns trigger language plpgsql security definer set search_path='' as $$
declare held_session_id uuid;
begin
  if old.user_id is not null and old.status='active'
     and (new.status<>'active' or new.user_id is distinct from old.user_id) then
    for held_session_id in
      select c.session_id from public.session_seat_claims c
       where c.event_id=old.event_id and c.user_id=old.user_id order by c.session_id
    loop
      delete from public.session_seat_claims c
       where c.event_id=old.event_id and c.session_id=held_session_id and c.user_id=old.user_id;
    end loop;
  end if;
  return new;
end $$;
revoke all on function private.release_inactive_member_seats() from public,anon,authenticated;
create trigger release_inactive_member_seats after update of status,user_id on public.event_memberships
  for each row execute function private.release_inactive_member_seats();

-- Preserve the existing concurrency/availability behavior; the row trigger
-- now maintains the denormalized count for every insertion path.
create or replace function public.claim_session_seat(target_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  target_event public.events%rowtype;
  conflicts jsonb := '[]'::jsonb;
begin
  if actor is null then raise exception 'not signed in'; end if;
  select * into target from public.sessions where id=target_session_id and published for update;
  if not found then raise exception 'session not found'; end if;
  if not private.has_event_role(target.event_id,array['owner','admin','attendee']) then
    raise exception 'active event membership required';
  end if;
  select * into target_event from public.events where id=target.event_id;
  if target_event.lifecycle<>'published' or target_event.suspended_at is not null then
    raise exception 'event schedule is read-only';
  end if;
  if target.capacity is null then raise exception 'session does not have seats'; end if;
  if exists(select 1 from public.session_seat_claims
      where event_id=target.event_id and session_id=target.id and user_id=actor) then
    return jsonb_build_object('held',true,'capacity',target.capacity,
      'taken',target.reserved_seats+target.claimed_seats,
      'seats_closed',target.seats_closed,'conflicts',conflicts);
  end if;
  if target.seats_closed then raise exception 'seats are closed'; end if;
  if target.status='finished' or target.status_override='finished'
     or (target.status_override is null and now()>=target.end_time) then
    raise exception 'finished sessions cannot be claimed';
  end if;
  if target.reserved_seats+target.claimed_seats>=target.capacity then
    raise exception 'no seats left';
  end if;
  insert into public.session_seat_claims(event_id,session_id,user_id)
    values(target.event_id,target.id,actor);
  insert into public.my_flow_bookmarks(event_id,user_id,session_id)
    values(target.event_id,actor,target.id) on conflict do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sessions.id,'title',sessions.title,'start_time',sessions.start_time,
    'end_time',sessions.end_time,'room',sessions.room
  ) order by sessions.start_time,sessions.end_time,sessions.id),'[]'::jsonb)
    into conflicts
    from public.my_flow_bookmarks as bookmarks
    join public.sessions as sessions
      on sessions.event_id=bookmarks.event_id and sessions.id=bookmarks.session_id
   where bookmarks.event_id=target.event_id and bookmarks.user_id=actor
     and bookmarks.session_id<>target.id and sessions.published
     and ((sessions.status_override is not null and sessions.status_override<>'finished')
       or (sessions.status_override is null and now()<sessions.end_time))
     and sessions.start_time<target.end_time and sessions.end_time>target.start_time;
  return jsonb_build_object('held',true,'capacity',target.capacity,
    'taken',target.reserved_seats+target.claimed_seats+1,
    'seats_closed',target.seats_closed,'conflicts',conflicts);
end $$;

create or replace function public.release_session_seat(target_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  target_event public.events%rowtype;
  released boolean := false;
begin
  if actor is null then raise exception 'not signed in'; end if;
  select * into target from public.sessions where id=target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  if not private.has_event_role(target.event_id,array['owner','admin','attendee']) then
    raise exception 'active event membership required';
  end if;
  select * into target_event from public.events where id=target.event_id;
  if target_event.lifecycle<>'published' or target_event.suspended_at is not null then
    raise exception 'event schedule is read-only';
  end if;
  delete from public.session_seat_claims
   where event_id=target.event_id and session_id=target.id and user_id=actor;
  released := found;
  return jsonb_build_object('held',false,'capacity',target.capacity,
    'taken',target.reserved_seats+target.claimed_seats-(case when released then 1 else 0 end),
    'seats_closed',target.seats_closed,'conflicts','[]'::jsonb);
end $$;

-- A support session may moderate membership, but cannot change the program.
create or replace function public.admin_set_session_capacity(
  target_session_id uuid,session_capacity integer,session_reserved_seats integer,
  session_seats_closed boolean,mutation_request_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  current_session public.sessions%rowtype;
  target_event public.events%rowtype;
  next_reserved integer := coalesce(session_reserved_seats,0);
  next_closed boolean := coalesce(session_seats_closed,false);
  replay public.event_audit_log%rowtype;
begin
  select * into current_session from public.sessions where id=target_session_id for update;
  if not found then raise exception 'session not found'; end if;
  replay := private.claim_event_request(current_session.event_id,'session.capacity',mutation_request_id,target_session_id);
  if replay.id is not null then return target_session_id; end if;
  actor_membership_id := private.current_event_membership_id(current_session.event_id,array['owner','admin']);
  if actor_membership_id is null then raise exception 'event staff access required'; end if;
  select * into target_event from public.events where id=current_session.event_id for update;
  if target_event.lifecycle='archived' or target_event.suspended_at is not null then
    raise exception 'event content is read-only';
  end if;
  if session_capacity is null then
    if current_session.claimed_seats>0 then
      raise exception 'cannot remove the seat limit while % attendee seats are held; close seats instead',current_session.claimed_seats;
    end if;
    update public.sessions set capacity=null,reserved_seats=0,claimed_seats=0,seats_closed=false
      where id=target_session_id;
  else
    if session_capacity<=0 then raise exception 'capacity must be greater than zero'; end if;
    if next_reserved<0 then raise exception 'reserved seats cannot be negative'; end if;
    if next_reserved+current_session.claimed_seats>session_capacity then
      raise exception 'capacity must be at least % to cover % reserved and % attendee seats',
        next_reserved+current_session.claimed_seats,next_reserved,current_session.claimed_seats;
    end if;
    update public.sessions set capacity=session_capacity,reserved_seats=next_reserved,seats_closed=next_closed
      where id=target_session_id;
  end if;
  insert into public.event_audit_log(event_id,actor_user_id,actor_membership_id,action,
    target_entity_type,target_entity_id,details,request_id)
  values(current_session.event_id,actor,actor_membership_id,'session.capacity','session',target_session_id,
    jsonb_build_object('title',current_session.title,'capacity',session_capacity,
      'reserved_seats',case when session_capacity is null then 0 else next_reserved end,
      'seats_closed',case when session_capacity is null then false else next_closed end),mutation_request_id);
  return target_session_id;
end $$;

commit;
