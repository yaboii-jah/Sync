-- Privileged implementations live outside the exposed Data API schemas.
-- Moving them retains the reviewed bodies, ownership, and narrow grants.
alter function public.admin_get_user_access(uuid) set schema private;
alter function public.admin_set_user_admin(uuid, boolean, uuid) set schema private;

create function public.admin_get_user_access(target_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.admin_get_user_access(target_user_id);
$$;

create function public.admin_set_user_admin(
  target_user_id uuid,
  grant_admin boolean,
  mutation_request_id uuid
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.admin_set_user_admin(target_user_id, grant_admin, mutation_request_id);
$$;

revoke all on function public.admin_get_user_access(uuid) from public, anon;
revoke all on function public.admin_set_user_admin(uuid, boolean, uuid) from public, anon;
revoke all on function private.admin_get_user_access(uuid) from public, anon;
revoke all on function private.admin_set_user_admin(uuid, boolean, uuid) from public, anon;
grant execute on function public.admin_get_user_access(uuid) to authenticated;
grant execute on function public.admin_set_user_admin(uuid, boolean, uuid) to authenticated;
grant execute on function private.admin_get_user_access(uuid) to authenticated;
grant execute on function private.admin_set_user_admin(uuid, boolean, uuid) to authenticated;

notify pgrst, 'reload schema';
