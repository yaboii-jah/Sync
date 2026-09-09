-- Bulk operations are intentionally silent: none of these functions create a
-- notification or dispatch a push. Every selected row is validated before a
-- write, so an eligibility failure rolls the entire batch back.

create or replace function private.assert_bulk_session_input(
  target_event_id uuid,
  target_session_ids uuid[],
  mutation_request_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  if target_event_id is null then
    raise exception 'event id is required';
  end if;

  if cardinality(target_session_ids) is null
    or cardinality(target_session_ids) = 0 then
    raise exception 'select at least one session';
  end if;

  if cardinality(target_session_ids) > 100 then
    raise exception 'select no more than 100 sessions';
  end if;

  if cardinality(target_session_ids) is distinct from cardinality(mutation_request_ids) then
    raise exception 'each session must have one request id';
  end if;

  if exists (
    select 1
      from unnest(target_session_ids) as input(session_id)
     where input.session_id is null
  ) or exists (
    select 1
      from unnest(mutation_request_ids) as input(request_id)
     where input.request_id is null
  ) then
    raise exception 'session ids and request ids are required';
  end if;

  if (select count(*) from unnest(target_session_ids) as input(session_id))
    <> (select count(distinct input.session_id) from unnest(target_session_ids) as input(session_id)) then
    raise exception 'each session can only be selected once';
  end if;

  if (select count(*) from unnest(mutation_request_ids) as input(request_id))
    <> (select count(distinct input.request_id) from unnest(mutation_request_ids) as input(request_id)) then
    raise exception 'each request id can only be used once';
  end if;
end;
$$;

revoke all on function private.assert_bulk_session_input(uuid, uuid[], uuid[]) from public, anon, authenticated;

create or replace function public.admin_get_session_bulk_eligibility(
  target_event_id uuid
)
returns table (
  session_id uuid,
  delete_reason text,
  unpublish_reason text,
  resume_auto_reason text
)
language sql
security definer
set search_path = ''
as $$
  select
    sessions.id,
    case
      when sessions.published then 'Only unpublished drafts can be deleted'
      when sessions.status <> 'not_started' then 'Only not-started drafts can be deleted'
      when sessions.status_override is not null then 'Sessions with a manual override cannot be deleted'
      when sessions.actual_started_at is not null or sessions.actual_ended_at is not null then 'Sessions with manual start or end history cannot be deleted'
      when now() >= sessions.start_time then 'Only future drafts can be deleted'
      when exists (
        select 1 from public.session_seat_claims
         where session_id = sessions.id
      ) then 'Sessions with attendee-held seats cannot be deleted'
      when exists (
        select 1 from public.notifications
         where related_session_id = sessions.id
      ) then 'Sessions with alert history cannot be deleted'
      else null
    end,
    case
      when not sessions.published then 'Session is already unpublished'
      when exists (
        select 1 from public.session_seat_claims
         where session_id = sessions.id
      ) then 'Sessions with attendee-held seats cannot be unpublished'
      else null
    end,
    case
      when not sessions.published then 'Only published sessions can resume automatic status'
      when sessions.status_override is null then 'Session is already using automatic status'
      else null
    end
  from public.sessions as sessions
  where sessions.event_id = target_event_id
    and (select private.is_admin());
$$;

revoke all on function public.admin_get_session_bulk_eligibility(uuid) from public, anon;

grant execute on function public.admin_get_session_bulk_eligibility(uuid) to authenticated;

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

  if current_session.published
    or current_session.status <> 'not_started'
    or current_session.status_override is not null
    or current_session.actual_started_at is not null
    or current_session.actual_ended_at is not null
    or now() >= current_session.start_time then
    raise exception 'only untouched future drafts can be deleted; unpublish instead';
  end if;

  if exists (
    select 1 from public.session_seat_claims
     where session_id = target_session_id
  ) then
    raise exception 'sessions with attendee-held seats cannot be deleted';
  end if;

  if exists (
    select 1 from public.notifications
     where related_session_id = target_session_id
  ) then
    raise exception 'sessions with alert history cannot be deleted';
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

  if not next_published and not current_session.published then
    raise exception 'session is already unpublished';
  end if;

  if not next_published and exists (
    select 1 from public.session_seat_claims
     where session_id = target_session_id
  ) then
    raise exception 'sessions with attendee-held seats cannot be unpublished';
  end if;

  update public.sessions
     set published = next_published
   where id = target_session_id;

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

create or replace function public.admin_bulk_delete_sessions(
  target_event_id uuid,
  target_session_ids uuid[],
  mutation_request_ids uuid[]
)
returns table (session_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  input record;
  current_session public.sessions%rowtype;
  pending_ids uuid[] := '{}';
  pending_request_ids uuid[] := '{}';
  pending_count integer := 0;
  locked_count integer := 0;
begin
  perform private.assert_bulk_session_input(
    target_event_id,
    target_session_ids,
    mutation_request_ids
  );

  for input in
    select source.session_id, source.request_id
      from unnest(target_session_ids, mutation_request_ids) as source(session_id, request_id)
     order by source.session_id
  loop
    if not private.assert_admin_mutation(input.request_id, 'session.delete', input.session_id) then
      pending_ids := array_append(pending_ids, input.session_id);
      pending_request_ids := array_append(pending_request_ids, input.request_id);
      pending_count := pending_count + 1;
    end if;
  end loop;

  for current_session in
    select sessions.*
      from public.sessions
     where sessions.id = any(pending_ids)
     order by sessions.id
     for update
  loop
    locked_count := locked_count + 1;

    if current_session.event_id <> target_event_id
      or current_session.published
      or current_session.status <> 'not_started'
      or current_session.status_override is not null
      or current_session.actual_started_at is not null
      or current_session.actual_ended_at is not null
      or now() >= current_session.start_time then
      raise exception 'every selected session must be an untouched future draft in this event';
    end if;

    if exists (
      select 1 from public.session_seat_claims
       where session_id = current_session.id
    ) then
      raise exception 'sessions with attendee-held seats cannot be deleted';
    end if;

    if exists (
      select 1 from public.notifications
       where related_session_id = current_session.id
    ) then
      raise exception 'sessions with alert history cannot be deleted';
    end if;
  end loop;

  if locked_count <> pending_count then
    raise exception 'one or more selected sessions no longer exist';
  end if;

  for input in
    select source.session_id, source.request_id
      from unnest(pending_ids, pending_request_ids) as source(session_id, request_id)
     order by source.session_id
  loop
    select * into current_session
      from public.sessions
     where id = input.session_id;

    insert into public.admin_audit_log (
      actor_id, action, entity_type, entity_id, details, request_id
    )
    values (
      (select auth.uid()),
      'session.delete',
      'session',
      input.session_id,
      jsonb_build_object('title', current_session.title),
      input.request_id
    );

    delete from public.sessions where id = input.session_id;
  end loop;

  return query
  select source.session_id
    from unnest(target_session_ids) as source(session_id)
   order by source.session_id;
end;
$$;

create or replace function public.admin_bulk_unpublish_sessions(
  target_event_id uuid,
  target_session_ids uuid[],
  mutation_request_ids uuid[]
)
returns table (session_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  input record;
  current_session public.sessions%rowtype;
  pending_ids uuid[] := '{}';
  pending_request_ids uuid[] := '{}';
  pending_count integer := 0;
  locked_count integer := 0;
begin
  perform private.assert_bulk_session_input(
    target_event_id,
    target_session_ids,
    mutation_request_ids
  );

  for input in
    select source.session_id, source.request_id
      from unnest(target_session_ids, mutation_request_ids) as source(session_id, request_id)
     order by source.session_id
  loop
    if not private.assert_admin_mutation(input.request_id, 'session.unpublish', input.session_id) then
      pending_ids := array_append(pending_ids, input.session_id);
      pending_request_ids := array_append(pending_request_ids, input.request_id);
      pending_count := pending_count + 1;
    end if;
  end loop;

  for current_session in
    select sessions.*
      from public.sessions
     where sessions.id = any(pending_ids)
     order by sessions.id
     for update
  loop
    locked_count := locked_count + 1;

    if current_session.event_id <> target_event_id or not current_session.published then
      raise exception 'every selected session must be a published session in this event';
    end if;

    if exists (
      select 1 from public.session_seat_claims
       where session_id = current_session.id
    ) then
      raise exception 'sessions with attendee-held seats cannot be unpublished';
    end if;
  end loop;

  if locked_count <> pending_count then
    raise exception 'one or more selected sessions no longer exist';
  end if;

  for input in
    select source.session_id, source.request_id
      from unnest(pending_ids, pending_request_ids) as source(session_id, request_id)
     order by source.session_id
  loop
    select * into current_session
      from public.sessions
     where id = input.session_id;

    update public.sessions
       set published = false
     where id = input.session_id;

    delete from public.my_flow_bookmarks
     where session_id = input.session_id;

    insert into public.admin_audit_log (
      actor_id, action, entity_type, entity_id, details, request_id
    )
    values (
      (select auth.uid()),
      'session.unpublish',
      'session',
      input.session_id,
      jsonb_build_object('title', current_session.title),
      input.request_id
    );
  end loop;

  return query
  select source.session_id
    from unnest(target_session_ids) as source(session_id)
   order by source.session_id;
end;
$$;

create or replace function public.admin_bulk_resume_session_auto(
  target_event_id uuid,
  target_session_ids uuid[],
  mutation_request_ids uuid[]
)
returns table (session_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  input record;
  current_session public.sessions%rowtype;
  next_status text;
  pending_ids uuid[] := '{}';
  pending_request_ids uuid[] := '{}';
  pending_count integer := 0;
  locked_count integer := 0;
begin
  perform private.assert_bulk_session_input(
    target_event_id,
    target_session_ids,
    mutation_request_ids
  );

  for input in
    select source.session_id, source.request_id
      from unnest(target_session_ids, mutation_request_ids) as source(session_id, request_id)
     order by source.session_id
  loop
    if not private.assert_admin_mutation(input.request_id, 'session.resume_auto', input.session_id) then
      pending_ids := array_append(pending_ids, input.session_id);
      pending_request_ids := array_append(pending_request_ids, input.request_id);
      pending_count := pending_count + 1;
    end if;
  end loop;

  for current_session in
    select sessions.*
      from public.sessions
     where sessions.id = any(pending_ids)
     order by sessions.id
     for update
  loop
    locked_count := locked_count + 1;

    if current_session.event_id <> target_event_id
      or not current_session.published
      or current_session.status_override is null then
      raise exception 'every selected session must be published with a manual status override';
    end if;
  end loop;

  if locked_count <> pending_count then
    raise exception 'one or more selected sessions no longer exist';
  end if;

  for input in
    select source.session_id, source.request_id
      from unnest(pending_ids, pending_request_ids) as source(session_id, request_id)
     order by source.session_id
  loop
    select * into current_session
      from public.sessions
     where id = input.session_id;

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
     where id = input.session_id;

    insert into public.admin_audit_log (
      actor_id, action, entity_type, entity_id, details, request_id
    )
    values (
      (select auth.uid()),
      'session.resume_auto',
      'session',
      input.session_id,
      jsonb_build_object(
        'before_status', current_session.status,
        'before_override', current_session.status_override,
        'after_status', next_status
      ),
      input.request_id
    );
  end loop;

  return query
  select source.session_id
    from unnest(target_session_ids) as source(session_id)
   order by source.session_id;
end;
$$;

revoke all on function public.admin_bulk_delete_sessions(uuid, uuid[], uuid[]) from public, anon;

revoke all on function public.admin_bulk_unpublish_sessions(uuid, uuid[], uuid[]) from public, anon;

revoke all on function public.admin_bulk_resume_session_auto(uuid, uuid[], uuid[]) from public, anon;

grant execute on function public.admin_bulk_delete_sessions(uuid, uuid[], uuid[]) to authenticated;

grant execute on function public.admin_bulk_unpublish_sessions(uuid, uuid[], uuid[]) to authenticated;

grant execute on function public.admin_bulk_resume_session_auto(uuid, uuid[], uuid[]) to authenticated;
