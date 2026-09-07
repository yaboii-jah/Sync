-- Enrich the 13-speaker roster with the organiser's speaker export:
-- affiliation, LinkedIn profile, and portrait. Names and session links were
-- already reconciled by 20260907090707_update_speaker_roster.sql; the only
-- name corrected here is Neil Riego, whose full name the export carries.
--
-- 20260907093029_add_speaker_linkedin_profiles.sql set 12 of the 13 LinkedIn
-- URLs and recorded Danilo Jr Casim as unsupplied. The export supplies his,
-- so all 13 are written here. The other 12 are rewritten to the identical
-- values, which is a no-op, and keeps this migration a self-contained
-- statement of the roster rather than a patch that only reads correctly
-- alongside the earlier file.
--
-- Portraits are static assets under public/speakers/ (400x400 webp), so
-- photo_url is a site-relative path, not an external host.
--
-- Six speakers have no affiliation in the export yet. They are written as
-- null rather than an empty string so the directory falls back to its
-- "Speaker" label instead of rendering a blank line.

with roster (id, name, organization, linkedin_url, photo_url) as (
  values
    (
      '20000000-0000-4000-8000-000000000001'::uuid,
      'Isaeus Guiang',
      null::text,
      'https://www.linkedin.com/in/isaeus-guiang/',
      '/speakers/isaeus-guiang.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000002'::uuid,
      'Raphael Justin Jambalos',
      'AWSUGPH Community Leader',
      'https://www.linkedin.com/in/raphael-justin-jambalos/',
      '/speakers/raphael-justin-jambalos.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000003'::uuid,
      'Jared Remulta',
      null,
      'https://www.linkedin.com/in/jared-remulta-a43a132a/',
      '/speakers/jared-remulta.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000004'::uuid,
      'Josh Kenn Viray',
      null,
      'https://www.linkedin.com/in/vkenjo/',
      '/speakers/josh-kenn-viray.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000005'::uuid,
      'Lesmon Saluta',
      null,
      'https://www.linkedin.com/in/lesmonsaluta/',
      '/speakers/lesmon-saluta.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000006'::uuid,
      'Karen Pearl Pabilando',
      null,
      'https://www.linkedin.com/in/pabilandokarenpv/',
      '/speakers/karen-pearl-pabilando.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000007'::uuid,
      'Gen Benedict Casio',
      null,
      'https://www.linkedin.com/in/benedict-casio/',
      '/speakers/gen-benedict-casio.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000008'::uuid,
      'David Marquez',
      'Yield CTO, Codex Ambassador',
      'https://www.linkedin.com/in/dayvough/',
      '/speakers/david-marquez.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000009'::uuid,
      'Neil Christian Riego',
      'Control Flow Labs Tech Lead',
      'https://www.linkedin.com/in/neilriego/',
      '/speakers/neil-christian-riego.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000010'::uuid,
      'Ashley Nicole Santos',
      'Agora Philippines Country Lead',
      'https://www.linkedin.com/in/ashley-nicole-santos/',
      '/speakers/ashley-nicole-santos.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000011'::uuid,
      'Danilo Jr Casim',
      'Facilitator',
      'https://www.linkedin.com/in/danilo-casim-jr09/',
      '/speakers/danilo-jr-casim.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000012'::uuid,
      'Dearah Mae Barsolasco',
      'Agora Ambassador',
      'https://www.linkedin.com/in/dearah-mae-barsolasco-5b835326a/',
      '/speakers/dearah-mae-barsolasco.webp'
    ),
    (
      '20000000-0000-4000-8000-000000000013'::uuid,
      'Kurt Axcel Peñano',
      'Facilitator',
      -- Percent-encoded in the export because the LinkedIn vanity slug
      -- contains "ñ"; kept verbatim so the link resolves.
      'https://www.linkedin.com/in/pe%C3%B1anokurtaxcel/',
      '/speakers/kurt-axcel-penano.webp'
    )
)
update public.speakers_sponsors as people
   set name = roster.name,
       role = 'speaker',
       organization = roster.organization,
       linkedin_url = roster.linkedin_url,
       photo_url = roster.photo_url
  from roster
 where people.id = roster.id;

do $$
declare
  roster_count bigint;
  enriched_count bigint;
  stray_photo_count bigint;
begin
  select count(*)
    into roster_count
    from public.speakers_sponsors
   where id between '20000000-0000-4000-8000-000000000001'::uuid
               and '20000000-0000-4000-8000-000000000013'::uuid;

  select count(*)
    into enriched_count
    from public.speakers_sponsors
   where id between '20000000-0000-4000-8000-000000000001'::uuid
               and '20000000-0000-4000-8000-000000000013'::uuid
     and role = 'speaker'
     and linkedin_url like 'https://www.linkedin.com/in/%'
     and photo_url like '/speakers/%.webp'
     and organization is distinct from '';

  -- Every portrait path must be unique, or two speakers share a face.
  select count(*)
    into stray_photo_count
    from (
      select photo_url
        from public.speakers_sponsors
       where id between '20000000-0000-4000-8000-000000000001'::uuid
                   and '20000000-0000-4000-8000-000000000013'::uuid
       group by photo_url
      having count(*) > 1
    ) duplicates;

  if roster_count <> 13
     or enriched_count <> 13
     or stray_photo_count <> 0 then
    raise exception
      'speaker enrichment verification failed: roster %, enriched %, duplicate photos %',
      roster_count,
      enriched_count,
      stray_photo_count;
  end if;
end;
$$;
