-- Workshop seat capacity and attendee seat claims.
--
-- Registration for the three workshop tracks happened off-app, through the
-- organiser export, so every workshop starts full. Event operations gets two
-- numbers per session and one switch:
--
--   capacity        total seats. Null means the session has no seat limit at
--                   all -- every non-workshop row -- and the attendee UI shows
--                   nothing, exactly as it does today.
--   reserved_seats  seats already spoken for off-app. This is the number an
--                   organiser edits when a registered attendee drops out.
--   seats_closed    an explicit override that reads Full whatever the counts
--                   say, so a workshop can be closed with seats still free.
--
-- Attendees fill the gap between the two. `claimed_seats` mirrors the
-- `session_seat_claims` rows and is only ever moved inside the claim/release
-- functions below, so a later organiser edit to `reserved_seats` cannot
-- silently destroy a seat an attendee already holds. Taken seats are always
-- `reserved_seats + claimed_seats`, and the constraint keeps that sum inside
-- `capacity` no matter which of the two writers moved last.
--
-- This is seat capacity, not a registration system: there is no waitlist, no
-- payment and no check-in, and the organiser export remains the source of
-- truth for who registered off-app.

alter table public.sessions
  add column capacity integer,
  add column reserved_seats integer not null default 0,
  add column claimed_seats integer not null default 0,
  add column seats_closed boolean not null default false;

comment on column public.sessions.capacity is
  'Total seats for a session with a seat limit. Null means unlimited, which '
  'hides every seat affordance from attendees and admins alike.';

comment on column public.sessions.reserved_seats is
  'Seats spoken for outside the app (the organiser registration export). The '
  'only seat number an admin edits directly.';

comment on column public.sessions.claimed_seats is
  'Denormalised count of session_seat_claims rows. Maintained exclusively by '
  'claim_session_seat and release_session_seat, never written by hand.';

comment on column public.sessions.seats_closed is
  'Admin override that presents the session as Full regardless of counts and '
  'refuses new claims.';

alter table public.sessions
  add constraint sessions_capacity_positive
    check (capacity is null or capacity > 0),
  add constraint sessions_reserved_seats_non_negative
    check (reserved_seats >= 0),
  add constraint sessions_claimed_seats_non_negative
    check (claimed_seats >= 0),
  add constraint sessions_seats_within_capacity
    check (capacity is null or reserved_seats + claimed_seats <= capacity);

