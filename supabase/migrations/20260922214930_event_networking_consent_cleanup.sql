-- Saving global URLs replaces all social_profile rows. Revoke only networks
-- explicitly removed from the submitted set; preserve other event selections.
create or replace function public.save_social_profiles(
  linkedin_url text, instagram_url text, facebook_url text, github_url text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  v_template integer := coalesce((select templates from public.social_profiles where user_id = caller_id limit 1), 1);
begin
  if caller_id is null then raise exception 'authentication required'; end if;
  if not (select private.is_google_user()) then raise exception 'Google authentication required'; end if;

  delete from public.event_networking_card_links l using public.event_memberships m
   where l.event_id = m.event_id and l.membership_id = m.id and m.user_id = caller_id
     and ((l.network = 'linkedin' and nullif(linkedin_url, '') is null)
       or (l.network = 'instagram' and nullif(instagram_url, '') is null)
       or (l.network = 'facebook' and nullif(facebook_url, '') is null)
       or (l.network = 'github' and nullif(github_url, '') is null));

  delete from public.social_profiles where user_id = caller_id;
  insert into public.social_profiles (user_id, network, url, templates)
  select caller_id, values_to_save.network, values_to_save.url, v_template
    from (values
      ('linkedin', nullif(linkedin_url, '')),
      ('instagram', nullif(instagram_url, '')),
      ('facebook', nullif(facebook_url, '')),
      ('github', nullif(github_url, ''))
    ) as values_to_save(network, url)
   where values_to_save.url is not null;

  update public.networking_cards set is_public = exists
    (select 1 from public.social_profiles where user_id = caller_id)
   where user_id = caller_id;
end;
$$;
revoke all on function public.save_social_profiles(text,text,text,text) from public,anon;
grant execute on function public.save_social_profiles(text,text,text,text) to authenticated;

create function private.clear_inactive_event_networking_links()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'active' and (new.status <> 'active' or new.user_id is distinct from old.user_id) then
    delete from public.event_networking_card_links
     where event_id = old.event_id and membership_id = old.id;
  end if;
  return new;
end $$;
revoke all on function private.clear_inactive_event_networking_links() from public,anon,authenticated;
create trigger clear_inactive_event_networking_links
  after update of status,user_id on public.event_memberships
  for each row execute function private.clear_inactive_event_networking_links();

create or replace function public.get_my_event_networking_scans(target_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', case when m.user_id is null then 'Former attendee' else coalesce(p.name, m.display_name_snapshot) end,
    'photo_url', p.photo_url, 'token', case when m.status = 'active' then c.public_token else null end,
    'scanned_at', h.scanned_at) order by h.scanned_at desc), '[]'::jsonb)
  from public.event_networking_scan_history h
  join public.event_memberships m on m.event_id = h.event_id and m.id = h.scanned_membership_id
  left join public.profiles p on p.id = m.user_id
  left join public.event_networking_cards c on c.event_id = m.event_id and c.membership_id = m.id
  where h.event_id = target_event_id and h.scanner_membership_id = private.networking_membership(target_event_id);
$$;
revoke all on function public.get_my_event_networking_scans(uuid) from public,anon;
grant execute on function public.get_my_event_networking_scans(uuid) to authenticated;
