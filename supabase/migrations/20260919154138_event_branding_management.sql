-- Tenant-scoped event logo and cover assets. Raw uploads remain private;
-- normalized delivery assets use immutable, versioned public paths.
begin;

do $$
begin
  if exists (select 1 from storage.buckets where id = 'event-branding-staging') then
    if exists (
      select 1 from storage.buckets
       where id = 'event-branding-staging'
         and (public or file_size_limit is distinct from 10485760::bigint
           or allowed_mime_types is distinct from array['image/jpeg','image/png','image/webp']::text[])
    ) then raise exception 'existing event-branding-staging bucket is incompatible'; end if;
  else
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('event-branding-staging', 'event-branding-staging', false, 10485760,
      array['image/jpeg','image/png','image/webp']);
  end if;

  if exists (select 1 from storage.buckets where id = 'event-branding') then
    if exists (
      select 1 from storage.buckets
       where id = 'event-branding'
         and (not public or file_size_limit is distinct from 2097152::bigint
           or allowed_mime_types is distinct from array['image/webp']::text[])
    ) then raise exception 'existing event-branding bucket is incompatible'; end if;
  else
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('event-branding', 'event-branding', true, 2097152, array['image/webp']);
  end if;
end;
$$;

create or replace function private.can_manage_event_branding_object(
  object_name text,
  object_scope text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := pg_catalog.string_to_array(object_name, '/');
  path_event_id uuid;
  actor uuid := (select auth.uid());
begin
  if actor is null or pg_catalog.array_length(parts, 1) is null
     or parts[1] <> 'events' or parts[3] <> 'branding' then return false; end if;
  begin path_event_id := parts[2]::uuid;
  exception when invalid_text_representation then return false;
  end;

  if object_scope = 'staging' then
    if pg_catalog.array_length(parts, 1) <> 6 or parts[4] <> 'staging'
       or parts[5] <> actor::text
       or parts[6] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    then return false; end if;
  elsif object_scope = 'delivery' then
    if pg_catalog.array_length(parts, 1) <> 5 or parts[4] not in ('logo','cover')
       or parts[5] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
    then return false; end if;
  else return false;
  end if;

  return exists (
    select 1
      from public.event_memberships
      join public.events on events.id = event_memberships.event_id
     where event_memberships.event_id = path_event_id
       and event_memberships.user_id = actor
       and event_memberships.status = 'active'
       and event_memberships.role in ('owner','admin')
       and events.lifecycle <> 'archived'
       and events.suspended_at is null
  );
end;
$$;

revoke all on function private.can_manage_event_branding_object(text,text) from public, anon, authenticated;
grant execute on function private.can_manage_event_branding_object(text,text) to authenticated;

create policy "Event staff can insert branding staging objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-branding-staging'
    and (select private.can_manage_event_branding_object(name, 'staging'))
  );
create policy "Event staff can read branding staging objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'event-branding-staging'
    and (select private.can_manage_event_branding_object(name, 'staging'))
  );
create policy "Event staff can delete branding staging objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-branding-staging'
    and (select private.can_manage_event_branding_object(name, 'staging'))
  );
create policy "Event staff can insert branding delivery objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-branding'
    and (select private.can_manage_event_branding_object(name, 'delivery'))
  );
create policy "Event staff can delete branding delivery objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-branding'
    and (select private.can_manage_event_branding_object(name, 'delivery'))
  );

create or replace function public.set_event_branding(
  target_event_id uuid,
  asset_kind text,
  asset_path text,
  mutation_request_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership_id uuid;
  target_event public.events%rowtype;
  replay public.event_audit_log%rowtype;
  action_name text;
  previous_path text;
  required_path_pattern text;
begin
  if asset_kind not in ('logo','cover') then raise exception 'valid branding asset kind is required'; end if;
  action_name := 'event.update_branding.' || asset_kind;
  replay := private.claim_event_request(target_event_id, action_name, mutation_request_id, target_event_id);
  if replay.id is not null then return replay.details ->> 'previous_path'; end if;

  actor_membership_id := private.current_event_membership_id(target_event_id, array['owner','admin']);
  if actor_membership_id is null then raise exception 'event staff access required'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event not found'; end if;
  if target_event.lifecycle = 'archived' or target_event.suspended_at is not null then
    raise exception 'event administration is read-only';
  end if;

  previous_path := case when asset_kind = 'logo' then target_event.logo_path else target_event.cover_path end;
  if asset_path is not null then
    required_path_pattern := '^events/' || target_event_id::text || '/branding/' || asset_kind
      || '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$';
    if asset_path !~ required_path_pattern then raise exception 'invalid branding asset path'; end if;
    if not exists (
      select 1 from storage.objects
       where bucket_id = 'event-branding' and name = asset_path
         and metadata ->> 'mimetype' = 'image/webp'
         and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 2097152
    ) then raise exception 'normalized branding asset is required'; end if;
  end if;

  if asset_kind = 'logo' then
    update public.events set logo_path = asset_path where id = target_event_id;
  else
    update public.events set cover_path = asset_path where id = target_event_id;
  end if;
  insert into public.event_audit_log (
    event_id, actor_user_id, actor_membership_id, action, target_entity_type,
    target_entity_id, details, request_id
  ) values (
    target_event_id, (select auth.uid()), actor_membership_id, action_name,
    'event', target_event_id,
    jsonb_build_object('asset_kind', asset_kind, 'asset_path', asset_path, 'previous_path', previous_path),
    mutation_request_id
  );
  return previous_path;
end;
$$;

revoke all on function public.set_event_branding(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.set_event_branding(uuid,text,text,uuid) to authenticated;

commit;
