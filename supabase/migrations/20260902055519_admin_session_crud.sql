-- Editable program flow for the admin console.
--
-- Until now the console could only override a session's live status; the
-- schedule itself had to be edited directly in the database. This adds the
-- missing CRUD as security-definer RPCs following the same shape as
-- `admin_set_session_status`: admin-gated, idempotent on a request id, and
-- audit-logged.
--
-- It also introduces a draft state. `published` defaults to true so every
-- existing row stays exactly as visible as it is today; only sessions an
-- organiser explicitly unpublishes disappear from the attendee app.

alter table public.sessions
  add column published boolean not null default true;

comment on column public.sessions.published is
  'False hides the session from attendees and stops the scheduled job from '
  'flipping its status or sending notifications for it. Drafts and pulled '
  'sessions live here.';

create index sessions_published_idx on public.sessions (published);

-- Attendees see published sessions only. Admins keep seeing everything so the
-- console can list drafts; this is still read-only for both, so Invariant 1
-- ("no client-side write path to sessions") is untouched — every write below
-- goes through a security-definer RPC.
drop policy "Authenticated users can view sessions" on public.sessions;

create policy "Authenticated users can view published sessions"
  on public.sessions for select to authenticated
  using (published or (select private.is_admin()));

-- The scheduled job must ignore drafts. Without this an unpublished session
-- whose start time has passed would flip to ongoing and push a "session is
-- live" notification to every attendee who bookmarked it — announcing a
-- session that is deliberately not on the schedule.
--
-- Reproduced verbatim from `20260830133303_admin_operations.sql` with
-- `and sessions.published` added to both loops; nothing else changes.
create or replace function public.sync_program_flow_statuses()
returns void
language plpgsql
as $$
declare
  flipped record;
  reminder record;
begin
  for flipped in
    select sessions.id,
           sessions.title,
           sessions.room,
           case
             when now() < sessions.start_time then 'not_started'
             when now() >= sessions.end_time then 'finished'
             else 'ongoing'
           end as new_status
      from public.sessions as sessions
     where sessions.published
       and sessions.status_override is null
       and sessions.status is distinct from (
         case
           when now() < sessions.start_time then 'not_started'
           when now() >= sessions.end_time then 'finished'
           else 'ongoing'
         end
       )
     for update skip locked
  loop
    update public.sessions
       set status = flipped.new_status
     where id = flipped.id;

    if flipped.new_status = 'ongoing' then
      perform private.create_notification(
        'session_live',
        flipped.title || ' is live',
        'Head over to ' || coalesce(flipped.room, 'the venue') || '.',
        flipped.id,
        'automatic',
        'bookmarkers',
        null,
        null,
        'session:' || flipped.id || ':live'
      );
    elsif flipped.new_status = 'finished' then
      perform private.create_notification(
        'session_ended',
        flipped.title || ' just wrapped up',
        null,
        flipped.id,
        'automatic',
        'bookmarkers',
        null,
        null,
        'session:' || flipped.id || ':ended'
      );

      delete from public.my_flow_bookmarks
       where session_id = flipped.id;
    end if;
  end loop;

  for reminder in
    select sessions.id, sessions.title, sessions.room
      from public.sessions as sessions
     where sessions.published
       and sessions.status_override is null
       and sessions.status = 'not_started'
       and sessions.reminder_sent_at is null
       and sessions.start_time between now() + interval '9 minutes'
                                   and now() + interval '11 minutes'
     for update skip locked
  loop
    update public.sessions
       set reminder_sent_at = now()
     where id = reminder.id;

    perform private.create_notification(
      'session_reminder',
      reminder.title || ' starts in 10 minutes',
      'Head over to ' || coalesce(reminder.room, 'the venue') || '.',
      reminder.id,
      'automatic',
      'bookmarkers',
      null,
      null,
      'session:' || reminder.id || ':reminder'
    );
  end loop;

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
$$;

