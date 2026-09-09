-- Deliberately minimal attendee snapshot for the on-demand raffle export.
-- Profile IDs stay inside the protected admin UI to disambiguate duplicate names.
create function public.admin_get_raffle_attendees()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin access required';
  end if;

  return (
    select jsonb_build_object(
      'attendees', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', profiles.id,
            'name', btrim(regexp_replace(profiles.name, '[[:space:]]+', ' ', 'g'))
          )
          order by lower(btrim(regexp_replace(profiles.name, '[[:space:]]+', ' ', 'g'))),
                   profiles.id
        ) filter (where regexp_replace(profiles.name, '[[:space:]]+', '', 'g') <> ''),
        '[]'::jsonb
      ),
      'excluded_blank_count', count(*) filter (
        where regexp_replace(profiles.name, '[[:space:]]+', '', 'g') = ''
      )
    )
      from public.profiles
      left join public.admin_users
        on admin_users.user_id = profiles.id
     where admin_users.user_id is null
  );
end;
$$;

revoke all on function public.admin_get_raffle_attendees() from public, anon;
grant execute on function public.admin_get_raffle_attendees() to authenticated;
