-- Audited event operations for the multi-tenant foundation. Event creation and
-- content editing remain closed until tenant scoping reaches all core tables.

begin;

create table public.event_audit_log (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_membership_id uuid,
  action text not null check (char_length(btrim(action)) between 1 and 120),
  target_entity_type text not null
    check (char_length(btrim(target_entity_type)) between 1 and 80),
  target_entity_id uuid,
  reason text check (reason is null or char_length(btrim(reason)) between 1 and 1000),
  details jsonb not null default '{}'::jsonb,
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  constraint event_audit_log_actor_membership_fkey
    foreign key (event_id, actor_membership_id)
    references public.event_memberships (event_id, id)
    on delete set null (actor_membership_id)
);

create index event_audit_log_event_created_idx
  on public.event_audit_log (event_id, created_at desc, id desc);
create index event_audit_log_actor_created_idx
  on public.event_audit_log (actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.event_audit_log enable row level security;

create trigger event_audit_log_immutable
  before update or delete on public.event_audit_log
  for each row execute function public.prevent_admin_audit_changes();

create or replace function private.has_event_support_access(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_platform_super_admin())
     and exists (
       select 1
         from public.platform_support_sessions
        where event_id = target_event_id
          and super_admin_user_id = (select auth.uid())
          and ended_at is null
          and expires_at > now()
     );
$$;

create or replace function private.current_event_membership_id(
  target_event_id uuid,
  allowed_roles text[]
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
    from public.event_memberships
   where event_id = target_event_id
     and user_id = (select auth.uid())
     and status = 'active'
     and role = any(allowed_roles)
   limit 1;
$$;

create or replace function private.claim_event_request(
  target_event_id uuid,
  mutation_action text,
  mutation_request_id uuid,
  mutation_target_id uuid default null
)
returns public.event_audit_log
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  existing_audit public.event_audit_log%rowtype;
begin
  if actor is null then
    raise exception 'authentication required';
  end if;
  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  if exists (
    select 1 from public.platform_audit_log where request_id = mutation_request_id
  ) then
    raise exception 'request id was already used for another mutation';
  end if;

  select * into existing_audit
    from public.event_audit_log
   where request_id = mutation_request_id;

  if found then
    if existing_audit.event_id = target_event_id
       and existing_audit.actor_user_id = actor
       and existing_audit.action = mutation_action
       and (
         mutation_target_id is null
         or existing_audit.target_entity_id = mutation_target_id
       ) then
      return existing_audit;
    end if;
    raise exception 'request id was already used for another mutation';
  end if;

  return null;
end;
$$;

create or replace function private.claim_platform_request(
  mutation_action text,
  mutation_request_id uuid,
  target_event_id uuid default null
)
returns public.platform_audit_log
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  existing_audit public.platform_audit_log%rowtype;
begin
  if actor is null or not (select private.is_platform_super_admin()) then
    raise exception 'super admin access required';
  end if;
  if mutation_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  if exists (
    select 1 from public.event_audit_log where request_id = mutation_request_id
  ) then
    raise exception 'request id was already used for another mutation';
  end if;

  select * into existing_audit
    from public.platform_audit_log
   where request_id = mutation_request_id;

  if found then
    if existing_audit.actor_user_id = actor
       and existing_audit.action = mutation_action
       and existing_audit.event_id is not distinct from target_event_id then
      return existing_audit;
    end if;
    raise exception 'request id was already used for another mutation';
  end if;

  return null;
end;
$$;

revoke all on function private.has_event_support_access(uuid) from public, anon;
revoke all on function private.current_event_membership_id(uuid, text[]) from public, anon, authenticated;
revoke all on function private.claim_event_request(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.claim_platform_request(text, uuid, uuid) from public, anon, authenticated;
grant execute on function private.has_event_support_access(uuid) to authenticated;

drop policy "Users and event staff can view memberships" on public.event_memberships;
create policy "Users and authorized event staff can view memberships"
  on public.event_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_event_role(event_id, array['owner', 'admin']))
    or (select private.has_event_support_access(event_id))
  );

drop policy "Event staff can view admin invitations" on public.event_admin_invitations;
create policy "Authorized event staff can view admin invitations"
  on public.event_admin_invitations for select to authenticated
  using (
    (select private.has_event_role(event_id, array['owner', 'admin']))
    or (select private.has_event_support_access(event_id))
  );

create policy "Authorized event staff can view event audit"
  on public.event_audit_log for select to authenticated
  using (
    (select private.has_event_role(event_id, array['owner', 'admin']))
    or (select private.has_event_support_access(event_id))
  );

revoke all on table public.event_audit_log from public, anon, authenticated;
grant select on table public.event_audit_log to authenticated;

create or replace function public.join_event(
  target_event_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_event public.events%rowtype;
  membership public.event_memberships%rowtype;
  replay public.event_audit_log%rowtype;
  actor_name text;
  actor_email text;
begin
  replay := private.claim_event_request(
    target_event_id, 'membership.join', mutation_request_id
  );
  if replay.id is not null then
    return replay.target_entity_id;
  end if;

  select * into target_event from public.events
   where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  if target_event.lifecycle <> 'published' or target_event.suspended_at is not null then
    raise exception 'event is not open for joining';
  end if;

  select profiles.name, lower(btrim(auth_users.email))
    into actor_name, actor_email
    from auth.users as auth_users
    join public.profiles on profiles.id = auth_users.id
   where auth_users.id = actor
     and auth_users.email_confirmed_at is not null;
  if not found then raise exception 'verified profile required'; end if;

  select * into membership from public.event_memberships
   where event_id = target_event_id and user_id = actor for update;

  if found and membership.status = 'blocked' then
    raise exception 'membership is blocked';
  end if;

  if not found then
    insert into public.event_memberships (
      event_id, user_id, role, status, display_name_snapshot, email_snapshot
    ) values (
      target_event_id, actor, 'attendee', 'active', actor_name, actor_email
    ) returning * into membership;
  elsif membership.status <> 'active' then
    update public.event_memberships
       set role = 'attendee', status = 'active', ended_at = null,
           joined_at = now(), display_name_snapshot = actor_name,
           email_snapshot = actor_email
     where id = membership.id returning * into membership;
  end if;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, request_id
  ) values (
    target_event_id, actor, membership.id, 'membership.join',
    'event_membership', membership.id, mutation_request_id
  );
  return membership.id;
end;
$$;

create or replace function public.leave_event(
  target_event_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  membership public.event_memberships%rowtype;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'membership.leave', mutation_request_id
  );
  if replay.id is not null then return replay.target_entity_id; end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event membership is read-only';
  end if;

  select * into membership from public.event_memberships
   where event_id = target_event_id and user_id = actor for update;
  if not found then raise exception 'active membership required'; end if;
  if membership.role = 'owner' then
    raise exception 'owner must transfer ownership or archive the event';
  end if;
  if membership.status <> 'active' then raise exception 'active membership required'; end if;

  update public.event_memberships
     set status = 'left', ended_at = now()
   where id = membership.id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, request_id
  ) values (
    target_event_id, actor, membership.id, 'membership.leave',
    'event_membership', membership.id, mutation_request_id
  );
  return membership.id;
