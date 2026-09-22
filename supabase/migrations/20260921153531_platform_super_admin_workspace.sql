-- Platform operations workspace. Read APIs expose deliberately narrow DTOs;
-- event attendee identity remains gated by an active support session.
begin;

create or replace function private.require_platform_super_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null or not (select private.is_platform_super_admin()) then
    raise exception 'super admin access required';
  end if;
  return actor;
end;
$$;

revoke all on function private.require_platform_super_admin() from public, anon, authenticated;

create index if not exists events_updated_id_idx
  on public.events (updated_at desc, id desc);
create index if not exists profiles_created_id_idx
  on public.profiles (created_at desc, id desc);

create or replace function public.platform_super_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_super_admin();
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'events', (select count(*) from public.events),
    'draft_events', (select count(*) from public.events where lifecycle = 'draft'),
    'published_events', (select count(*) from public.events where lifecycle = 'published'),
    'archived_events', (select count(*) from public.events where lifecycle = 'archived'),
    'suspended_events', (select count(*) from public.events where suspended_at is not null),
    'active_support_sessions', (
      select count(*) from public.platform_support_sessions
       where ended_at is null and expires_at > now()
    ),
    'feedback_last_7_days', (
      select count(*) from public.app_feedback where created_at >= now() - interval '7 days'
    ),
    'failed_invitation_emails_last_24_hours', (
      select count(*) from public.event_admin_invitation_email_deliveries
       where created_at >= now() - interval '24 hours' and status = 'failed'
    )
  );
end;
$$;