-- Shared guard: admin check plus request-id idempotency, so a retried form
-- submission cannot create the same session twice.
create or replace function private.assert_admin_mutation(
  mutation_request_id uuid,
  audit_action text,
  audit_entity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  -- Already applied: the caller should treat this as success and re-read.
  if exists (
    select 1
      from public.admin_audit_log as audit
     where audit.request_id = mutation_request_id
       and audit.action = audit_action
       and (audit_entity_id is null or audit.entity_id = audit_entity_id)
  ) then
    return true;
  end if;

  if exists (
    select 1 from public.admin_audit_log
     where request_id = mutation_request_id
  ) then
    raise exception 'request id was already used for another mutation';
  end if;

  return false;
end;
$$;

revoke all on function private.assert_admin_mutation(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.admin_create_session(
  target_event_id uuid,
  session_title text,
  session_description text,
  session_room text,
  session_start_time timestamptz,
  session_end_time timestamptz,
  session_published boolean,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
    case
      when now() < session_start_time then 'not_started'
      when now() >= session_end_time then 'finished'
      else 'ongoing'
    end
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
$$;

create or replace function public.admin_update_session(
  target_session_id uuid,
  session_title text,
  session_description text,
  session_room text,
  session_start_time timestamptz,
  session_end_time timestamptz,
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

  /*
   * Moving the times invalidates a reminder that was already sent for the old
   * slot, so clear the stamp and let the scheduled job decide again. The
   * derived status is only recomputed when no manual override is standing —
   * an organiser's Start or End stays authoritative, as it does everywhere.
   */
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
         end,
         status = case
           when current_session.status_override is not null then current_session.status
           when now() < session_start_time then 'not_started'
           when now() >= session_end_time then 'finished'
           else 'ongoing'
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
$$;

create or replace function public.admin_set_session_published(
  target_session_id uuid,
  next_published boolean,
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
begin
  if (select private.assert_admin_mutation(
        mutation_request_id,
        case when next_published then 'session.publish' else 'session.unpublish' end,
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

  update public.sessions
     set published = next_published
   where id = target_session_id;

  /*
   * Pulling a session from the schedule also drops it out of everyone's My
   * Flow. Leaving the bookmarks would keep a hidden session in attendees'
   * saved list, where the RLS policy above renders it as nothing at all.
   */
  if not next_published then
    delete from public.my_flow_bookmarks
     where session_id = target_session_id;
  end if;

  insert into public.admin_audit_log (
    actor_id, action, entity_type, entity_id, details, request_id
  )
  values (
    actor,
    case when next_published then 'session.publish' else 'session.unpublish' end,
    'session',
    target_session_id,
    jsonb_build_object('title', current_session.title),
    mutation_request_id
  );

  return target_session_id;
end;
$$;

create or replace function public.admin_delete_session(
  target_session_id uuid,
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

  /*
   * A session that has already run is part of the event's record — its
   * notifications and audit entries reference it. Unpublishing hides it
   * without rewriting history; deletion is for drafts and mistakes.
   */
  if current_session.status <> 'not_started' then
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
$$;

revoke all on function public.admin_create_session(
  uuid, text, text, text, timestamptz, timestamptz, boolean, uuid
) from public, anon;
revoke all on function public.admin_update_session(
  uuid, text, text, text, timestamptz, timestamptz, uuid
) from public, anon;
revoke all on function public.admin_set_session_published(uuid, boolean, uuid) from public, anon;
revoke all on function public.admin_delete_session(uuid, uuid) from public, anon;

grant execute on function public.admin_create_session(
  uuid, text, text, text, timestamptz, timestamptz, boolean, uuid
) to authenticated;
grant execute on function public.admin_update_session(
  uuid, text, text, text, timestamptz, timestamptz, uuid
) to authenticated;
grant execute on function public.admin_set_session_published(uuid, boolean, uuid) to authenticated;
grant execute on function public.admin_delete_session(uuid, uuid) to authenticated;