end;
$$;

create or replace function public.moderate_event_attendee(
  target_membership_id uuid,
  next_status text,
  moderation_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_membership public.event_memberships%rowtype;
  actor_membership_id uuid;
  target_event public.events%rowtype;
  action_name text := 'membership.' || next_status;
  replay public.event_audit_log%rowtype;
begin
  select * into target_membership from public.event_memberships
   where id = target_membership_id for update;
  if not found then raise exception 'membership not found'; end if;

  replay := private.claim_event_request(
    target_membership.event_id, action_name, mutation_request_id, target_membership_id
  );
  if replay.id is not null then return target_membership_id; end if;

  actor_membership_id := private.current_event_membership_id(
    target_membership.event_id, array['owner', 'admin']
  );
  if actor_membership_id is null
     and not private.has_event_support_access(target_membership.event_id) then
    raise exception 'event staff access required';
  end if;
  if target_membership.role <> 'attendee' then raise exception 'only attendees can be moderated'; end if;
  if next_status not in ('active', 'removed', 'blocked') then
    raise exception 'invalid membership status';
  end if;
  if next_status <> 'active' and char_length(btrim(coalesce(moderation_reason, ''))) < 8 then
    raise exception 'moderation reason is required';
  end if;

  select * into target_event from public.events
   where id = target_membership.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event membership is read-only';
  end if;

  update public.event_memberships
     set status = next_status,
         ended_at = case when next_status = 'active' then null else now() end,
         joined_at = case when next_status = 'active' then now() else joined_at end
   where id = target_membership_id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, reason, request_id
  ) values (
    target_membership.event_id, actor, actor_membership_id, action_name,
    'event_membership', target_membership_id,
    nullif(btrim(coalesce(moderation_reason, '')), ''), mutation_request_id
  );
  return target_membership_id;
