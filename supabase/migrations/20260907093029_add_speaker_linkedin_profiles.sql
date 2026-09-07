-- Add the confirmed LinkedIn profiles without changing other speaker details.
with expected_profiles (id, linkedin_url) as (
  values
    ('20000000-0000-4000-8000-000000000001'::uuid, 'https://www.linkedin.com/in/isaeus-guiang/'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'https://www.linkedin.com/in/raphael-justin-jambalos/'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'https://www.linkedin.com/in/jared-remulta-a43a132a/'),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'https://www.linkedin.com/in/vkenjo/'),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'https://www.linkedin.com/in/lesmonsaluta/'),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'https://www.linkedin.com/in/pabilandokarenpv/'),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'https://www.linkedin.com/in/benedict-casio/'),
    ('20000000-0000-4000-8000-000000000008'::uuid, 'https://www.linkedin.com/in/dayvough/'),
    ('20000000-0000-4000-8000-000000000009'::uuid, 'https://www.linkedin.com/in/neilriego/'),
    ('20000000-0000-4000-8000-000000000010'::uuid, 'https://www.linkedin.com/in/ashley-nicole-santos/'),
    ('20000000-0000-4000-8000-000000000012'::uuid, 'https://www.linkedin.com/in/dearah-mae-barsolasco-5b835326a/'),
    ('20000000-0000-4000-8000-000000000013'::uuid, 'https://www.linkedin.com/in/pe%C3%B1anokurtaxcel/')
)
update public.speakers_sponsors as people
   set linkedin_url = expected.linkedin_url
  from expected_profiles as expected
 where people.id = expected.id;

do $$
declare
  matching_profile_count bigint;
begin
  select count(*)
    into matching_profile_count
    from (
      values
        ('20000000-0000-4000-8000-000000000001'::uuid, 'https://www.linkedin.com/in/isaeus-guiang/'),
        ('20000000-0000-4000-8000-000000000002'::uuid, 'https://www.linkedin.com/in/raphael-justin-jambalos/'),
        ('20000000-0000-4000-8000-000000000003'::uuid, 'https://www.linkedin.com/in/jared-remulta-a43a132a/'),
        ('20000000-0000-4000-8000-000000000004'::uuid, 'https://www.linkedin.com/in/vkenjo/'),
        ('20000000-0000-4000-8000-000000000005'::uuid, 'https://www.linkedin.com/in/lesmonsaluta/'),
        ('20000000-0000-4000-8000-000000000006'::uuid, 'https://www.linkedin.com/in/pabilandokarenpv/'),
        ('20000000-0000-4000-8000-000000000007'::uuid, 'https://www.linkedin.com/in/benedict-casio/'),
        ('20000000-0000-4000-8000-000000000008'::uuid, 'https://www.linkedin.com/in/dayvough/'),
        ('20000000-0000-4000-8000-000000000009'::uuid, 'https://www.linkedin.com/in/neilriego/'),
        ('20000000-0000-4000-8000-000000000010'::uuid, 'https://www.linkedin.com/in/ashley-nicole-santos/'),
        ('20000000-0000-4000-8000-000000000012'::uuid, 'https://www.linkedin.com/in/dearah-mae-barsolasco-5b835326a/'),
        ('20000000-0000-4000-8000-000000000013'::uuid, 'https://www.linkedin.com/in/pe%C3%B1anokurtaxcel/')
    ) as expected(id, linkedin_url)
    join public.speakers_sponsors as people
      on people.id = expected.id
     and people.linkedin_url = expected.linkedin_url;

  if matching_profile_count <> 12 then
    raise exception
      'speaker LinkedIn profile verification failed: matched % of 12',
      matching_profile_count;
  end if;
end;
$$;
