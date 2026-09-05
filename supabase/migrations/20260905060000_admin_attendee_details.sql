create or replace function public.admin_get_attendee(target_attendee_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  select jsonb_build_object(
    'attendee', jsonb_build_object(
      'id', profiles.id,
      'name', profiles.name,
      'photo_url', profiles.photo_url,
      'created_at', profiles.created_at
    ),
    'push_devices', coalesce((
      select jsonb_agg(
        jsonb_build_object('created_at', subscriptions.created_at)
        order by subscriptions.created_at desc
      )
      from public.push_subscriptions as subscriptions
      where subscriptions.user_id = profiles.id
    ), '[]'::jsonb),
    'social_profiles', coalesce((
      select jsonb_agg(
        jsonb_build_object('network', social_profiles.network, 'url', social_profiles.url)
        order by case social_profiles.network
          when 'linkedin' then 1
          when 'instagram' then 2
          when 'facebook' then 3
          when 'github' then 4
        end
      )
      from public.social_profiles
      where social_profiles.user_id = profiles.id
    ), '[]'::jsonb)
  ) into result
  from public.profiles
  where profiles.id = target_attendee_id;

  return result;
end;
$$;

revoke all on function public.admin_get_attendee(uuid) from public, anon;
grant execute on function public.admin_get_attendee(uuid) to authenticated;
