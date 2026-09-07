-- Reconcile the published speaker names and session assignments from the
-- updated event roster without touching existing speaker enrichment fields.
with expected_speakers (id, name) as (
  values
    ('20000000-0000-4000-8000-000000000001'::uuid, 'Isaeus Guiang'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'Raphael Justin Jambalos'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'Jared Remulta'),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'Josh Kenn Viray'),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'Lesmon Saluta'),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'Karen Pearl Pabilando'),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'Gen Benedict Casio'),
    ('20000000-0000-4000-8000-000000000008'::uuid, 'David Marquez'),
    ('20000000-0000-4000-8000-000000000009'::uuid, 'Neil Riego'),
    ('20000000-0000-4000-8000-000000000010'::uuid, 'Ashley Nicole Santos'),
    ('20000000-0000-4000-8000-000000000011'::uuid, 'Danilo Jr Casim'),
    ('20000000-0000-4000-8000-000000000012'::uuid, 'Dearah Mae Barsolasco'),
    ('20000000-0000-4000-8000-000000000013'::uuid, 'Kurt Axcel Peñano')
)
update public.speakers_sponsors as people
   set name = expected.name,
       role = 'speaker'
  from expected_speakers as expected
 where people.id = expected.id;

with expected_links (session_id, speaker_id) as (
  values
    ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000010'::uuid),
    ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000011'::uuid),
    ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000012'::uuid),
    ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000013'::uuid),
    ('10000000-0000-4000-8000-000000000015'::uuid, '20000000-0000-4000-8000-000000000008'::uuid),
    ('10000000-0000-4000-8000-000000000016'::uuid, '20000000-0000-4000-8000-000000000009'::uuid),
    ('10000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000001'::uuid),
    ('10000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000002'::uuid),
    ('10000000-0000-4000-8000-000000000006'::uuid, '20000000-0000-4000-8000-000000000003'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000004'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000005'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000006'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000007'::uuid)
)
delete from public.session_speakers as links
 where links.session_id between '10000000-0000-4000-8000-000000000001'::uuid
                            and '10000000-0000-4000-8000-000000000016'::uuid
   and not exists (
     select 1
       from expected_links as expected
      where expected.session_id = links.session_id
        and expected.speaker_id = links.speaker_id
   );

insert into public.session_speakers (session_id, speaker_id)
values
  ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000010'::uuid),
  ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000011'::uuid),
  ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000012'::uuid),
  ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000013'::uuid),
  ('10000000-0000-4000-8000-000000000015'::uuid, '20000000-0000-4000-8000-000000000008'::uuid),
  ('10000000-0000-4000-8000-000000000016'::uuid, '20000000-0000-4000-8000-000000000009'::uuid),
  ('10000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000001'::uuid),
  ('10000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000002'::uuid),
  ('10000000-0000-4000-8000-000000000006'::uuid, '20000000-0000-4000-8000-000000000003'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000004'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000005'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000006'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000007'::uuid)
on conflict (session_id, speaker_id) do nothing;

do $$
declare
  speaker_count bigint;
  link_count bigint;
begin
  select count(*)
    into speaker_count
    from public.speakers_sponsors
   where role = 'speaker';

  if speaker_count <> 13 or exists (
    with expected_speakers (id, name) as (
      values
        ('20000000-0000-4000-8000-000000000001'::uuid, 'Isaeus Guiang'),
        ('20000000-0000-4000-8000-000000000002'::uuid, 'Raphael Justin Jambalos'),
        ('20000000-0000-4000-8000-000000000003'::uuid, 'Jared Remulta'),
        ('20000000-0000-4000-8000-000000000004'::uuid, 'Josh Kenn Viray'),
        ('20000000-0000-4000-8000-000000000005'::uuid, 'Lesmon Saluta'),
        ('20000000-0000-4000-8000-000000000006'::uuid, 'Karen Pearl Pabilando'),
        ('20000000-0000-4000-8000-000000000007'::uuid, 'Gen Benedict Casio'),
        ('20000000-0000-4000-8000-000000000008'::uuid, 'David Marquez'),
        ('20000000-0000-4000-8000-000000000009'::uuid, 'Neil Riego'),
        ('20000000-0000-4000-8000-000000000010'::uuid, 'Ashley Nicole Santos'),
        ('20000000-0000-4000-8000-000000000011'::uuid, 'Danilo Jr Casim'),
        ('20000000-0000-4000-8000-000000000012'::uuid, 'Dearah Mae Barsolasco'),
        ('20000000-0000-4000-8000-000000000013'::uuid, 'Kurt Axcel Peñano')
    )
    select 1
      from expected_speakers as expected
     where not exists (
       select 1
         from public.speakers_sponsors as people
        where people.id = expected.id
          and people.name = expected.name
          and people.role = 'speaker'
     )
  ) then
    raise exception
      'speaker roster verification failed: speaker count %',
      speaker_count;
  end if;

  select count(*)
    into link_count
    from public.session_speakers
   where session_id between '10000000-0000-4000-8000-000000000001'::uuid
                        and '10000000-0000-4000-8000-000000000016'::uuid;

  if link_count <> 13 or exists (
    with expected_links (session_id, speaker_id) as (
      values
        ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000010'::uuid),
        ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000011'::uuid),
        ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000012'::uuid),
        ('10000000-0000-4000-8000-000000000014'::uuid, '20000000-0000-4000-8000-000000000013'::uuid),
        ('10000000-0000-4000-8000-000000000015'::uuid, '20000000-0000-4000-8000-000000000008'::uuid),
        ('10000000-0000-4000-8000-000000000016'::uuid, '20000000-0000-4000-8000-000000000009'::uuid),
        ('10000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000001'::uuid),
        ('10000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000002'::uuid),
        ('10000000-0000-4000-8000-000000000006'::uuid, '20000000-0000-4000-8000-000000000003'::uuid),
        ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000004'::uuid),
        ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000005'::uuid),
        ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000006'::uuid),
        ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000007'::uuid)
    )
    select 1
      from expected_links as expected
     where not exists (
       select 1
         from public.session_speakers as links
        where links.session_id = expected.session_id
          and links.speaker_id = expected.speaker_id
     )
  ) then
    raise exception
      'speaker assignment verification failed: links %',
      link_count;
  end if;
end;
$$;