-- One row per attendee per session. The primary key is what makes a claim
-- idempotent; the denormalised counter on sessions is what lets a card show
-- how full a workshop is without exposing who else is sitting in it.
create table public.session_seat_claims (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index session_seat_claims_user_id_idx
  on public.session_seat_claims (user_id);

alter table public.session_seat_claims enable row level security;

revoke all on table public.session_seat_claims from public, anon, authenticated;
grant select on table public.session_seat_claims to authenticated;

-- Everyone, allowlisted admins included, reads only their own seat. There is
-- deliberately no admin clause: nothing in the console needs the roster --
-- `sessions.claimed_seats` already carries the count -- and an admin clause
-- here would hand every attendee's claims to the admin's own /home page,
-- which reads this table for its own seat state. A workshop's roster stays
-- unreadable from the app, which is Invariant 15.
--
-- There is likewise no insert, update or delete policy: every write goes
-- through the security-definer functions below, which keeps Invariant 1
-- ("no client-side write path to sessions") true for the counter as well.
create policy "Attendees can view their own seat claims"
  on public.session_seat_claims for select to authenticated
  using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.session_seat_claims;

/*
 * Claim a seat.
 *
 * The session row is locked for the rest of the transaction, so two attendees
 * racing for the last seat serialise here and the loser is told the seat has
 * gone rather than the room being over-sold. Already holding a seat is
 * success, not an error, so a double-tap or a retried request is harmless.
 */
create or replace function public.claim_session_seat(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  conflicts jsonb := '[]'::jsonb;
begin
  if actor is null then
    raise exception 'not signed in';
  end if;

  select * into target
    from public.sessions
   where id = target_session_id
     and published
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  if target.capacity is null then
    raise exception 'session does not have seats';
  end if;

  if exists (
    select 1
      from public.session_seat_claims
     where session_id = target.id
       and user_id = actor
  ) then
    return jsonb_build_object(
      'held', true,
      'capacity', target.capacity,
      'taken', target.reserved_seats + target.claimed_seats,
      'seats_closed', target.seats_closed,
      'conflicts', conflicts
    );
  end if;

  if target.seats_closed then
    raise exception 'seats are closed';
  end if;

  if target.status = 'finished'
     or target.status_override = 'finished'
     or (
       target.status_override is null
       and now() >= target.end_time
     ) then
    raise exception 'finished sessions cannot be claimed';
  end if;

  if target.reserved_seats + target.claimed_seats >= target.capacity then
    raise exception 'no seats left';
  end if;

  insert into public.session_seat_claims (session_id, user_id)
  values (target.id, actor);

  update public.sessions
     set claimed_seats = claimed_seats + 1
   where id = target.id;

  /*
   * Taking a seat puts the session in My Flow, because an attendee who holds a
   * seat plainly intends to be there. The reverse is deliberately not true:
   * removing the bookmark leaves the seat alone, so an unrelated tap can never
   * cost someone their place. Releasing a seat is its own explicit action.
   */
  insert into public.my_flow_bookmarks (user_id, session_id)
  values (actor, target.id)
  on conflict do nothing;

  /*
   * A seat saves the session to My Flow, so it owes the attendee the same
   * overlap warning a manual save gives — the workshop tracks run alongside
   * the tech talks, and a seat taken in silence would hide that. Identical
   * shape and half-open interval test to `toggle_my_flow_bookmark`: a warning,
   * never a refusal.
   */
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sessions.id,
        'title', sessions.title,
        'start_time', sessions.start_time,
        'end_time', sessions.end_time,
        'room', sessions.room
      )
      order by sessions.start_time, sessions.end_time, sessions.id
    ),
    '[]'::jsonb
  ) into conflicts
    from public.my_flow_bookmarks as bookmarks
    join public.sessions as sessions
      on sessions.id = bookmarks.session_id
   where bookmarks.user_id = actor
     and bookmarks.session_id <> target.id
     and sessions.published
     and (
       (
         sessions.status_override is not null
         and sessions.status_override <> 'finished'
       )
       or (
         sessions.status_override is null
         and now() < sessions.end_time
       )
     )
     and sessions.start_time < target.end_time
     and sessions.end_time > target.start_time;

  return jsonb_build_object(
    'held', true,
    'capacity', target.capacity,
    'taken', target.reserved_seats + target.claimed_seats + 1,
    'seats_closed', target.seats_closed,
    'conflicts', conflicts
  );
end;
$$;

/*
 * Give a seat back. Releasing leaves the My Flow bookmark in place: an
 * attendee may still want to watch a workshop they are no longer sitting in,
 * and silently un-saving it would be a second surprise on top of the first.
 */
