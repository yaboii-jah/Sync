begin;

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
  if not private.can_manage_event_branding_object(object_name, 'staging') then return false; end if;
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

revoke all on function private.event_branding_object_within_quota(text,jsonb) from public, anon;
grant execute on function private.event_branding_object_within_quota(text,jsonb) to authenticated;

commit;
