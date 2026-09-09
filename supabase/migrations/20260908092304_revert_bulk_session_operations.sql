drop function public.admin_bulk_delete_sessions(uuid, uuid[], uuid[]);

drop function public.admin_bulk_unpublish_sessions(uuid, uuid[], uuid[]);

drop function public.admin_bulk_resume_session_auto(uuid, uuid[], uuid[]);

drop function public.admin_get_session_bulk_eligibility(uuid);

drop function private.assert_bulk_session_input(uuid, uuid[], uuid[]);

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

  if current_session.published then
    raise exception 'only unpublished draft sessions can be deleted; unpublish instead';
  end if;

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
