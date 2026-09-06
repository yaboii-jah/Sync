-- Only unpublished, not-started drafts may be hard-deleted. Published sessions
-- remain part of the attendee-facing event record even before they begin.
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
