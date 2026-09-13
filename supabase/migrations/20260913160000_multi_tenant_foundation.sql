-- Multi-tenant foundation. This migration is additive so the legacy routes can
-- continue operating while the new route tree is disabled.

begin;

alter table public.events
  add column slug text,
  add column description text,
  add column timezone text not null default 'Asia/Manila',
  add column lifecycle text not null default 'published',
  add column ever_published boolean not null default true,
  add column published_at timestamptz,
  add column archived_at timestamptz,
  add column suspended_at timestamptz,
  add column suspended_by uuid references auth.users (id) on delete set null,
  add column suspension_reason text,
  add column theme_preset text not null default 'daylight',
  add column accent_color text not null default '#2563EB',
  add column logo_path text,
  add column cover_path text,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

update public.events
   set slug = case
         when name = 'AWS Student Community Day Mega Manila 2026'
           then 'aws-student-community-day-mega-manila-2026'
         else 'legacy-' || replace(id::text, '-', '')
       end,
       lifecycle = case when status = 'ended' then 'archived' else 'published' end,
       published_at = coalesce(published_at, starts_at),
       archived_at = case
         when status = 'ended' then coalesce(archived_at, ends_at)
         else archived_at
       end,
       theme_preset = case
         when name = 'AWS Student Community Day Mega Manila 2026' then 'legacy_aws'
         else 'daylight'
       end,
       accent_color = case
         when name = 'AWS Student Community Day Mega Manila 2026' then '#00A6A6'
         else '#2563EB'
       end;

alter table public.events
  alter column slug set not null,
  add constraint events_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 80
  ),
  add constraint events_timezone_nonempty check (char_length(btrim(timezone)) > 0),
  add constraint events_lifecycle_check check (
    lifecycle in ('draft', 'published', 'archived')
  ),
  add constraint events_theme_preset_check check (
    theme_preset in ('daylight', 'midnight', 'festival', 'legacy_aws')
  ),
  add constraint events_accent_color_check check (
    accent_color ~ '^#[0-9A-F]{6}$'
  ),
  add constraint events_suspension_fields_check check (
    (suspended_at is null and suspension_reason is null)
    or (
      suspended_at is not null
      and char_length(btrim(suspension_reason)) between 1 and 1000
    )
  ),
  add constraint events_archive_fields_check check (
    (lifecycle = 'archived' and archived_at is not null)
    or (lifecycle <> 'archived' and archived_at is null)
  );

create unique index events_slug_lower_unique_idx on public.events (lower(slug));
create index events_lifecycle_dates_idx
  on public.events (lifecycle, starts_at, ends_at)
  where suspended_at is null;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_memberships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  role text not null check (role in ('owner', 'admin', 'attendee')),
  status text not null default 'active'
    check (status in ('active', 'left', 'removed', 'blocked')),
  display_name_snapshot text not null default '',
  email_snapshot text,
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_memberships_event_id_id_unique unique (event_id, id),
  constraint event_memberships_event_user_unique unique (event_id, user_id),
  constraint event_memberships_email_snapshot_check check (
    email_snapshot is null or email_snapshot = lower(btrim(email_snapshot))
  ),
  constraint event_memberships_status_dates_check check (
    (status = 'active' and ended_at is null)
    or (status <> 'active' and ended_at is not null)
  )
);

create unique index event_memberships_one_active_owner_idx
  on public.event_memberships (event_id)
  where role = 'owner' and status = 'active';
create index event_memberships_user_status_idx
  on public.event_memberships (user_id, status, event_id)
  where user_id is not null;
create index event_memberships_event_role_status_idx
  on public.event_memberships (event_id, role, status);

create trigger event_memberships_set_updated_at
  before update on public.event_memberships
  for each row execute function public.set_updated_at();

create table public.event_admin_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  invited_by_membership_id uuid not null,
  request_id uuid not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by_membership_id uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_admin_invitations_inviter_fkey
    foreign key (event_id, invited_by_membership_id)
    references public.event_memberships (event_id, id) on delete restrict,
  constraint event_admin_invitations_acceptor_fkey
    foreign key (event_id, accepted_by_membership_id)
    references public.event_memberships (event_id, id) on delete restrict,
  constraint event_admin_invitations_request_unique unique (event_id, request_id),
  constraint event_admin_invitations_email_check check (
    email = lower(btrim(email)) and char_length(email) between 3 and 320
  ),
  constraint event_admin_invitations_expiry_check check (expires_at > created_at),
  constraint event_admin_invitations_terminal_state_check check (
    not (accepted_at is not null and revoked_at is not null)
  )
);

create unique index event_admin_invitations_pending_email_idx
  on public.event_admin_invitations (event_id, lower(email))
  where accepted_at is null and revoked_at is null;
create index event_admin_invitations_expiry_idx
  on public.event_admin_invitations (expires_at)
  where accepted_at is null and revoked_at is null;

create trigger event_admin_invitations_set_updated_at
  before update on public.event_admin_invitations
  for each row execute function public.set_updated_at();

create table public.platform_super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint platform_super_admins_active_dates_check check (
    (is_active and deactivated_at is null)
    or (not is_active and deactivated_at is not null)
  )
);

