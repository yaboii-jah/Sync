-- `RETURNS TABLE (session_id ...)` creates a PL/pgSQL output variable named
-- `session_id`. Qualify the seat-claim column instead of relying on an
-- unavailable hosted `plpgsql.variable_conflict` setting.
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
      select 1 from public.session_seat_claims as seat_claims
       where seat_claims.session_id = current_session.id
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
