insert into public.speakers_sponsors (id, name, role)
values
  ('20000000-0000-4000-8000-000000000010'::uuid, 'Ashley Santos', 'speaker'),
  ('20000000-0000-4000-8000-000000000011'::uuid, 'Danilo Casim Jr', 'speaker'),
  ('20000000-0000-4000-8000-000000000012'::uuid, 'Dearah Barsolasco', 'speaker'),
  ('20000000-0000-4000-8000-000000000013'::uuid, 'Kurt Axcel', 'speaker')
on conflict (id) do update
  set name = excluded.name,
      role = excluded.role;

do $$
declare
  added_count bigint;
  duplicate_count bigint;
  linked_count bigint;
begin
  select count(*)
    into added_count
    from public.speakers_sponsors
   where id between '20000000-0000-4000-8000-000000000010'::uuid
               and '20000000-0000-4000-8000-000000000013'::uuid
     and role = 'speaker'
     and name in (
       'Ashley Santos',
       'Danilo Casim Jr',
       'Dearah Barsolasco',
       'Kurt Axcel'
     );

  select count(*)
    into duplicate_count
    from public.speakers_sponsors
   where lower(name) in (
       'ashley santos',
       'danilo casim jr',
       'dearah barsolasco',
       'kurt axcel'
     );

  select count(*)
    into linked_count
    from public.session_speakers
   where speaker_id between '20000000-0000-4000-8000-000000000010'::uuid
                        and '20000000-0000-4000-8000-000000000013'::uuid;

  if added_count <> 4 or duplicate_count <> 4 or linked_count <> 0 then
    raise exception
      'additional speaker verification failed: added %, duplicate names %, session links %',
      added_count,
      duplicate_count,
      linked_count;
  end if;
end;
$$;
