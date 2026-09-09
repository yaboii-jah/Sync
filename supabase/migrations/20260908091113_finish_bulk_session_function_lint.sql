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
  pending_ids uuid[] := array[]::uuid[];
  pending_request_ids uuid[] := array[]::uuid[];
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
      select 1 from public.session_seat_claims as seat_claims
       where seat_claims.session_id = current_session.id
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

    delete from public.my_flow_bookmarks as bookmarks
     where bookmarks.session_id = input.session_id;

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
  pending_ids uuid[] := array[]::uuid[];
  pending_request_ids uuid[] := array[]::uuid[];
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
