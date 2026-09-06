update public.speakers_sponsors
   set role = 'speaker'
 where id in (
   '20000000-0000-4000-8000-000000000001'::uuid,
   '20000000-0000-4000-8000-000000000002'::uuid,
   '20000000-0000-4000-8000-000000000003'::uuid,
   '20000000-0000-4000-8000-000000000004'::uuid,
   '20000000-0000-4000-8000-000000000005'::uuid,
   '20000000-0000-4000-8000-000000000006'::uuid,
   '20000000-0000-4000-8000-000000000007'::uuid,
   '20000000-0000-4000-8000-000000000008'::uuid,
   '20000000-0000-4000-8000-000000000009'::uuid,
   '20000000-0000-4000-8000-000000000010'::uuid,
   '20000000-0000-4000-8000-000000000011'::uuid,
   '20000000-0000-4000-8000-000000000012'::uuid,
   '20000000-0000-4000-8000-000000000013'::uuid
 );

do $$
declare
  lineup_count bigint;
  speaker_count bigint;
  distinct_name_count bigint;
begin
  select count(*),
         count(*) filter (where role = 'speaker'),
         count(distinct lower(name))
    into lineup_count, speaker_count, distinct_name_count
    from public.speakers_sponsors
   where id between '20000000-0000-4000-8000-000000000001'::uuid
               and '20000000-0000-4000-8000-000000000013'::uuid;

  if lineup_count <> 13 or speaker_count <> 13 or distinct_name_count <> 13 then
    raise exception
      'speaker lineup verification failed: records %, speakers %, distinct names %',
      lineup_count,
      speaker_count,
      distinct_name_count;
  end if;
end;
$$;
