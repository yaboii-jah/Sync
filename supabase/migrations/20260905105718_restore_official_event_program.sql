-- Restore the official attendee program after event-operations testing.
-- Existing session IDs are updated in place so surviving bookmarks remain.

do $$
declare
  target_event_count bigint;
  total_event_count bigint;
begin
  select count(*) into target_event_count
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026';

  select count(*) into total_event_count
    from public.events;

  if target_event_count <> 1 or total_event_count <> 1 then
    raise exception
      'official program restore guard failed: target events %, total events %',
      target_event_count,
      total_event_count;
  end if;

  if now() >= '2026-09-11 09:30:00+08'::timestamptz then
    raise exception 'official program restore is limited to pre-event cleanup';
  end if;

  if exists (
    select 1
      from public.sessions
     where id between '10000000-0000-4000-8000-000000000001'::uuid
                  and '10000000-0000-4000-8000-000000000016'::uuid
       and event_id <> (
         select id
           from public.events
          where name = 'AWS Student Community Day Mega Manila 2026'
       )
  ) then
    raise exception 'an official session ID belongs to another event';
  end if;
end;
$$;

update public.events
   set venue = 'Asia Pacific College',
       starts_at = '2026-09-11 09:30:00+08'::timestamptz,
       ends_at = '2026-09-11 18:00:00+08'::timestamptz,
       status = case
         when now() < '2026-09-11 09:30:00+08'::timestamptz then 'upcoming'
         when now() >= '2026-09-11 18:00:00+08'::timestamptz then 'ended'
         else 'started'
       end,
       theme = 'BUILD. FORGE. REPEAT.'
 where name = 'AWS Student Community Day Mega Manila 2026';

with event_row as (
  select id
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026'
), official(
  id,
  title,
  description,
  room,
  start_time,
  end_time
) as (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'Registration and Check-in of Attendees',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 09:30:00+08'::timestamptz,
      '2026-09-11 10:30:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'Opening Remarks',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 10:30:00+08'::timestamptz,
      '2026-09-11 10:45:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000003'::uuid,
      'Keynote Address: From Student Builder to Cloud Leader',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 10:45:00+08'::timestamptz,
      '2026-09-11 11:05:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000004'::uuid,
      'Tech Talk 1: The Future of Careers in Cloud, AI, and Platform Engineering',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 11:05:00+08'::timestamptz,
      '2026-09-11 11:50:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000005'::uuid,
      'Lunch Break & Networking',
      null::text,
      'MPH1 (1F)',
      '2026-09-11 11:50:00+08'::timestamptz,
      '2026-09-11 13:15:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000006'::uuid,
      'Tech Talk 2: Agents, APIs, and AWS: How Builders Are Automating the Cloud',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 13:15:00+08'::timestamptz,
      '2026-09-11 14:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000007'::uuid,
      'AVP for Sponsors',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 14:00:00+08'::timestamptz,
      '2026-09-11 14:15:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000008'::uuid,
      'Venue Partner Segment & Transition to Workshops',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 14:15:00+08'::timestamptz,
      '2026-09-11 14:30:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000009'::uuid,
      'Panel Discussion: From Students to Builders: Navigating Careers in Cloud, AI, and the Agentic Era',
      'The discussion will focus on how students and emerging builders can transition from academic learning and hands-on experimentation into careers in Cloud, AI, and agentic technologies.',
      'Auditorium (12F)',
      '2026-09-11 14:30:00+08'::timestamptz,
      '2026-09-11 16:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000010'::uuid,
      'Plenary Reconvene, Awarding and Acknowledgements of Community Partners and Sponsor',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 16:00:00+08'::timestamptz,
      '2026-09-11 16:30:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000011'::uuid,
      'Awarding Ceremony (AWS BuilderCards & Raffles)',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 16:50:00+08'::timestamptz,
      '2026-09-11 17:30:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000012'::uuid,
      'Organizing Committee Acknowledgement (AWS BuilderCards & Raffles)',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 16:30:00+08'::timestamptz,
      '2026-09-11 16:50:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000013'::uuid,
      'Closing Remarks, Wrap-up & Photo Opportunity',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 17:30:00+08'::timestamptz,
      '2026-09-11 18:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000014'::uuid,
      'Workshop Track A: Agora Agents SDK Workshop',
      'Facilitators: Agora Ambassadors. This workshop runs simultaneously with Tech Talk 1.',
      'Rooms 306 & 304 (3F)',
      '2026-09-11 11:05:00+08'::timestamptz,
      '2026-09-11 11:50:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000015'::uuid,
      'Workshop Track B: AWS MCP + OpenCode: Agentic Workflows and MCP Concepts',
      'Facilitator: David Marquez. This workshop runs simultaneously with Tech Talk 2.',
      'Rooms 306 & 304 (3F)',
      '2026-09-11 13:15:00+08'::timestamptz,
      '2026-09-11 14:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000016'::uuid,
      'Workshop Track C: AWS BuilderCards Tournament',
      'Facilitator: Neil Riego. Team-based Build Challenge. Four teams with four members each (16 participants total). Open to all registered pass holders. This workshop/activity runs simultaneously with the Panel Discussion.',
      'MPH1 (1F)',
      '2026-09-11 14:30:00+08'::timestamptz,
      '2026-09-11 16:00:00+08'::timestamptz
    )
)
insert into public.sessions (
  id,
  event_id,
  title,
  description,
  room,
  start_time,
  end_time,
  status,
  reminder_sent_at,
  status_override,
  status_override_at,
  status_override_by,
  actual_started_at,
  actual_ended_at,
  published
)
select official.id,
       event_row.id,
       official.title,
       official.description,
       official.room,
       official.start_time,
       official.end_time,
       case
         when now() < official.start_time then 'not_started'
         when now() >= official.end_time then 'finished'
         else 'ongoing'
       end,
       null,
       null,
       null,
       null,
       null,
       null,
       true
  from official
 cross join event_row