end;
$$;

create or replace function public.remove_event_admin(
  target_membership_id uuid,
  removal_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_membership public.event_memberships%rowtype;
  actor_membership_id uuid;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  select * into target_membership from public.event_memberships
   where id = target_membership_id for update;
  if not found then raise exception 'membership not found'; end if;
  replay := private.claim_event_request(
    target_membership.event_id, 'admin.remove', mutation_request_id, target_membership_id
  );
  if replay.id is not null then return target_membership_id; end if;

  actor_membership_id := private.current_event_membership_id(
    target_membership.event_id, array['owner']
  );
  if actor_membership_id is null then raise exception 'event owner access required'; end if;
  if target_membership.role <> 'admin' or target_membership.status <> 'active' then
    raise exception 'active admin membership required';
  end if;
  if char_length(btrim(coalesce(removal_reason, ''))) < 8 then
    raise exception 'removal reason is required';
  end if;

  select * into target_event from public.events
   where id = target_membership.event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event administration is read-only';
  end if;

  update public.event_memberships
     set status = 'removed', ended_at = now()
   where id = target_membership_id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, reason, request_id
  ) values (
    target_membership.event_id, actor, actor_membership_id, 'admin.remove',
    'event_membership', target_membership_id, btrim(removal_reason), mutation_request_id
  );
  return target_membership_id;
end;
$$;

create or replace function public.issue_event_admin_invitation(
  target_event_id uuid,
  invite_email text,
  invitation_token_hash text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  invitation_id uuid;
  normalized_email text := lower(btrim(invite_email));
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'admin_invitation.issue', mutation_request_id
  );
  if replay.id is not null then return replay.target_entity_id; end if;

  actor_membership_id := private.current_event_membership_id(
    target_event_id, array['owner']
  );
  if actor_membership_id is null then raise exception 'event owner access required'; end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'valid invitation email is required';
  end if;
  if invitation_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'valid invitation token hash is required';
  end if;

  select * into target_event from public.events where id = target_event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event administration is read-only';
  end if;

  insert into public.event_admin_invitations (
    event_id, email, token_hash, invited_by_membership_id,
    request_id, expires_at, accepted_at, accepted_by_membership_id, revoked_at
  ) values (
    target_event_id, normalized_email, invitation_token_hash, actor_membership_id,
    mutation_request_id, now() + interval '7 days', null, null, null
  )
  on conflict (event_id, lower(email))
    where accepted_at is null and revoked_at is null
  do update set
    token_hash = excluded.token_hash,
    invited_by_membership_id = excluded.invited_by_membership_id,
    request_id = excluded.request_id,
    expires_at = excluded.expires_at,
    accepted_at = null,
    accepted_by_membership_id = null,
    revoked_at = null
  returning id into invitation_id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    target_event_id, actor, actor_membership_id, 'admin_invitation.issue',
    'event_admin_invitation', invitation_id,
    jsonb_build_object('email', normalized_email), mutation_request_id
  );
  return invitation_id;