create or replace function public.release_session_seat(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  released boolean := false;
begin
  if actor is null then
    raise exception 'not signed in';
  end if;

  select * into target
    from public.sessions
   where id = target_session_id
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  delete from public.session_seat_claims
   where session_id = target.id
     and user_id = actor;

  released := found;

  if released then
    update public.sessions
       set claimed_seats = greatest(claimed_seats - 1, 0)
     where id = target.id;
  end if;

  return jsonb_build_object(
    'held', false,
    'capacity', target.capacity,
    'taken', target.reserved_seats + target.claimed_seats
                - (case when released then 1 else 0 end),
    'seats_closed', target.seats_closed,
    'conflicts', '[]'::jsonb
  );
end;
$$;

/*
 * Set a session's seat numbers. Follows the same shape as the other admin
 * session mutations: allowlist-gated, idempotent on a request id, and audited
 * in the same transaction.
 *
 * No seat edit can ever take a seat off an attendee who is holding one. A new
 * capacity must still cover the seats they are sitting in, and clearing the
 * limit to null is refused outright while any seat is held -- otherwise
 * blanking one field would quietly do what shrinking the capacity is
 * explicitly forbidden from doing. An organiser who wants to stop new claims
 * without disturbing anyone uses `seats_closed` instead. Both errors name the
 * numbers so the console can say exactly why it refused.
 */
create or replace function public.admin_set_session_capacity(
  target_session_id uuid,
  session_capacity integer,
  session_reserved_seats integer,
  session_seats_closed boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  current_session public.sessions%rowtype;
  next_reserved integer := coalesce(session_reserved_seats, 0);
  next_closed boolean := coalesce(session_seats_closed, false);
begin
  if (select private.assert_admin_mutation(
        mutation_request_id,
        'session.capacity',
        target_session_id
      )) then
    return target_session_id;
  end if;

  select * into current_session
    from public.sessions
   where id = target_session_id
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  if session_capacity is null then
    if current_session.claimed_seats > 0 then
      raise exception
        'cannot remove the seat limit while % attendee seats are held; close seats instead',
        current_session.claimed_seats;
    end if;

    update public.sessions
       set capacity = null,
           reserved_seats = 0,
           claimed_seats = 0,
           seats_closed = false
     where id = target_session_id;
  else
    if session_capacity <= 0 then
      raise exception 'capacity must be greater than zero';
    end if;

    if next_reserved < 0 then
      raise exception 'reserved seats cannot be negative';
    end if;

    if next_reserved + current_session.claimed_seats > session_capacity then
      raise exception
        'capacity must be at least % to cover % reserved and % attendee seats',
        next_reserved + current_session.claimed_seats,
        next_reserved,
        current_session.claimed_seats;
    end if;

    update public.sessions
       set capacity = session_capacity,
           reserved_seats = next_reserved,
           seats_closed = next_closed
     where id = target_session_id;
  end if;

  insert into public.admin_audit_log (
    actor_id, action, entity_type, entity_id, details, request_id
  )
  values (
    actor,
    'session.capacity',
    'session',
    target_session_id,
    jsonb_build_object(
      'title', current_session.title,
      'capacity', session_capacity,
      'reserved_seats',
        case when session_capacity is null then 0 else next_reserved end,
      'seats_closed',
        case when session_capacity is null then false else next_closed end
    ),
    mutation_request_id
  );

  return target_session_id;
end;
$$;

revoke all on function public.claim_session_seat(uuid) from public, anon;
grant execute on function public.claim_session_seat(uuid) to authenticated;

revoke all on function public.release_session_seat(uuid) from public, anon;
grant execute on function public.release_session_seat(uuid) to authenticated;

revoke all on function
  public.admin_set_session_capacity(uuid, integer, integer, boolean, uuid)
  from public, anon;
grant execute on function
  public.admin_set_session_capacity(uuid, integer, integer, boolean, uuid)
  to authenticated;

/*
 * Seed the three workshop tracks at the capacities the organisers registered
 * off-app. All three start completely full: Tracks A and B seat 33, and Track
 * C is the BuilderCards tournament's four teams of four, so 16. Every other
 * session keeps a null capacity and shows no seat information at all.
 */
update public.sessions
   set capacity = 33,
       reserved_seats = 33
 where id in (
   '10000000-0000-4000-8000-000000000014'::uuid,
   '10000000-0000-4000-8000-000000000015'::uuid
 );

update public.sessions
   set capacity = 16,
       reserved_seats = 16
 where id = '10000000-0000-4000-8000-000000000016'::uuid;

-- Fail closed if the seed missed: a workshop silently left with no seat limit
-- would look like an ordinary talk to every attendee, and nothing downstream
-- would report it.
do $$
declare
  seated_workshops bigint;
  full_workshops bigint;
begin
  select count(*),
         count(*) filter (
           where sessions.reserved_seats + sessions.claimed_seats
                 >= sessions.capacity
         )
    into seated_workshops, full_workshops
    from public.sessions as sessions
   where sessions.id in (
     '10000000-0000-4000-8000-000000000014'::uuid,
     '10000000-0000-4000-8000-000000000015'::uuid,
     '10000000-0000-4000-8000-000000000016'::uuid
   )
     and sessions.capacity is not null;

  if seated_workshops <> 3 or full_workshops <> 3 then
    raise exception
      'expected 3 workshop tracks seeded full, found % seated and % full',
      seated_workshops, full_workshops;
  end if;
end;
$$;
