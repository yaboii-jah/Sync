-- Existing event allowlist remains the sole authority. Protection is system-owned.
alter table public.admin_users
  add column protected boolean not null default false;

-- Catherine Notado and Jahmell Dorias: verified retained IDs, independent of profile names.
update public.admin_users set protected = true
where user_id in ('b0a714fd-f9b1-4ae5-b3a9-d15251fa3c04'::uuid, 'fe8f59a0-70ca-445b-9f75-e97ac9564c1a'::uuid);

create function public.admin_get_user_access(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  membership boolean;
  protection boolean;
begin
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;
  if target_user_id is null or not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = target_user_id
  ) then
    raise exception 'user not found';
  end if;

  select true, a.protected into membership, protection
    from public.admin_users a where a.user_id = target_user_id;

  return jsonb_build_object(
    'user_id', target_user_id,
    'is_admin', coalesce(membership, false),
    'is_protected', coalesce(protection, false),
    'is_self', actor = target_user_id,
    'can_grant', not coalesce(membership, false),
    'can_revoke', coalesce(membership, false)
      and not coalesce(protection, false) and actor <> target_user_id
      and (select count(*) > 1 from public.admin_users)
  );
end;
$$;

create function public.admin_set_user_admin(
  target_user_id uuid,
  grant_admin boolean,
  mutation_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
as $$
declare
  actor uuid := (select auth.uid());
  audit_action text;
  prior_admin boolean;
  protection boolean;
  target_name text;
begin
  -- Table lock also serializes ordinary operator writes and FK cascades.
  -- Authorization is intentionally checked again AFTER a waiting caller enters.
  if actor is null then raise exception 'admin access required'; end if;
  lock table public.admin_users in share row exclusive mode;
  if not (select private.is_admin()) then raise exception 'admin access required'; end if;
  if grant_admin is null then raise exception 'admin access choice is required'; end if;
  if target_user_id is null then raise exception 'user not found'; end if;
  audit_action := case when grant_admin then 'admin.grant' else 'admin.revoke' end;

  if (select private.assert_admin_mutation(mutation_request_id, audit_action, target_user_id)) then
    if not exists (
      select 1 from public.admin_audit_log a where a.request_id = mutation_request_id
        and a.actor_id = actor and a.action = audit_action and a.entity_id = target_user_id
    ) then
      raise exception 'request id was already used for another mutation';
    end if;
    -- A retry reports current access; it cannot reapply a later-reversed grant.
    return public.admin_get_user_access(target_user_id);
  end if;

  select p.name into target_name from public.profiles p
    join auth.users u on u.id = p.id where p.id = target_user_id for key share of p, u;
  if not found then raise exception 'user not found'; end if;
  select true, a.protected into prior_admin, protection
    from public.admin_users a where a.user_id = target_user_id;
  prior_admin := coalesce(prior_admin, false);
  protection := coalesce(protection, false);

  if not grant_admin and prior_admin then
    if protection then raise exception 'protected admin access cannot be removed'; end if;
    if actor = target_user_id then raise exception 'you cannot remove your own admin access'; end if;
    if (select count(*) from public.admin_users) <= 1 then
      raise exception 'the last admin cannot be removed';
    end if;
  end if;

  if grant_admin then
    insert into public.admin_users(user_id, created_by)
      values (target_user_id, actor) on conflict (user_id) do nothing;
  else
    delete from public.admin_users where user_id = target_user_id;
  end if;

  insert into public.admin_audit_log(actor_id, action, entity_type, entity_id, details, request_id)
  values (actor, audit_action, 'user', target_user_id, jsonb_build_object(
    'target_name', target_name, 'before_admin', prior_admin, 'after_admin', grant_admin,
    'changed', prior_admin <> grant_admin
  ), mutation_request_id);
  return public.admin_get_user_access(target_user_id);
end;
$$;

revoke all on function public.admin_get_user_access(uuid) from public, anon;
revoke all on function public.admin_set_user_admin(uuid, boolean, uuid) from public, anon;
grant execute on function public.admin_get_user_access(uuid) to authenticated;
grant execute on function public.admin_set_user_admin(uuid, boolean, uuid) to authenticated;
revoke insert, update, delete on public.admin_users from anon, authenticated;

notify pgrst, 'reload schema';
