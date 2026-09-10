do $$
declare
  karen_id constant uuid := '20000000-0000-4000-8000-000000000006'::uuid;
  panel_session_id constant uuid := '10000000-0000-4000-8000-000000000009'::uuid;
  linked_session_count bigint;
  speaker_count bigint;
  canonical_link_count bigint;
begin
  if not exists (
    select 1
      from public.speakers_sponsors
     where id = karen_id
       and name = 'Karen Pearl Pabilando'
       and role = 'speaker'
  ) then
    raise exception 'expected Karen Pearl Pabilando speaker record is missing or changed';
  end if;

  select count(*)
    into linked_session_count
    from public.session_speakers
   where speaker_id = karen_id;

  if linked_session_count <> 1 or not exists (
    select 1
      from public.session_speakers
     where session_id = panel_session_id
       and speaker_id = karen_id
  ) then
    raise exception
      'expected Karen Pearl Pabilando to be linked only to the panel session; found % links',
      linked_session_count;
  end if;

  delete from public.session_speakers
   where session_id = panel_session_id
     and speaker_id = karen_id;

  delete from public.speakers_sponsors
   where id = karen_id
     and name = 'Karen Pearl Pabilando';

  if exists (
    select 1
      from public.speakers_sponsors
     where id = karen_id
  ) or exists (
    select 1
      from public.session_speakers
     where speaker_id = karen_id
  ) then
    raise exception 'Karen Pearl Pabilando removal verification failed';
  end if;

  select count(*)
    into speaker_count
    from public.speakers_sponsors
   where role = 'speaker';

  if speaker_count <> 12 then
    raise exception 'speaker roster verification failed: expected 12, found %', speaker_count;
  end if;

  select count(*)
    into canonical_link_count
    from public.session_speakers
   where session_id between '10000000-0000-4000-8000-000000000001'::uuid
                        and '10000000-0000-4000-8000-000000000016'::uuid;

  if canonical_link_count <> 12 then
    raise exception
      'speaker assignment verification failed: expected 12 canonical links, found %',
      canonical_link_count;
  end if;
end;
$$;