create or replace function public.platform_super_admin_list_events(
  search_query text default '',
  lifecycle_filter text default null,
  suspended_filter boolean default null,
  cursor_updated_at timestamptz default null,
  cursor_id uuid default null,
  result_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_super_admin();
  if lifecycle_filter is not null and lifecycle_filter not in ('draft','published','archived') then
    raise exception 'invalid lifecycle filter';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(rows) order by rows.updated_at desc, rows.id desc)
    from (
      select e.id, e.slug, e.name, e.lifecycle, e.starts_at, e.ends_at,
             e.timezone, e.venue, e.suspended_at, e.suspension_reason,
             e.updated_at, owner.user_id as owner_user_id,
             coalesce(owner.display_name_snapshot, '') as owner_name,
             owner.email_snapshot as owner_email,
             count(m.id) filter (where m.status = 'active') as active_members,
             count(m.id) filter (where m.status = 'active' and m.role = 'admin') as active_admins,
             (select count(*) from public.sessions s where s.event_id = e.id) as sessions
        from public.events e
        left join public.event_memberships owner
          on owner.event_id = e.id and owner.role = 'owner' and owner.status = 'active'
        left join public.event_memberships m on m.event_id = e.id
       where (nullif(btrim(search_query), '') is null
              or e.name ilike '%' || btrim(search_query) || '%'
              or e.slug ilike '%' || btrim(search_query) || '%')
         and (lifecycle_filter is null or e.lifecycle = lifecycle_filter)
         and (suspended_filter is null or (e.suspended_at is not null) = suspended_filter)
         and (cursor_updated_at is null or cursor_id is null
              or (e.updated_at, e.id) < (cursor_updated_at, cursor_id))
       group by e.id, owner.user_id, owner.display_name_snapshot, owner.email_snapshot
       order by e.updated_at desc, e.id desc
       limit least(greatest(result_limit, 1), 100)
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.platform_super_admin_event(target_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  perform private.require_platform_super_admin();
  select to_jsonb(row_data) into result from (
    select e.id, e.slug, e.name, e.description, e.lifecycle, e.starts_at, e.ends_at,
           e.timezone, e.venue, e.created_at, e.updated_at, e.suspended_at,
           e.suspension_reason, owner.user_id as owner_user_id,
           coalesce(owner.display_name_snapshot, '') as owner_name,
           owner.email_snapshot as owner_email,
           count(m.id) filter (where m.status = 'active') as active_members,
           count(m.id) filter (where m.status = 'active' and m.role = 'attendee') as active_attendees,
           count(m.id) filter (where m.status = 'active' and m.role = 'admin') as active_admins,
           (select count(*) from public.sessions s where s.event_id = e.id) as sessions,
           (select count(*) from public.speakers_sponsors sp where sp.event_id = e.id) as speakers,
           q.active_event_limit, q.event_admin_limit, q.event_session_limit,
           q.branding_upload_bytes, q.reason as quota_reason, q.updated_at as quota_updated_at,
           support.id as active_support_session_id,
           support.expires_at as active_support_expires_at
      from public.events e
      left join public.event_memberships owner
        on owner.event_id = e.id and owner.role = 'owner' and owner.status = 'active'
      left join public.event_memberships m on m.event_id = e.id
      left join public.platform_quota_overrides q on q.user_id = owner.user_id
      left join lateral (
        select ps.id, ps.expires_at from public.platform_support_sessions ps
         where ps.event_id = e.id
           and ps.super_admin_user_id = (select auth.uid())
           and ps.ended_at is null and ps.expires_at > now()
         order by ps.created_at desc limit 1
      ) support on true
     where e.id = target_event_id
     group by e.id, owner.user_id, owner.display_name_snapshot, owner.email_snapshot,
              q.user_id, support.id, support.expires_at
  ) row_data;
  return result;
end;
$$;

create or replace function public.platform_super_admin_list_users(
  search_query text default '',
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  result_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_super_admin();
  return coalesce((select jsonb_agg(to_jsonb(rows) order by rows.created_at desc, rows.id desc) from (
    select p.id, p.name, p.photo_url, lower(btrim(u.email)) as email,
           (u.email_confirmed_at is not null) as email_verified, p.created_at,
           count(m.id) filter (where m.status = 'active') as active_event_count,
           count(m.id) filter (where m.status = 'active' and m.role = 'owner') as owned_event_count,
           count(m.id) filter (where m.status = 'active' and m.role = 'admin') as administered_event_count,
           count(m.id) filter (where m.status = 'active' and m.role = 'attendee') as attended_event_count,
           (sa.user_id is not null and sa.is_active) as is_super_admin,
           q.active_event_limit, q.event_admin_limit, q.event_session_limit,
           q.branding_upload_bytes, q.reason as quota_reason, q.updated_at as quota_updated_at
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.event_memberships m on m.user_id = p.id
      left join public.platform_super_admins sa on sa.user_id = p.id
      left join public.platform_quota_overrides q on q.user_id = p.id
     where (nullif(btrim(search_query), '') is null
            or p.name ilike '%' || btrim(search_query) || '%'
            or u.email ilike '%' || btrim(search_query) || '%')
       and (cursor_created_at is null or cursor_id is null
            or (p.created_at, p.id) < (cursor_created_at, cursor_id))
     group by p.id, u.email, u.email_confirmed_at, sa.user_id, sa.is_active, q.user_id
     order by p.created_at desc, p.id desc
     limit least(greatest(result_limit, 1), 100)
  ) rows), '[]'::jsonb);
end;
$$;

create or replace function public.platform_super_admin_user(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  perform private.require_platform_super_admin();
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'photo_url', p.photo_url,
    'email', lower(btrim(u.email)), 'email_verified', u.email_confirmed_at is not null,
    'created_at', p.created_at,
    'is_super_admin', coalesce(sa.is_active, false),
    'active_event_count', count(m.id) filter (where m.status = 'active'),
    'owned_event_count', count(m.id) filter (where m.status = 'active' and m.role = 'owner'),
    'administered_event_count', count(m.id) filter (where m.status = 'active' and m.role = 'admin'),
    'attended_event_count', count(m.id) filter (where m.status = 'active' and m.role = 'attendee'),
    'active_event_limit', q.active_event_limit, 'event_admin_limit', q.event_admin_limit,
    'event_session_limit', q.event_session_limit, 'branding_upload_bytes', q.branding_upload_bytes,
    'quota_reason', q.reason, 'quota_updated_at', q.updated_at
  ) into result
    from public.profiles p join auth.users u on u.id = p.id
    left join public.event_memberships m on m.user_id = p.id
    left join public.platform_super_admins sa on sa.user_id = p.id
    left join public.platform_quota_overrides q on q.user_id = p.id
   where p.id = target_user_id
   group by p.id, u.email, u.email_confirmed_at, sa.is_active, q.user_id;
  return result;
end;
$$;

create or replace function public.platform_super_admin_list_feedback(
  category_filter text default null,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  result_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_super_admin();
  if category_filter is not null and category_filter not in ('bug','usability','idea') then
    raise exception 'invalid feedback category';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(rows) order by rows.created_at desc, rows.id desc) from (
    select f.id, f.category, f.message, f.created_at, f.user_id,
           p.name as user_name, p.photo_url as user_photo_url
      from public.app_feedback f join public.profiles p on p.id = f.user_id
     where (category_filter is null or f.category = category_filter)
       and (cursor_created_at is null or cursor_id is null
            or (f.created_at, f.id) < (cursor_created_at, cursor_id))
     order by f.created_at desc, f.id desc
     limit least(greatest(result_limit, 1), 100)
  ) rows), '[]'::jsonb);
end;
$$;

create or replace function public.platform_super_admin_list_audit(
  cursor_id bigint default null,
  result_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_super_admin();
  return coalesce((select jsonb_agg(to_jsonb(rows) order by rows.id desc) from (
    select a.id, a.action, a.details, a.created_at, a.actor_user_id,
           coalesce(p.name, '') as actor_name, a.event_id, e.name as event_name
      from public.platform_audit_log a
      left join public.profiles p on p.id = a.actor_user_id
      left join public.events e on e.id = a.event_id
     where cursor_id is null or a.id < cursor_id
     order by a.id desc
     limit least(greatest(result_limit, 1), 100)
  ) rows), '[]'::jsonb);
end;
$$;

create or replace function public.platform_super_admin_list_attendees(
  target_event_id uuid,
  search_query text default '',
  status_filter text default null,
  cursor_joined_at timestamptz default null,
  cursor_id uuid default null,
  result_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_platform_super_admin();
  if not private.has_event_support_access(target_event_id) then
    raise exception 'active support session required';
  end if;
  if status_filter is not null and status_filter not in ('active','left','removed','blocked') then
    raise exception 'invalid membership status';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(rows) order by rows.joined_at desc, rows.id desc) from (
    select m.id, m.user_id, m.display_name_snapshot as name, m.email_snapshot as email,
           m.status, m.joined_at, m.ended_at
      from public.event_memberships m
     where m.event_id = target_event_id and m.role = 'attendee'
       and (status_filter is null or m.status = status_filter)
       and (nullif(btrim(search_query), '') is null
            or m.display_name_snapshot ilike '%' || btrim(search_query) || '%'
            or m.email_snapshot ilike '%' || btrim(search_query) || '%')
       and (cursor_joined_at is null or cursor_id is null
            or (m.joined_at, m.id) < (cursor_joined_at, cursor_id))
     order by m.joined_at desc, m.id desc
     limit least(greatest(result_limit, 1), 100)
  ) rows), '[]'::jsonb);
