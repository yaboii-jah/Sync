-- Finalized AWS Student Community Day Mega Manila 2026 program.
--
-- This migration intentionally replaces the development seed in one
-- transaction. The assertions below fail closed if the linked project no
-- longer contains the expected placeholder dataset.

alter table public.events
  add column if not exists theme text;

update public.events
   set name = 'AWS Student Community Day Mega Manila 2026',
       venue = 'Asia Pacific College',
       starts_at = '2026-09-11 09:30:00+08',
       ends_at = '2026-09-11 18:00:00+08',
       theme = 'BUILD. FORGE. REPEAT.',
       status = case
         when now() < '2026-09-11 09:30:00+08'::timestamptz then 'upcoming'
         when now() >= '2026-09-11 18:00:00+08'::timestamptz then 'ended'
         else 'started'
       end
 where name = 'SCD Mega Manila 2026';

alter table public.events
  alter column theme set not null;

alter table public.events
  add constraint events_theme_nonempty
  check (length(trim(theme)) > 0);

alter table public.speakers_sponsors
  drop constraint if exists speakers_sponsors_role_check;

alter table public.speakers_sponsors
  add constraint speakers_sponsors_role_check
  check (role in ('speaker', 'host', 'panelist', 'sponsor', 'facilitator'));

do $$
declare
  event_count bigint;
  target_event_id uuid;
  session_count bigint;
  expected_session_count bigint;
  person_count bigint;
  expected_person_count bigint;
begin
  select count(*) into event_count
    from public.events;

  if event_count <> 1 then
    raise exception 'finalized program requires exactly one event, found %', event_count;
  end if;

  select id into target_event_id
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026';

  if target_event_id is null then
    raise exception 'placeholder event was not found';
  end if;

  select count(*) into session_count
    from public.sessions
   where event_id = target_event_id;

  select count(*) into expected_session_count
    from public.sessions
   where event_id = target_event_id
     and title in (
       'Registration & Welcome',
       'Opening Keynote',
       'Cloud 101 for Students',
       'Breaking into Tech',
       'Lunch Break',
       'Panel: Careers in Cloud',
       'Serverless in Practice',
       'AI on AWS',
       'Closing Remarks & Photo Booth',
       'Live Highlight Test'
     );

  if session_count <> 9 or expected_session_count <> 9 then
    raise exception
      'placeholder session guard failed: found %, expected known rows %',
      session_count,
      expected_session_count;
  end if;

  select count(*) into person_count
    from public.speakers_sponsors;

  select count(*) into expected_person_count
    from public.speakers_sponsors
   where name in (
     'Maria Santos',
     'Juan Dela Cruz',
     'Angela Reyes',
     'Paolo Mendoza',
     'Kim Villanueva',
     'Bea Lim',
     'Carlo Garcia',
     'Ina Torres'
   );

  if person_count <> 8 or expected_person_count <> 8 then
    raise exception
      'placeholder directory guard failed: found %, expected known rows %',
      person_count,
      expected_person_count;
  end if;
end;
$$;

do $$
declare
  target_event_id uuid;
begin
  select id into target_event_id
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026';

  delete from public.sessions
   where event_id = target_event_id;

  delete from public.speakers_sponsors
   where name in (
     'Maria Santos',
     'Juan Dela Cruz',
     'Angela Reyes',
     'Paolo Mendoza',
     'Kim Villanueva',
     'Bea Lim',
     'Carlo Garcia',
     'Ina Torres'
   );
end;
$$;