end;
$$;

create or replace function public.revoke_event_admin_invitation(
  target_invitation_id uuid,
  revocation_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  invitation public.event_admin_invitations%rowtype;
  actor_membership_id uuid;
  replay public.event_audit_log%rowtype;
begin
  select * into invitation from public.event_admin_invitations
   where id = target_invitation_id for update;
  if not found then raise exception 'invitation not found'; end if;
  replay := private.claim_event_request(
    invitation.event_id, 'admin_invitation.revoke', mutation_request_id,
    target_invitation_id
  );
  if replay.id is not null then return target_invitation_id; end if;

  actor_membership_id := private.current_event_membership_id(
    invitation.event_id, array['owner']
  );
  if actor_membership_id is null then raise exception 'event owner access required'; end if;
  if invitation.accepted_at is not null then raise exception 'invitation was already accepted'; end if;
  if char_length(btrim(coalesce(revocation_reason, ''))) < 8 then
    raise exception 'revocation reason is required';
  end if;

  update public.event_admin_invitations set revoked_at = now()
   where id = target_invitation_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, reason, request_id
  ) values (
    invitation.event_id, actor, actor_membership_id, 'admin_invitation.revoke',
    'event_admin_invitation', target_invitation_id,
    btrim(revocation_reason), mutation_request_id
  );
  return target_invitation_id;
end;
$$;

create or replace function public.accept_event_admin_invitation(
  invitation_token_hash text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  actor_name text;
  invitation public.event_admin_invitations%rowtype;
  membership public.event_memberships%rowtype;
  owner_user_id uuid;
  admin_limit integer;
  replay public.event_audit_log%rowtype;
begin
  if actor is null then raise exception 'authentication required'; end if;
  if invitation_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invitation not found'; end if;

  select * into invitation from public.event_admin_invitations
   where token_hash = invitation_token_hash for update;
  if not found then raise exception 'invitation not found'; end if;

  replay := private.claim_event_request(
    invitation.event_id, 'admin_invitation.accept', mutation_request_id
  );
  if replay.id is not null then return replay.target_entity_id; end if;

  select lower(btrim(auth_users.email)), profiles.name
    into actor_email, actor_name
    from auth.users as auth_users
    join public.profiles on profiles.id = auth_users.id
   where auth_users.id = actor and auth_users.email_confirmed_at is not null;
  if not found or actor_email <> invitation.email then
    raise exception 'invitation email does not match the verified account';
  end if;
  if invitation.revoked_at is not null then raise exception 'invitation was revoked'; end if;
  if invitation.expires_at <= now() then raise exception 'invitation expired'; end if;
  if invitation.accepted_at is not null then raise exception 'invitation was already accepted'; end if;

  perform 1 from public.events
   where id = invitation.event_id and lifecycle <> 'archived' and suspended_at is null
   for update;
  if not found then raise exception 'event administration is read-only'; end if;

  select user_id into owner_user_id from public.event_memberships
   where event_id = invitation.event_id and role = 'owner' and status = 'active';
  select coalesce(overrides.event_admin_limit, 20) into admin_limit
    from (select owner_user_id as user_id) as owner
    left join public.platform_quota_overrides as overrides using (user_id);
  if (
    select count(*) from public.event_memberships
     where event_id = invitation.event_id and role = 'admin' and status = 'active'
  ) >= admin_limit then
    raise exception 'event admin limit reached';
  end if;

  select * into membership from public.event_memberships
   where event_id = invitation.event_id and user_id = actor for update;
  if found and membership.status = 'blocked' then raise exception 'membership is blocked'; end if;
  if found and membership.role = 'owner' then raise exception 'event owner cannot accept an admin invitation'; end if;

  if not found then
    insert into public.event_memberships (
      event_id, user_id, role, status, display_name_snapshot, email_snapshot
    ) values (
      invitation.event_id, actor, 'admin', 'active', actor_name, actor_email
    ) returning * into membership;
  else
    update public.event_memberships
       set role = 'admin', status = 'active', ended_at = null, joined_at = now(),
           display_name_snapshot = actor_name, email_snapshot = actor_email
     where id = membership.id returning * into membership;
  end if;

  update public.event_admin_invitations
     set accepted_at = now(), accepted_by_membership_id = membership.id
   where id = invitation.id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    invitation.event_id, actor, membership.id, 'admin_invitation.accept',
    'event_membership', membership.id,
    jsonb_build_object('invitation_id', invitation.id), mutation_request_id
  );
  return membership.id;