create table public.platform_quota_overrides (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_event_limit integer check (active_event_limit between 0 and 1000),
  event_admin_limit integer check (event_admin_limit between 1 and 1000),
  event_session_limit integer check (event_session_limit between 1 and 10000),
  branding_upload_bytes bigint check (
    branding_upload_bytes between 1048576 and 104857600
  ),
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  updated_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.platform_support_sessions (
  id uuid primary key default gen_random_uuid(),
  super_admin_user_id uuid not null
    references public.platform_super_admins (user_id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 8 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  constraint platform_support_sessions_expiry_check check (
    expires_at > created_at and expires_at <= created_at + interval '60 minutes'
  ),
  constraint platform_support_sessions_end_check check (
    ended_at is null or ended_at >= created_at
  )
);

create index platform_support_sessions_active_idx
  on public.platform_support_sessions (super_admin_user_id, expires_at)
  where ended_at is null;

create table public.platform_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 120),
  details jsonb not null default '{}'::jsonb,
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index platform_audit_log_event_created_idx
  on public.platform_audit_log (event_id, created_at desc);
create index platform_audit_log_actor_created_idx
  on public.platform_audit_log (actor_user_id, created_at desc);

create trigger platform_audit_log_immutable
  before update or delete on public.platform_audit_log
  for each row execute function public.prevent_admin_audit_changes();

alter table public.event_memberships enable row level security;
alter table public.event_admin_invitations enable row level security;
alter table public.platform_super_admins enable row level security;
alter table public.platform_quota_overrides enable row level security;
alter table public.platform_support_sessions enable row level security;
alter table public.platform_audit_log enable row level security;

create or replace function private.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.platform_super_admins
     where user_id = (select auth.uid())
       and is_active
  );
$$;

create or replace function private.has_event_role(
  target_event_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.event_memberships
     where event_id = target_event_id
       and user_id = (select auth.uid())
       and status = 'active'
       and role = any(allowed_roles)
  );
$$;

revoke all on function private.is_platform_super_admin() from public, anon;
revoke all on function private.has_event_role(uuid, text[]) from public, anon;
grant execute on function private.is_platform_super_admin() to authenticated;
grant execute on function private.has_event_role(uuid, text[]) to authenticated;

create policy "Users and event staff can view memberships"
  on public.event_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_event_role(event_id, array['owner', 'admin']))
    or (select private.is_platform_super_admin())
  );

create policy "Event staff can view admin invitations"
  on public.event_admin_invitations for select to authenticated
  using (
    (select private.has_event_role(event_id, array['owner', 'admin']))
    or (select private.is_platform_super_admin())
  );

create policy "Super admins can view own assignment"
  on public.platform_super_admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_platform_super_admin()));

create policy "Users and super admins can view quota overrides"
  on public.platform_quota_overrides for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_platform_super_admin()));

create policy "Super admins can view support sessions"
  on public.platform_support_sessions for select to authenticated
  using ((select private.is_platform_super_admin()));

create policy "Super admins can view platform audit"
  on public.platform_audit_log for select to authenticated
  using ((select private.is_platform_super_admin()));

revoke all on table public.event_memberships from public, anon, authenticated;
revoke all on table public.event_admin_invitations from public, anon, authenticated;
revoke all on table public.platform_super_admins from public, anon, authenticated;
revoke all on table public.platform_quota_overrides from public, anon, authenticated;
revoke all on table public.platform_support_sessions from public, anon, authenticated;
revoke all on table public.platform_audit_log from public, anon, authenticated;

grant select on table public.event_memberships to authenticated;
grant select on table public.event_admin_invitations to authenticated;
grant select on table public.platform_super_admins to authenticated;
grant select on table public.platform_quota_overrides to authenticated;
grant select on table public.platform_support_sessions to authenticated;
grant select on table public.platform_audit_log to authenticated;

-- Mirror the legacy global allowlist into the first platform/event roles. This
-- intentionally keeps admin_users intact until the legacy routes are retired.
insert into public.platform_super_admins (user_id, created_by)
select admin_users.user_id,
       case when creator.id is null then null else admin_users.created_by end
  from public.admin_users
  left join auth.users as creator on creator.id = admin_users.created_by
on conflict (user_id) do nothing;

insert into public.event_memberships (
  event_id,
  user_id,
  role,
  status,
  display_name_snapshot,
  email_snapshot
)
select events.id,
       owner_user.user_id,
       'owner',
       'active',
       coalesce(profiles.name, ''),
       lower(btrim(auth_users.email))
  from public.events as events
 cross join lateral (
   select admin_users.user_id
     from public.admin_users
    order by admin_users.created_at, admin_users.user_id
    limit 1
 ) as owner_user
  left join public.profiles as profiles on profiles.id = owner_user.user_id
  left join auth.users as auth_users on auth_users.id = owner_user.user_id
on conflict (event_id, user_id) do nothing;

insert into public.event_memberships (
  event_id,
  user_id,
  role,
  status,
  display_name_snapshot,
  email_snapshot
)
select events.id,
       profiles.id,
       case when admin_users.user_id is null then 'attendee' else 'admin' end,
       'active',
       profiles.name,
       lower(btrim(auth_users.email))
  from public.events as events
 cross join public.profiles as profiles
  left join public.admin_users as admin_users on admin_users.user_id = profiles.id
  left join auth.users as auth_users on auth_users.id = profiles.id
 where not exists (
   select 1
     from public.event_memberships as memberships
    where memberships.event_id = events.id
      and memberships.user_id = profiles.id
 )
on conflict (event_id, user_id) do nothing;

-- Unknown merchandise tables exist on the linked project but are not part of
-- Sync's product model. Quarantine client access without deleting their data.
do $$
declare
  merch_function regprocedure;
begin
  if to_regclass('public.merch_attendees') is not null then
    execute 'revoke all on table public.merch_attendees from anon, authenticated';
  end if;
  if to_regclass('public.merch_scan_log') is not null then
    execute 'revoke all on table public.merch_scan_log from anon, authenticated';
  end if;

  for merch_function in
    select pg_proc.oid::regprocedure
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname like 'merch\_%' escape '\'
  loop
    execute format(
      'revoke all on function %s from anon, authenticated',
      merch_function
    );
  end loop;
end;
$$;

commit;