on conflict (id) do update
  set event_id = excluded.event_id,
      title = excluded.title,
      description = excluded.description,
      room = excluded.room,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      status = excluded.status,
      reminder_sent_at = null,
      status_override = null,
      status_override_at = null,
      status_override_by = null,
      actual_started_at = null,
      actual_ended_at = null,
      published = true;

insert into public.speakers_sponsors (id, name, role)
values
  ('20000000-0000-4000-8000-000000000001'::uuid, 'Isaeus Guiang', 'speaker'),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'Raphael Justin Jambalos', 'speaker'),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'Jared Remulta', 'speaker'),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'Josh Kenn Viray', 'panelist'),
  ('20000000-0000-4000-8000-000000000005'::uuid, 'Lesmon Saluta', 'panelist'),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'Karen Pearl Pabilando', 'panelist'),
  ('20000000-0000-4000-8000-000000000007'::uuid, 'Gen Benedict Casio', 'panelist'),
  ('20000000-0000-4000-8000-000000000008'::uuid, 'David Marquez', 'facilitator'),
  ('20000000-0000-4000-8000-000000000009'::uuid, 'Neil Riego', 'facilitator')
on conflict (id) do update
  set name = excluded.name,
      role = excluded.role;

with expected_links(session_id, speaker_id) as (
  values
    ('10000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000001'::uuid),
    ('10000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000002'::uuid),
    ('10000000-0000-4000-8000-000000000006'::uuid, '20000000-0000-4000-8000-000000000003'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000004'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000005'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000006'::uuid),
    ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000007'::uuid),
    ('10000000-0000-4000-8000-000000000015'::uuid, '20000000-0000-4000-8000-000000000008'::uuid),
    ('10000000-0000-4000-8000-000000000016'::uuid, '20000000-0000-4000-8000-000000000009'::uuid)
)
delete from public.session_speakers as links
 where links.session_id between '10000000-0000-4000-8000-000000000001'::uuid
                            and '10000000-0000-4000-8000-000000000016'::uuid
   and not exists (
     select 1
       from expected_links
      where expected_links.session_id = links.session_id
        and expected_links.speaker_id = links.speaker_id
   );

insert into public.session_speakers (session_id, speaker_id)
values
  ('10000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000001'::uuid),
  ('10000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000002'::uuid),
  ('10000000-0000-4000-8000-000000000006'::uuid, '20000000-0000-4000-8000-000000000003'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000004'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000005'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000006'::uuid),
  ('10000000-0000-4000-8000-000000000009'::uuid, '20000000-0000-4000-8000-000000000007'::uuid),
  ('10000000-0000-4000-8000-000000000015'::uuid, '20000000-0000-4000-8000-000000000008'::uuid),
  ('10000000-0000-4000-8000-000000000016'::uuid, '20000000-0000-4000-8000-000000000009'::uuid)
on conflict (session_id, speaker_id) do nothing;

delete from public.notifications
 where source = 'manual_status'
   and created_at < '2026-09-11 09:30:00+08'::timestamptz
   and related_session_id between '10000000-0000-4000-8000-000000000001'::uuid
                              and '10000000-0000-4000-8000-000000000016'::uuid;

do $$
declare
  target_event_id uuid;
  official_session_count bigint;
  clean_session_count bigint;
  expected_link_count bigint;
begin
  select id into strict target_event_id
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026';

  select count(*) into official_session_count
    from public.sessions
   where event_id = target_event_id
     and id between '10000000-0000-4000-8000-000000000001'::uuid
                and '10000000-0000-4000-8000-000000000016'::uuid;

  select count(*) into clean_session_count
    from public.sessions
   where event_id = target_event_id
     and id between '10000000-0000-4000-8000-000000000001'::uuid
                and '10000000-0000-4000-8000-000000000016'::uuid
     and published
     and reminder_sent_at is null
     and status_override is null
     and status_override_at is null
     and status_override_by is null
     and actual_started_at is null
     and actual_ended_at is null;

  select count(*) into expected_link_count
    from public.session_speakers
   where session_id between '10000000-0000-4000-8000-000000000001'::uuid
                        and '10000000-0000-4000-8000-000000000016'::uuid;

  if (select count(*) from public.sessions where event_id = target_event_id) <> 16
     or official_session_count <> 16
     or clean_session_count <> 16
     or expected_link_count <> 9
     or exists (
       select 1
        from public.notifications
        where source = 'manual_status'
          and created_at < '2026-09-11 09:30:00+08'::timestamptz
          and related_session_id between '10000000-0000-4000-8000-000000000001'::uuid
                                     and '10000000-0000-4000-8000-000000000016'::uuid
     ) then
    raise exception
      'official program restore verification failed: sessions %, clean %, links %',
      official_session_count,
      clean_session_count,
      expected_link_count;
  end if;
end;
$$;