end;
$$;

create or replace function public.transfer_event_ownership(
  target_event_id uuid,
  next_owner_membership_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  next_owner public.event_memberships%rowtype;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'ownership.transfer', mutation_request_id,
    next_owner_membership_id
  );
  if replay.id is not null then return target_event_id; end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event administration is read-only';
  end if;
  actor_membership_id := private.current_event_membership_id(
    target_event_id, array['owner']
  );
  if actor_membership_id is null then raise exception 'event owner access required'; end if;

  perform 1 from public.event_memberships
   where event_id = target_event_id
     and id in (actor_membership_id, next_owner_membership_id)
   order by id for update;
  select * into next_owner from public.event_memberships
   where event_id = target_event_id and id = next_owner_membership_id;
  if not found or next_owner.role <> 'admin' or next_owner.status <> 'active' then
    raise exception 'next owner must be an active event admin';
  end if;

  update public.event_memberships set role = 'admin'
   where id = actor_membership_id;
  update public.event_memberships set role = 'owner'
   where id = next_owner_membership_id;

  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, details, request_id
  ) values (
    target_event_id, actor, actor_membership_id, 'ownership.transfer',
    'event_membership', next_owner_membership_id,
    jsonb_build_object('previous_owner_membership_id', actor_membership_id),
    mutation_request_id
  );
  return target_event_id;
end;
$$;

create or replace function public.publish_event(
  target_event_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'event.publish', mutation_request_id, target_event_id
  );
  if replay.id is not null then return target_event_id; end if;
  actor_membership_id := private.current_event_membership_id(target_event_id, array['owner']);
  if actor_membership_id is null then raise exception 'event owner access required'; end if;

  select * into target_event from public.events where id = target_event_id for update;
  if target_event.suspended_at is not null then raise exception 'event is suspended'; end if;
  if target_event.lifecycle <> 'draft' then raise exception 'only draft events can be published'; end if;
  if coalesce(btrim(target_event.name), '') = ''
     or coalesce(btrim(target_event.slug), '') = ''
     or coalesce(btrim(target_event.timezone), '') = ''
     or not exists (
       select 1 from pg_catalog.pg_timezone_names
        where name = target_event.timezone
     )
     or target_event.ends_at <= target_event.starts_at then
    raise exception 'event setup is incomplete';
  end if;

  update public.events
     set lifecycle = 'published', ever_published = true,
         published_at = coalesce(published_at, now()), archived_at = null
   where id = target_event_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, request_id
  ) values (
    target_event_id, actor, actor_membership_id, 'event.publish',
    'event', target_event_id, mutation_request_id
  );
  return target_event_id;
end;
$$;

create or replace function public.archive_event(
  target_event_id uuid,
  archive_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(
    target_event_id, 'event.archive', mutation_request_id, target_event_id
  );
  if replay.id is not null then return target_event_id; end if;
  actor_membership_id := private.current_event_membership_id(target_event_id, array['owner']);
  if actor_membership_id is null then raise exception 'event owner access required'; end if;
  if char_length(btrim(coalesce(archive_reason, ''))) < 8 then
    raise exception 'archive reason is required';
  end if;

  select * into target_event from public.events where id = target_event_id for update;
  if target_event.suspended_at is not null then raise exception 'event is suspended'; end if;
  if target_event.lifecycle = 'archived' then raise exception 'event is already archived'; end if;

  update public.events set lifecycle = 'archived', archived_at = now()
   where id = target_event_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action,
    target_entity_type, target_entity_id, reason, request_id
  ) values (
    target_event_id, actor, actor_membership_id, 'event.archive',
    'event', target_event_id, btrim(archive_reason), mutation_request_id
  );
  return target_event_id;
