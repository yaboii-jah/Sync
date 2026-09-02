-- Qualify the bookmark column because the RPC returns a session_id column.
create or replace function public.admin_set_session_status(
  target_session_id uuid,
  action text,
  send_notification boolean,
  mutation_request_id uuid
)
returns table (
  session_id uuid,
  status text,
  status_override text,
  status_override_at timestamptz,
  actual_started_at timestamptz,
  actual_ended_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  current_session public.sessions%rowtype;
  next_status text;
  notification_id uuid;
begin
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin access required';
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
  elsif action = 'resume_auto' then
    if current_session.status_override is null then
      raise exception 'session is already using automatic status';
    end if;

    next_status := case
      when now() < current_session.start_time then 'not_started'
      when now() >= current_session.end_time then 'finished'
      else 'ongoing'
    end;

    update public.sessions
       set status = next_status,
           status_override = null,
           status_override_at = null,
           status_override_by = null
     where id = target_session_id;
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
$$;