end;
$$;

create or replace function public.set_platform_quota_override(
  target_user_id uuid,
  next_active_event_limit integer,
  next_event_admin_limit integer,
  next_event_session_limit integer,
  next_branding_upload_bytes bigint,
  change_reason text,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  action_name text := case when next_active_event_limit is null and next_event_admin_limit is null
    and next_event_session_limit is null and next_branding_upload_bytes is null
    then 'quota_override.clear' else 'quota_override.set' end;
  replay public.platform_audit_log%rowtype;
begin
  replay := private.claim_platform_request(action_name, mutation_request_id, null);
  if replay.id is not null then
    if replay.details ->> 'target_user_id' <> target_user_id::text then
      raise exception 'request id was already used for another mutation';
    end if;
    return target_user_id;
  end if;
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'user not found';
  end if;
  if char_length(btrim(coalesce(change_reason, ''))) < 8 then
    raise exception 'quota reason is required';
  end if;
  if next_active_event_limit is not null and next_active_event_limit not between 0 and 1000
     or next_event_admin_limit is not null and next_event_admin_limit not between 1 and 1000
     or next_event_session_limit is not null and next_event_session_limit not between 1 and 10000
     or next_branding_upload_bytes is not null and next_branding_upload_bytes not between 1048576 and 52428800 then
    raise exception 'invalid quota value';
  end if;

  if action_name = 'quota_override.clear' then
    delete from public.platform_quota_overrides where user_id = target_user_id;
  else
    insert into public.platform_quota_overrides (
      user_id, active_event_limit, event_admin_limit, event_session_limit,
      branding_upload_bytes, reason, updated_by, updated_at
    ) values (
      target_user_id, next_active_event_limit, next_event_admin_limit,
      next_event_session_limit, next_branding_upload_bytes,
      btrim(change_reason), actor, now()
    ) on conflict (user_id) do update set
      active_event_limit = excluded.active_event_limit,
      event_admin_limit = excluded.event_admin_limit,
      event_session_limit = excluded.event_session_limit,
      branding_upload_bytes = excluded.branding_upload_bytes,
      reason = excluded.reason, updated_by = excluded.updated_by, updated_at = now();
  end if;
  insert into public.platform_audit_log (actor_user_id, action, details, request_id)
  values (actor, action_name, jsonb_build_object(
    'target_user_id', target_user_id, 'reason', btrim(change_reason),
    'active_event_limit', next_active_event_limit, 'event_admin_limit', next_event_admin_limit,
    'event_session_limit', next_event_session_limit,
    'branding_upload_bytes', next_branding_upload_bytes
  ), mutation_request_id);
  return target_user_id;
end;
$$;

-- One operator may hold only one live tenant-support session at a time.
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
  replaced_session_ids uuid[];
  replay public.platform_audit_log%rowtype;
begin
  replay := private.claim_platform_request('support_session.start', mutation_request_id, target_event_id);
  if replay.id is not null then return (replay.details ->> 'support_session_id')::uuid; end if;
  if char_length(btrim(coalesce(support_reason, ''))) < 8 then raise exception 'support reason is required'; end if;
  if not exists (select 1 from public.events where id = target_event_id) then raise exception 'event not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 1));
  with ended as (
    update public.platform_support_sessions set ended_at = now()
     where super_admin_user_id = actor and ended_at is null and expires_at > now()
     returning id
  ) select coalesce(array_agg(id), array[]::uuid[]) into replaced_session_ids from ended;
  insert into public.platform_support_sessions (super_admin_user_id, event_id, reason, expires_at)
  values (actor, target_event_id, btrim(support_reason), now() + interval '60 minutes')
  returning id into support_session_id;
  insert into public.platform_audit_log (actor_user_id, event_id, action, details, request_id)
  values (actor, target_event_id, 'support_session.start', jsonb_build_object(
    'support_session_id', support_session_id, 'reason', btrim(support_reason),
    'expires_in_minutes', 60, 'replaced_support_session_ids', to_jsonb(replaced_session_ids)
  ), mutation_request_id);
  return support_session_id;
end;
$$;

create or replace function public.get_event_branding_upload_limit(target_event_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result bigint;
begin
  if not private.has_event_role(target_event_id, array['owner','admin']) then
    raise exception 'event staff access required';
  end if;
  select coalesce(q.branding_upload_bytes, 10485760) into result
    from public.event_memberships owner
    left join public.platform_quota_overrides q on q.user_id = owner.user_id
   where owner.event_id = target_event_id and owner.role = 'owner' and owner.status = 'active';
  return coalesce(result, 10485760);
end;
$$;

update storage.buckets set file_size_limit = 52428800 where id = 'event-branding-staging';

create or replace function private.event_branding_object_within_quota(object_name text, object_metadata jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := pg_catalog.string_to_array(object_name, '/');
  target_event_id uuid;
  content_length bigint;
  allowed bigint;
begin
  begin target_event_id := parts[2]::uuid; exception when others then return false; end;
  begin content_length := coalesce(object_metadata ->> 'contentLength', object_metadata ->> 'size')::bigint;
  exception when others then return false; end;
  select coalesce(q.branding_upload_bytes, 10485760) into allowed
    from public.event_memberships owner
    left join public.platform_quota_overrides q on q.user_id = owner.user_id
   where owner.event_id = target_event_id and owner.role = 'owner' and owner.status = 'active';
  return content_length between 1 and least(coalesce(allowed, 10485760), 52428800);
end;
$$;
revoke all on function private.event_branding_object_within_quota(text,jsonb) from public, anon, authenticated;

drop policy "Event staff can insert branding staging objects" on storage.objects;
create policy "Event staff can insert branding staging objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-branding-staging'
    and (select private.can_manage_event_branding_object(name, 'staging'))
    and (select private.event_branding_object_within_quota(name, metadata))
  );

revoke all on function public.platform_super_admin_overview() from public, anon;
revoke all on function public.platform_super_admin_list_events(text,text,boolean,timestamptz,uuid,integer) from public, anon;
revoke all on function public.platform_super_admin_event(uuid) from public, anon;
revoke all on function public.platform_super_admin_list_users(text,timestamptz,uuid,integer) from public, anon;
revoke all on function public.platform_super_admin_user(uuid) from public, anon;
revoke all on function public.platform_super_admin_list_feedback(text,timestamptz,uuid,integer) from public, anon;
revoke all on function public.platform_super_admin_list_audit(bigint,integer) from public, anon;
revoke all on function public.platform_super_admin_list_attendees(uuid,text,text,timestamptz,uuid,integer) from public, anon;
revoke all on function public.set_platform_quota_override(uuid,integer,integer,integer,bigint,text,uuid) from public, anon;
revoke all on function public.get_event_branding_upload_limit(uuid) from public, anon;

grant execute on function public.platform_super_admin_overview() to authenticated;
grant execute on function public.platform_super_admin_list_events(text,text,boolean,timestamptz,uuid,integer) to authenticated;
grant execute on function public.platform_super_admin_event(uuid) to authenticated;
grant execute on function public.platform_super_admin_list_users(text,timestamptz,uuid,integer) to authenticated;
grant execute on function public.platform_super_admin_user(uuid) to authenticated;
grant execute on function public.platform_super_admin_list_feedback(text,timestamptz,uuid,integer) to authenticated;
grant execute on function public.platform_super_admin_list_audit(bigint,integer) to authenticated;
grant execute on function public.platform_super_admin_list_attendees(uuid,text,text,timestamptz,uuid,integer) to authenticated;
grant execute on function public.set_platform_quota_override(uuid,integer,integer,integer,bigint,text,uuid) to authenticated;
grant execute on function public.get_event_branding_upload_limit(uuid) to authenticated;

commit;
