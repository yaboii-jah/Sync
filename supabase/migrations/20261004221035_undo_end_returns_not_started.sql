-- Confirmed correction: Undo End resets to Not Started, requiring manual Start.
-- Preserve prior timing in audits; never reset existing rows during deployment.
-- Keep operated sessions protected from draft deletion after timestamp clearing.

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
  ended_audit public.admin_audit_log%rowtype;
begin
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  if action is null or action not in ('start', 'end', 'undo_end') then
    raise exception 'invalid session action: use manual start, end, or undo_end';
  end if;

  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  if exists (
    select 1
      from public.admin_audit_log as audit
     where audit.request_id = mutation_request_id
       and audit.actor_id = actor
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
  elsif action = 'undo_end' then
    if current_session.status <> 'finished' then
      raise exception 'only a finished session can undo End';
    end if;

    -- Bind recovery to the latest End that produced this completion timestamp.
    -- Old End records use created_at; new records explicitly retain timestamps.
    select * into ended_audit
      from public.admin_audit_log as audit
     where audit.entity_id = target_session_id
       and audit.entity_type = 'session'
       and audit.action = 'session.end'
       and coalesce((audit.details->>'after_actual_ended_at')::timestamptz, audit.created_at)
           = current_session.actual_ended_at
     order by audit.id desc
     limit 1;
    if not found or coalesce(ended_audit.details->>'before_status', '') not in ('not_started', 'ongoing') then
      raise exception 'no matching manual End is available to undo';
    end if;
    next_status := 'not_started';

    update public.sessions
       set status = next_status,
           status_override = null,
           status_override_at = null,
           status_override_by = null,
           actual_started_at = null,
           actual_ended_at = null
     where id = target_session_id;

    if send_notification then
      notification_id := private.create_notification(
        'announcement',
        current_session.title || ': End undone',
        'This session has been reset to Not Started. An admin will start it when ready.',
        target_session_id,
        'manual_status',
        'all',
        actor,
        null,
        'manual:' || mutation_request_id
      );
    end if;
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
      'notification_id', notification_id,
      'before_actual_started_at', current_session.actual_started_at,
      'before_actual_ended_at', current_session.actual_ended_at,
      'after_actual_started_at', (select sessions.actual_started_at from public.sessions as sessions where sessions.id = target_session_id),
      'after_actual_ended_at', (select sessions.actual_ended_at from public.sessions as sessions where sessions.id = target_session_id),
      'undone_end_request_id', ended_audit.request_id
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

alter function public.admin_delete_session(uuid,uuid) set schema private;

CREATE OR REPLACE FUNCTION private.admin_delete_session(target_session_id uuid, mutation_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := (select auth.uid());
  current_session public.sessions%rowtype;
begin
  if (select private.assert_admin_mutation(mutation_request_id, 'session.delete', target_session_id)) then
    return target_session_id;
  end if;

  select * into current_session
    from public.sessions
   where id = target_session_id
   for update;

  if not found then
    raise exception 'session not found';
  end if;

  if current_session.published then
    raise exception 'only unpublished draft sessions can be deleted; unpublish instead';
  end if;

  if current_session.status <> 'not_started'
     or current_session.actual_started_at is not null
     or current_session.actual_ended_at is not null
     or exists (
       select 1 from public.admin_audit_log as audit
        where audit.entity_type = 'session'
          and audit.entity_id = target_session_id
          and audit.action in ('session.start', 'session.end', 'session.undo_end')
     ) then
    raise exception 'only sessions that have not started can be deleted; unpublish instead';
  end if;

  insert into public.admin_audit_log (
    actor_id, action, entity_type, entity_id, details, request_id
  )
  values (
    actor,
    'session.delete',
    'session',
    target_session_id,
    jsonb_build_object('title', current_session.title),
    mutation_request_id
  );

  delete from public.sessions where id = target_session_id;

  return target_session_id;
end;
$function$;

create function public.admin_delete_session(target_session_id uuid, mutation_request_id uuid)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.admin_delete_session(target_session_id, mutation_request_id);
$$;

revoke all on function public.admin_delete_session(uuid,uuid) from public, anon;
revoke all on function private.admin_delete_session(uuid,uuid) from public, anon;
grant execute on function public.admin_delete_session(uuid,uuid) to authenticated;
grant execute on function private.admin_delete_session(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