with event_row as (
  select id
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026'
), finalized(
  id,
  title,
  description,
  room,
  start_time,
  end_time,
  status,
  published
) as (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'Registration and Check-in of Attendees',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 09:30:00+08'::timestamptz,
      '2026-09-11 10:30:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'Opening Remarks',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 10:30:00+08'::timestamptz,
      '2026-09-11 10:45:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000003'::uuid,
      'Keynote Address: From Student Builder to Cloud Leader',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 10:45:00+08'::timestamptz,
      '2026-09-11 11:05:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000004'::uuid,
      'Tech Talk 1: The Future of Careers in Cloud, AI, and Platform Engineering',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 11:05:00+08'::timestamptz,
      '2026-09-11 11:50:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000005'::uuid,
      'Lunch Break & Networking',
      null::text,
      'MPH1 (1F)',
      '2026-09-11 11:50:00+08'::timestamptz,
      '2026-09-11 13:15:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000006'::uuid,
      'Tech Talk 2: Agents, APIs, and AWS: How Builders Are Automating the Cloud',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 13:15:00+08'::timestamptz,
      '2026-09-11 14:00:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000007'::uuid,
      'AVP for Sponsors',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 14:00:00+08'::timestamptz,
      '2026-09-11 14:15:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000008'::uuid,
      'Venue Partner Segment & Transition to Workshops',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 14:15:00+08'::timestamptz,
      '2026-09-11 14:30:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000009'::uuid,
      'Panel Discussion: From Students to Builders: Navigating Careers in Cloud, AI, and the Agentic Era',
      'This discussion will focus on how students and emerging builders can transition from academic learning and hands-on experimentation into careers in Cloud, AI, and agentic technologies.',
      'Auditorium (12F)',
      '2026-09-11 14:30:00+08'::timestamptz,
      '2026-09-11 17:00:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000010'::uuid,
      'Plenary Reconvene & Sponsor Acknowledgements',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 17:00:00+08'::timestamptz,
      '2026-09-11 17:10:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000011'::uuid,
      'Awarding Ceremony (AWS BuilderCards & Raffles)',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 17:10:00+08'::timestamptz,
      '2026-09-11 17:25:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000012'::uuid,
      'Organizing Committee Acknowledgement',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 17:25:00+08'::timestamptz,
      '2026-09-11 17:40:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000013'::uuid,
      'Closing Remarks, Wrap-up & Photo Opportunity',
      null::text,
      'Auditorium (12F)',
      '2026-09-11 17:40:00+08'::timestamptz,
      '2026-09-11 18:00:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000014'::uuid,
      'Workshop Track A: Agora Agents SDK Workshop',
      'Facilitators: Agora Ambassadors. This workshop runs simultaneously with Tech Talk 1.',
      'Rooms 306 & 304 (3F)',
      '2026-09-11 11:05:00+08'::timestamptz,
      '2026-09-11 11:50:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000015'::uuid,
      'Workshop Track B: AWS MCP + OpenCode: Agentic Workflows and MCP Concepts',
      'This workshop runs simultaneously with Tech Talk 2.',
      'Rooms 306 & 304 (3F)',
      '2026-09-11 13:15:00+08'::timestamptz,
      '2026-09-11 14:00:00+08'::timestamptz,
      'not_started',
      true
    ),
    (
      '10000000-0000-4000-8000-000000000016'::uuid,
      'Workshop Track C: AWS BuilderCards Tournament',
      'Team-based Build Challenge. Four teams with four members each (16 participants total). Open to all registered pass holders.',
      'MPH1 (1F)',
      '2026-09-11 14:30:00+08'::timestamptz,
      '2026-09-11 17:00:00+08'::timestamptz,
      'not_started',
      true
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
  published
)
select finalized.id,
       event_row.id,
       finalized.title,
       finalized.description,
       finalized.room,
       finalized.start_time,
       finalized.end_time,
       finalized.status,
       finalized.published
  from finalized
 cross join event_row;

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
  ('20000000-0000-4000-8000-000000000009'::uuid, 'Neil Riego', 'facilitator');

insert into public.session_speakers (session_id, speaker_id)
values
  (
    '10000000-0000-4000-8000-000000000003'::uuid,
    '20000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000004'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000006'::uuid,
    '20000000-0000-4000-8000-000000000003'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000009'::uuid,
    '20000000-0000-4000-8000-000000000004'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000009'::uuid,
    '20000000-0000-4000-8000-000000000005'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000009'::uuid,
    '20000000-0000-4000-8000-000000000006'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000009'::uuid,
    '20000000-0000-4000-8000-000000000007'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000015'::uuid,
    '20000000-0000-4000-8000-000000000008'::uuid
  ),
  (
    '10000000-0000-4000-8000-000000000016'::uuid,
    '20000000-0000-4000-8000-000000000009'::uuid
  );

comment on column public.events.theme is
  'The event theme shown alongside the finalized program.';

