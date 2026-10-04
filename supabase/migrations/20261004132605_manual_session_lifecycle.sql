-- Session status changes only through audited admin Start/End.
-- Preserve existing rows/history, RPC signatures, and cron identity/schedule.

-- admin_create_session: invoker API, authenticated private worker.
alter function public.admin_create_session(uuid,text,text,text,timestamptz,timestamptz,boolean,uuid) set schema private;

CREATE OR REPLACE FUNCTION private.admin_create_session(target_event_id uuid, session_title text, session_description text, session_room text, session_start_time timestamp with time zone, session_end_time timestamp with time zone, session_published boolean, mutation_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := (select auth.uid());
  created_id uuid;
begin
  if (select private.assert_admin_mutation(mutation_request_id, 'session.create', null)) then
    select audit.entity_id into created_id
      from public.admin_audit_log as audit
     where audit.request_id = mutation_request_id
       and audit.action = 'session.create';
    return created_id;
  end if;

  if coalesce(btrim(session_title), '') = '' then
    raise exception 'title is required';
  end if;

  if session_end_time <= session_start_time then
    raise exception 'end time must be after start time';
  end if;

  insert into public.sessions (
    event_id,
    title,
    description,
    room,
    start_time,
    end_time,
    published,
    status
  )
  values (
    target_event_id,
    btrim(session_title),
    nullif(btrim(coalesce(session_description, '')), ''),
    nullif(btrim(coalesce(session_room, '')), ''),
    session_start_time,
    session_end_time,
    coalesce(session_published, false),
    'not_started'
  )
  returning id into created_id;

  insert into public.admin_audit_log (
    actor_id, action, entity_type, entity_id, details, request_id
  )
  values (
    actor,
    'session.create',
    'session',
    created_id,
    jsonb_build_object(
      'title', btrim(session_title),
      'published', coalesce(session_published, false)
    ),
    mutation_request_id
  );

  return created_id;
end;
$function$;

create function public.admin_create_session(target_event_id uuid, session_title text, session_description text, session_room text, session_start_time timestamptz, session_end_time timestamptz, session_published boolean, mutation_request_id uuid)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.admin_create_session(target_event_id, session_title, session_description, session_room, session_start_time, session_end_time, session_published, mutation_request_id);
$$;

revoke all on function public.admin_create_session(uuid,text,text,text,timestamptz,timestamptz,boolean,uuid) from public, anon;
revoke all on function private.admin_create_session(uuid,text,text,text,timestamptz,timestamptz,boolean,uuid) from public, anon;
grant execute on function public.admin_create_session(uuid,text,text,text,timestamptz,timestamptz,boolean,uuid) to authenticated;
grant execute on function private.admin_create_session(uuid,text,text,text,timestamptz,timestamptz,boolean,uuid) to authenticated;

-- admin_update_session: invoker API, authenticated private worker.
alter function public.admin_update_session(uuid,text,text,text,timestamptz,timestamptz,uuid) set schema private;

CREATE OR REPLACE FUNCTION private.admin_update_session(target_session_id uuid, session_title text, session_description text, session_room text, session_start_time timestamp with time zone, session_end_time timestamp with time zone, mutation_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := (select auth.uid());
  current_session public.sessions%rowtype;
begin
  if (select private.assert_admin_mutation(mutation_request_id, 'session.update', target_session_id)) then
    return target_session_id;
  end if;

  if coalesce(btrim(session_title), '') = '' then
    raise exception 'title is required';
  end if;

  if session_end_time <= session_start_time then
    raise exception 'end time must be after start time';
  end if;

  select * into current_session
    from public.sessions
   where id = target_session_id
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  -- Schedule edits preserve the administrator-controlled status.
  update public.sessions
     set title = btrim(session_title),
         description = nullif(btrim(coalesce(session_description, '')), ''),
         room = nullif(btrim(coalesce(session_room, '')), ''),
         start_time = session_start_time,
         end_time = session_end_time,
         reminder_sent_at = case
           when session_start_time is distinct from current_session.start_time
             then null
           else current_session.reminder_sent_at
         end
   where id = target_session_id;

  insert into public.admin_audit_log (
    actor_id, action, entity_type, entity_id, details, request_id
  )
  values (
    actor,
    'session.update',
    'session',
    target_session_id,
    jsonb_build_object(
      'title', btrim(session_title),
      'moved', session_start_time is distinct from current_session.start_time
    ),
    mutation_request_id
  );

  return target_session_id;
end;
$function$;

create function public.admin_update_session(target_session_id uuid, session_title text, session_description text, session_room text, session_start_time timestamptz, session_end_time timestamptz, mutation_request_id uuid)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.admin_update_session(target_session_id, session_title, session_description, session_room, session_start_time, session_end_time, mutation_request_id);
$$;

revoke all on function public.admin_update_session(uuid,text,text,text,timestamptz,timestamptz,uuid) from public, anon;
revoke all on function private.admin_update_session(uuid,text,text,text,timestamptz,timestamptz,uuid) from public, anon;
grant execute on function public.admin_update_session(uuid,text,text,text,timestamptz,timestamptz,uuid) to authenticated;
grant execute on function private.admin_update_session(uuid,text,text,text,timestamptz,timestamptz,uuid) to authenticated;

-- admin_set_session_status: invoker API, authenticated private worker.
alter function public.admin_set_session_status(uuid,text,boolean,uuid) set schema private;

CREATE OR REPLACE FUNCTION private.admin_set_session_status(target_session_id uuid, action text, send_notification boolean, mutation_request_id uuid)
 RETURNS TABLE(session_id uuid, status text, status_override text, status_override_at timestamp with time zone, actual_started_at timestamp with time zone, actual_ended_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := (select auth.uid());
  current_session public.sessions%rowtype;
  next_status text;
  notification_id uuid;
begin
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  if action is null or action not in ('start', 'end') then
    raise exception 'invalid session action: use manual start or end';
  end if;

  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  if exists (
    select 1
      from public.admin_audit_log as audit
     where audit.request_id = mutation_request_id
       and audit.action = 'session.' || $2
       and audit.entity_id = target_session_id
  ) then
    return query
    select sessions.id,
           sessions.status,
           sessions.status_override,
           sessions.status_override_at,
           sessions.actual_started_at,
           sessions.actual_ended_at
      from public.sessions as sessions
     where sessions.id = target_session_id;
    return;
  end if;

  if exists (
    select 1 from public.admin_audit_log
     where request_id = mutation_request_id
  ) then
    raise exception 'request id was already used for another mutation';
  end if;

  select * into current_session
    from public.sessions
   where id = target_session_id
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  if action = 'start' then
    if current_session.status = 'ongoing' then
      raise exception 'session is already ongoing';
    end if;
    if current_session.status = 'finished' then
      raise exception 'finished sessions cannot be restarted';
    end if;

    update public.sessions
       set status = 'ongoing',
           status_override = 'ongoing',
           status_override_at = now(),
           status_override_by = actor,
           actual_started_at = now(),
           actual_ended_at = null
     where id = target_session_id;
    next_status := 'ongoing';

    if send_notification then
      notification_id := private.create_notification(
        'session_live',
        current_session.title || ' is live',
        'Head over to ' || coalesce(current_session.room, 'the venue') || '.',
        target_session_id,
        'manual_status',
        'all',
        actor,
        null,
        'manual:' || mutation_request_id
      );
    end if;
  elsif action = 'end' then
    if current_session.status = 'finished' then
      raise exception 'session is already finished';
    end if;
    update public.sessions
       set status = 'finished',
           status_override = 'finished',
           status_override_at = now(),
           status_override_by = actor,
           actual_ended_at = now()
     where id = target_session_id;
    next_status := 'finished';

    if send_notification then
      notification_id := private.create_notification(
        'session_ended',
        current_session.title || ' just wrapped up',
        null,
        target_session_id,
        'manual_status',
        'all',
        actor,
        null,
        'manual:' || mutation_request_id
      );
    end if;

    delete from public.my_flow_bookmarks as bookmarks
     where bookmarks.session_id = target_session_id;
  else
    raise exception 'invalid session action';
  end if;

  insert into public.admin_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    request_id
  )
  values (
    actor,
    'session.' || action,
    'session',
    target_session_id,
    jsonb_build_object(
      'before_status', current_session.status,
      'before_override', current_session.status_override,
      'after_status', next_status,
      'notification_id', notification_id
    ),
    mutation_request_id
  );

  return query
  select sessions.id,
         sessions.status,
         sessions.status_override,
         sessions.status_override_at,
         sessions.actual_started_at,
         sessions.actual_ended_at
    from public.sessions as sessions
   where sessions.id = target_session_id;
end;
$function$;

create function public.admin_set_session_status(target_session_id uuid, action text, send_notification boolean, mutation_request_id uuid)
returns table (session_id uuid, status text, status_override text, status_override_at timestamptz, actual_started_at timestamptz, actual_ended_at timestamptz)
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.admin_set_session_status(target_session_id, action, send_notification, mutation_request_id);
$$;

revoke all on function public.admin_set_session_status(uuid,text,boolean,uuid) from public, anon;
revoke all on function private.admin_set_session_status(uuid,text,boolean,uuid) from public, anon;
grant execute on function public.admin_set_session_status(uuid,text,boolean,uuid) to authenticated;
grant execute on function private.admin_set_session_status(uuid,text,boolean,uuid) to authenticated;

-- toggle_my_flow_bookmark: invoker API, authenticated private worker.
alter function public.toggle_my_flow_bookmark(uuid) set schema private;

CREATE OR REPLACE FUNCTION private.toggle_my_flow_bookmark(target_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  already_bookmarked boolean;
  conflicts jsonb;
begin
  if actor is null then
    raise exception 'not signed in';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  select sessions.* into target
    from public.sessions as sessions
   where sessions.id = target_session_id
     and sessions.published
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  select exists (
    select 1
      from public.my_flow_bookmarks as bookmarks
     where bookmarks.user_id = actor
       and bookmarks.session_id = target.id
  ) into already_bookmarked;

  if already_bookmarked then
    delete from public.my_flow_bookmarks as bookmarks
     where bookmarks.user_id = actor
       and bookmarks.session_id = target.id;

    return jsonb_build_object(
      'bookmarked', false,
      'conflicts', '[]'::jsonb
    );
  end if;

  if target.status = 'finished' then
    raise exception 'finished sessions cannot be added to My Flow';
  end if;

  insert into public.my_flow_bookmarks (user_id, session_id)
  values (actor, target.id);

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
     and sessions.status <> 'finished'
     and sessions.start_time < target.end_time
     and sessions.end_time > target.start_time;

  return jsonb_build_object(
    'bookmarked', true,
    'conflicts', conflicts
  );
end;
$function$;

create function public.toggle_my_flow_bookmark(target_session_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.toggle_my_flow_bookmark(target_session_id);
$$;

revoke all on function public.toggle_my_flow_bookmark(uuid) from public, anon;
revoke all on function private.toggle_my_flow_bookmark(uuid) from public, anon;
grant execute on function public.toggle_my_flow_bookmark(uuid) to authenticated;
grant execute on function private.toggle_my_flow_bookmark(uuid) to authenticated;

-- claim_session_seat: invoker API, authenticated private worker.
alter function public.claim_session_seat(uuid) set schema private;

CREATE OR REPLACE FUNCTION private.claim_session_seat(target_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  if target.status = 'finished' then
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
     and sessions.status <> 'finished'
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
$function$;

create function public.claim_session_seat(target_session_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.claim_session_seat(target_session_id);
$$;

revoke all on function public.claim_session_seat(uuid) from public, anon;
revoke all on function private.claim_session_seat(uuid) from public, anon;
grant execute on function public.claim_session_seat(uuid) to authenticated;
grant execute on function private.claim_session_seat(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.sync_program_flow_statuses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = ''
AS $function$
begin
  -- Finished-bookmark cleanup and event timing remain independent of session control.
  delete from public.my_flow_bookmarks as bookmarks
   using public.sessions as sessions
   where sessions.id = bookmarks.session_id
     and sessions.status = 'finished';

  update public.events
     set status = calculated.new_status
    from (
      select id,
             case
               when now() < starts_at then 'upcoming'
               when now() >= ends_at then 'ended'
               else 'started'
             end as new_status
        from public.events
    ) as calculated
   where public.events.id = calculated.id
     and public.events.status is distinct from calculated.new_status;
end;
$function$;

revoke all on function public.sync_program_flow_statuses() from public, anon, authenticated;

notify pgrst, 'reload schema';
