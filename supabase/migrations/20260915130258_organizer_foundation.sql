-- Organizer foundation: authenticated, audited event creation and basics.
begin;

alter table public.events
  add constraint events_name_length check (char_length(btrim(name)) between 1 and 160),
  add constraint events_description_length check (description is null or char_length(description) <= 4000),
  add constraint events_venue_length check (venue is null or char_length(venue) <= 240);

create or replace function private.validate_event_basics(
  event_name text, event_description text, event_venue text,
  event_timezone text, event_starts_at timestamptz, event_ends_at timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if event_name is null or char_length(btrim(event_name)) not between 1 and 160 then
    raise exception 'event name must be between 1 and 160 characters';
  end if;
  if char_length(coalesce(event_description, '')) > 4000
     or char_length(coalesce(event_venue, '')) > 240 then
    raise exception 'event description or venue is too long';
  end if;
  if event_timezone is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = event_timezone
  ) then raise exception 'valid event timezone is required'; end if;
  if event_starts_at is null or event_ends_at is null
     or not isfinite(event_starts_at) or not isfinite(event_ends_at)
     or event_ends_at <= event_starts_at then
    raise exception 'event end must be after start';
  end if;
end;
$$;
revoke all on function private.validate_event_basics(text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;

create or replace function private.protect_event_audit_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.action in ('event.create','event.update_basics')
     and exists (
       select 1 from public.platform_audit_log
        where action = 'event.delete_draft'
          and actor_user_id = (select auth.uid())
          and details ->> 'deleted_event_id' = old.event_id::text
     ) then return old; end if;
  raise exception 'admin audit entries are immutable';
end;
$$;
revoke all on function private.protect_event_audit_history() from public, anon, authenticated;
drop trigger event_audit_log_immutable on public.event_audit_log;
create trigger event_audit_log_immutable before update or delete on public.event_audit_log
  for each row execute function private.protect_event_audit_history();

create or replace function public.create_event(
  event_name text, event_slug text, event_description text, event_venue text,
  event_timezone text, event_starts_at timestamptz, event_ends_at timestamptz,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  created_event_id uuid;
  owner_membership_id uuid;
  actor_name text;
  actor_email text;
  active_limit integer;
  replay public.event_audit_log%rowtype;
begin
  if actor is null then raise exception 'authentication required'; end if;
  if mutation_request_id is null then raise exception 'request id is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));
  if exists (select 1 from public.platform_audit_log where request_id = mutation_request_id) then
    raise exception 'request id was already used for another mutation';
  end if;
  select * into replay from public.event_audit_log where request_id = mutation_request_id;
  if found then
    if replay.actor_user_id = actor and replay.action = 'event.create' then
      return replay.event_id;
    end if;
    raise exception 'request id was already used for another mutation';
  end if;
  -- Deleted drafts retain their creation request in the platform tombstone.
  if exists (
    select 1 from public.platform_audit_log
     where action = 'event.delete_draft'
       and details ->> 'creation_request_id' = mutation_request_id::text
  ) then raise exception 'created draft was deleted'; end if;

  perform private.validate_event_basics(event_name, event_description, event_venue, event_timezone, event_starts_at, event_ends_at);
  if event_slug is null or event_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(event_slug) not between 3 and 80 then
    raise exception 'valid event slug is required';
  end if;
  select profiles.name, lower(btrim(auth_users.email)) into actor_name, actor_email
    from auth.users as auth_users
    join public.profiles on profiles.id = auth_users.id
   where auth_users.id = actor;
  if not found then raise exception 'profile is required'; end if;

  -- Requests with different UUIDs must not race past the owner's quota.
  perform pg_advisory_xact_lock(hashtextextended('event-owner:' || actor::text, 0));
  select coalesce(overrides.active_event_limit, 5) into active_limit
    from (select actor as user_id) as account
    left join public.platform_quota_overrides as overrides using (user_id);
  if (
    select count(*) from public.event_memberships as memberships
    join public.events on events.id = memberships.event_id
     where memberships.user_id = actor and memberships.role = 'owner'
       and memberships.status = 'active' and events.lifecycle <> 'archived'
  ) >= active_limit then raise exception 'active owned event limit reached'; end if;

  insert into public.events (
    name, theme, slug, description, venue, timezone, starts_at, ends_at,
    status, lifecycle, ever_published, published_at, theme_preset, accent_color
  ) values (
    btrim(event_name), btrim(event_name), event_slug,
    nullif(btrim(event_description), ''), nullif(btrim(event_venue), ''),
    event_timezone, event_starts_at, event_ends_at,
    case when now() < event_starts_at then 'upcoming'
         when now() >= event_ends_at then 'ended' else 'started' end,
    'draft', false, null, 'daylight', '#2563EB'
  ) returning id into created_event_id;
  insert into public.event_memberships (
    event_id, user_id, role, status, display_name_snapshot, email_snapshot
  ) values (created_event_id, actor, 'owner', 'active', coalesce(actor_name, ''), actor_email)
  returning id into owner_membership_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action, target_entity_type,
    target_entity_id, request_id
  ) values (created_event_id, actor, owner_membership_id, 'event.create', 'event', created_event_id, mutation_request_id);
  return created_event_id;
end;
$$;

create or replace function public.update_event_basics(
  target_event_id uuid, event_name text, event_description text, event_venue text,
  event_timezone text, event_starts_at timestamptz, event_ends_at timestamptz,
  mutation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership_id uuid;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
begin
  replay := private.claim_event_request(target_event_id, 'event.update_basics', mutation_request_id, target_event_id);
  if replay.id is not null then return target_event_id; end if;
  actor_membership_id := private.current_event_membership_id(target_event_id, array['owner','admin']);
  if actor_membership_id is null then raise exception 'event staff access required'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event administration is read-only';
  end if;
  perform private.validate_event_basics(event_name, event_description, event_venue, event_timezone, event_starts_at, event_ends_at);
  update public.events set name = btrim(event_name),
    theme = case when theme_preset = 'legacy_aws' then theme else btrim(event_name) end,
    description = nullif(btrim(event_description), ''), venue = nullif(btrim(event_venue), ''),
    timezone = event_timezone, starts_at = event_starts_at, ends_at = event_ends_at
   where id = target_event_id;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action, target_entity_type,
    target_entity_id, request_id
  ) values (target_event_id, (select auth.uid()), actor_membership_id, 'event.update_basics', 'event', target_event_id, mutation_request_id);
  return target_event_id;
end;
$$;

create or replace function public.delete_untouched_draft_event(
  target_event_id uuid, deletion_reason text, mutation_request_id uuid
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
  creation_request uuid;
begin
  if actor is null then raise exception 'authentication required'; end if;
  if mutation_request_id is null then raise exception 'request id is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(mutation_request_id::text, 0));
  select * into existing_audit from public.platform_audit_log where request_id = mutation_request_id;
  if found then
    if existing_audit.actor_user_id = actor and existing_audit.action = 'event.delete_draft'
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
  if char_length(btrim(coalesce(deletion_reason, ''))) not between 8 and 1000 then
    raise exception 'deletion reason is required';
  end if;
  if target_event.suspended_at is not null then raise exception 'event is suspended'; end if;
  if target_event.lifecycle <> 'draft' or target_event.ever_published then
    raise exception 'only untouched drafts can be deleted';
  end if;
  if exists (select 1 from public.sessions where event_id = target_event_id)
     or exists (select 1 from public.speakers_sponsors where event_id = target_event_id)
     or exists (select 1 from public.event_memberships where event_id = target_event_id and id <> actor_membership_id)
     or exists (select 1 from public.event_admin_invitations where event_id = target_event_id)
     or exists (select 1 from public.event_audit_log where event_id = target_event_id and action not in ('event.create','event.update_basics')) then
    raise exception 'draft has activity and must be archived';
  end if;
  select request_id into creation_request from public.event_audit_log
   where event_id = target_event_id and action = 'event.create' limit 1;
  insert into public.platform_audit_log (actor_user_id, action, details, request_id)
  values (actor, 'event.delete_draft', jsonb_build_object(
    'deleted_event_id', target_event_id, 'name', target_event.name,
    'reason', btrim(deletion_reason), 'creation_request_id', creation_request
  ), mutation_request_id);
  -- Creation/setup audits are removed only with the authorized tombstone;
  -- the platform tombstone above preserves the deletion and request history.
  delete from public.event_audit_log where event_id = target_event_id;
  delete from public.events where id = target_event_id;
  return target_event_id;
end;
$$;

revoke all on function public.create_event(text,text,text,text,text,timestamptz,timestamptz,uuid) from public, anon, authenticated;
revoke all on function public.update_event_basics(uuid,text,text,text,text,timestamptz,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.create_event(text,text,text,text,text,timestamptz,timestamptz,uuid) to authenticated;
grant execute on function public.update_event_basics(uuid,text,text,text,text,timestamptz,timestamptz,uuid) to authenticated;
commit;