-- Return every published current/next choice to the operations dashboard.
create or replace function public.admin_get_dashboard()
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
    'attendee_count', (select count(*) from public.profiles),
    'push_enabled_attendees', (
      select count(distinct user_id) from public.push_subscriptions
    ),
    'push_device_count', (select count(*) from public.push_subscriptions),
    'override_count', (
      select count(*) from public.sessions where status_override is not null
    ),
    'failed_dispatch_count', (
      select count(*) from public.notification_dispatches where status = 'failed'
    ),
    'current_sessions', coalesce((
      select jsonb_agg(
        to_jsonb(current_session)
        order by
          coalesce(current_session.actual_started_at, current_session.start_time) desc,
          current_session.start_time,
          current_session.id
      )
        from (
          select id,
                 title,
                 room,
                 status,
                 status_override,
                 actual_started_at,
                 start_time,
                 end_time
            from public.sessions
           where status = 'ongoing'
             and published
        ) as current_session
    ), '[]'::jsonb),
    'next_sessions', coalesce((
      select jsonb_agg(
        to_jsonb(next_session)
        order by next_session.start_time, next_session.id
      )
        from (
          select id, title, room, status, start_time, end_time
            from public.sessions
           where status = 'not_started'
             and published
             and start_time = (
               select min(upcoming.start_time)
                 from public.sessions as upcoming
                where upcoming.status = 'not_started'
                  and upcoming.published
             )
        ) as next_session
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Bookmark writes go through one atomic function so the save result can carry
-- overlap information without allowing clients to bypass finished-session
-- checks. Direct table writes are removed; scheduled/admin functions remain
-- able to perform their own system cleanup.
drop policy if exists "Users can create own bookmarks" on public.my_flow_bookmarks;
drop policy if exists "Users can create own unfinished bookmarks" on public.my_flow_bookmarks;
drop policy if exists "Users can delete own bookmarks" on public.my_flow_bookmarks;
revoke insert, delete on public.my_flow_bookmarks from authenticated;

create or replace function public.toggle_my_flow_bookmark(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.sessions%rowtype;
  already_bookmarked boolean;
  conflicts jsonb;
begin
  if actor is null then
    raise exception 'not signed in';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  select sessions.* into target
    from public.sessions as sessions
   where sessions.id = target_session_id
     and sessions.published;

  if not found then
    raise exception 'session not found';
  end if;

  select exists (
    select 1
      from public.my_flow_bookmarks as bookmarks
     where bookmarks.user_id = actor
       and bookmarks.session_id = target.id
  ) into already_bookmarked;

  if already_bookmarked then
    delete from public.my_flow_bookmarks as bookmarks
     where bookmarks.user_id = actor
       and bookmarks.session_id = target.id;

    return jsonb_build_object(
      'bookmarked', false,
      'conflicts', '[]'::jsonb
    );
  end if;

  if target.status = 'finished'
     or target.status_override = 'finished'
     or (
       target.status_override is null
       and now() >= target.end_time
     ) then
    raise exception 'finished sessions cannot be added to My Flow';
  end if;

  insert into public.my_flow_bookmarks (user_id, session_id)
  values (actor, target.id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sessions.id,
        'title', sessions.title,
        'start_time', sessions.start_time,
        'end_time', sessions.end_time,
        'room', sessions.room
      )
      order by sessions.start_time, sessions.end_time, sessions.id
    ),
    '[]'::jsonb
  ) into conflicts
    from public.my_flow_bookmarks as bookmarks
    join public.sessions as sessions
      on sessions.id = bookmarks.session_id
   where bookmarks.user_id = actor
     and bookmarks.session_id <> target.id
     and sessions.published
     and (
       (
         sessions.status_override is not null
         and sessions.status_override <> 'finished'
       )
       or (
         sessions.status_override is null
         and now() < sessions.end_time
       )
     )
     and sessions.start_time < target.end_time
     and sessions.end_time > target.start_time;

  return jsonb_build_object(
    'bookmarked', true,
    'conflicts', conflicts
  );
end;
$$;

revoke all on function public.toggle_my_flow_bookmark(uuid) from public;
grant execute on function public.toggle_my_flow_bookmark(uuid) to authenticated;

do $$
declare
  finalized_session_count bigint;
  finalized_people_count bigint;
  finalized_link_count bigint;
begin
  select count(*) into finalized_session_count
    from public.sessions
   where event_id = (
     select id from public.events
      where name = 'AWS Student Community Day Mega Manila 2026'
   );

  select count(*) into finalized_people_count
    from public.speakers_sponsors
   where name in (
     'Isaeus Guiang',
     'Raphael Justin Jambalos',
     'Jared Remulta',
     'Josh Kenn Viray',
     'Lesmon Saluta',
     'Karen Pearl Pabilando',
     'Gen Benedict Casio',
     'David Marquez',
     'Neil Riego'
   );

  select count(*) into finalized_link_count
    from public.session_speakers;

  if finalized_session_count <> 16
     or finalized_people_count <> 9
     or finalized_link_count <> 9 then
    raise exception
      'finalized program verification failed: sessions %, people %, links %',
      finalized_session_count,
      finalized_people_count,
      finalized_link_count;
  end if;
end;
$$;