end;
$$;

create or replace function public.delete_untouched_draft_event(
  target_event_id uuid,
  deletion_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_membership_id uuid;
  target_event public.events%rowtype;
  existing_audit public.platform_audit_log%rowtype;
begin
  if actor is null then raise exception 'authentication required'; end if;
  if mutation_request_id is null then raise exception 'request id is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));

  select * into existing_audit from public.platform_audit_log
   where request_id = mutation_request_id;
  if found then
    if existing_audit.actor_user_id = actor
       and existing_audit.action = 'event.delete_draft'
       and existing_audit.details ->> 'deleted_event_id' = target_event_id::text then
      return target_event_id;
    end if;
    raise exception 'request id was already used for another mutation';
  end if;
  if exists (select 1 from public.event_audit_log where request_id = mutation_request_id) then
    raise exception 'request id was already used for another mutation';
  end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  actor_membership_id := private.current_event_membership_id(target_event_id, array['owner']);
  if actor_membership_id is null then raise exception 'event owner access required'; end if;
  if char_length(btrim(coalesce(deletion_reason, ''))) < 8 then
    raise exception 'deletion reason is required';
  end if;
  if target_event.lifecycle <> 'draft' or target_event.ever_published then
    raise exception 'only untouched drafts can be deleted';
  end if;
  if exists (select 1 from public.sessions where event_id = target_event_id)
     or exists (
       select 1 from public.event_memberships
        where event_id = target_event_id and id <> actor_membership_id
     )
     or exists (select 1 from public.event_admin_invitations where event_id = target_event_id)
     or exists (select 1 from public.event_audit_log where event_id = target_event_id) then
    raise exception 'draft has activity and must be archived';
  end if;

  insert into public.platform_audit_log (
    actor_user_id, action, details, request_id
  ) values (
    actor, 'event.delete_draft',
    jsonb_build_object(
      'deleted_event_id', target_event_id,
      'name', target_event.name,
      'reason', btrim(deletion_reason)
    ),
    mutation_request_id
  );
  delete from public.events where id = target_event_id;
  return target_event_id;
end;
$$;

create or replace function public.set_event_suspension(
  target_event_id uuid,
  should_suspend boolean,
  suspension_note text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  action_name text := case when should_suspend then 'event.suspend' else 'event.unsuspend' end;
  replay public.platform_audit_log%rowtype;
begin
  replay := private.claim_platform_request(action_name, mutation_request_id, target_event_id);
  if replay.id is not null then return target_event_id; end if;
  if should_suspend and char_length(btrim(coalesce(suspension_note, ''))) < 8 then
    raise exception 'suspension reason is required';
  end if;

  perform 1 from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  update public.events
     set suspended_at = case when should_suspend then now() else null end,
         suspended_by = case when should_suspend then actor else null end,
         suspension_reason = case when should_suspend then btrim(suspension_note) else null end
   where id = target_event_id;
  insert into public.platform_audit_log (
    actor_user_id, event_id, action, details, request_id
  ) values (
    actor, target_event_id, action_name,
    jsonb_build_object('reason', nullif(btrim(coalesce(suspension_note, '')), '')),
    mutation_request_id
  );
  return target_event_id;
end;
$$;

create or replace function public.start_event_support_session(
  target_event_id uuid,
  support_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  support_session_id uuid;
  replay public.platform_audit_log%rowtype;
begin
  replay := private.claim_platform_request(
    'support_session.start', mutation_request_id, target_event_id
  );
  if replay.id is not null then
    return (replay.details ->> 'support_session_id')::uuid;
  end if;
  if char_length(btrim(coalesce(support_reason, ''))) < 8 then
    raise exception 'support reason is required';
  end if;
  if not exists (select 1 from public.events where id = target_event_id) then
    raise exception 'event not found';
  end if;

  insert into public.platform_support_sessions (
    super_admin_user_id, event_id, reason, expires_at
  ) values (
    actor, target_event_id, btrim(support_reason), now() + interval '60 minutes'
  ) returning id into support_session_id;
  insert into public.platform_audit_log (
    actor_user_id, event_id, action, details, request_id
  ) values (
    actor, target_event_id, 'support_session.start',
    jsonb_build_object(
      'support_session_id', support_session_id,
      'reason', btrim(support_reason),
      'expires_in_minutes', 60
    ),
    mutation_request_id
  );
  return support_session_id;
end;
$$;

create or replace function public.end_event_support_session(
  target_support_session_id uuid,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  support_session public.platform_support_sessions%rowtype;
  replay public.platform_audit_log%rowtype;
begin
  select * into support_session from public.platform_support_sessions
   where id = target_support_session_id for update;
  if not found then raise exception 'support session not found'; end if;
  replay := private.claim_platform_request(
    'support_session.end', mutation_request_id, support_session.event_id
  );
  if replay.id is not null then return target_support_session_id; end if;
  if support_session.super_admin_user_id <> actor then
    raise exception 'support session belongs to another super admin';
  end if;
  if support_session.ended_at is null then
    update public.platform_support_sessions set ended_at = now()
     where id = target_support_session_id;
  end if;
  insert into public.platform_audit_log (
    actor_user_id, event_id, action, details, request_id
  ) values (
    actor, support_session.event_id, 'support_session.end',
    jsonb_build_object('support_session_id', target_support_session_id),
    mutation_request_id
  );
  return target_support_session_id;
end;
$$;

revoke all on function public.join_event(uuid, uuid) from public, anon;
revoke all on function public.leave_event(uuid, uuid) from public, anon;
revoke all on function public.moderate_event_attendee(uuid, text, text, uuid) from public, anon;
revoke all on function public.remove_event_admin(uuid, text, uuid) from public, anon;
revoke all on function public.issue_event_admin_invitation(uuid, text, text, uuid) from public, anon;
revoke all on function public.revoke_event_admin_invitation(uuid, text, uuid) from public, anon;
revoke all on function public.accept_event_admin_invitation(text, uuid) from public, anon;
revoke all on function public.transfer_event_ownership(uuid, uuid, uuid) from public, anon;
revoke all on function public.publish_event(uuid, uuid) from public, anon;
revoke all on function public.archive_event(uuid, text, uuid) from public, anon;
revoke all on function public.delete_untouched_draft_event(uuid, text, uuid) from public, anon;
revoke all on function public.set_event_suspension(uuid, boolean, text, uuid) from public, anon;
revoke all on function public.start_event_support_session(uuid, text, uuid) from public, anon;
revoke all on function public.end_event_support_session(uuid, uuid) from public, anon;

grant execute on function public.join_event(uuid, uuid) to authenticated;
grant execute on function public.leave_event(uuid, uuid) to authenticated;
grant execute on function public.moderate_event_attendee(uuid, text, text, uuid) to authenticated;
grant execute on function public.remove_event_admin(uuid, text, uuid) to authenticated;
grant execute on function public.issue_event_admin_invitation(uuid, text, text, uuid) to authenticated;
grant execute on function public.revoke_event_admin_invitation(uuid, text, uuid) to authenticated;
grant execute on function public.accept_event_admin_invitation(text, uuid) to authenticated;
grant execute on function public.transfer_event_ownership(uuid, uuid, uuid) to authenticated;
grant execute on function public.publish_event(uuid, uuid) to authenticated;
grant execute on function public.archive_event(uuid, text, uuid) to authenticated;
grant execute on function public.delete_untouched_draft_event(uuid, text, uuid) to authenticated;
grant execute on function public.set_event_suspension(uuid, boolean, text, uuid) to authenticated;
grant execute on function public.start_event_support_session(uuid, text, uuid) to authenticated;
grant execute on function public.end_event_support_session(uuid, uuid) to authenticated;

commit;
