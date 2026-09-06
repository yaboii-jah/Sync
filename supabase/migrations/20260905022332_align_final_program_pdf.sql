-- Align the deployed attendee-facing program with the revised finalized PDF.
-- Break/transition cells in the technical-workshop table remain operational
-- notes rather than new selectable sessions; the app continues to expose the
-- 13 main rows plus Workshop Tracks A-C.

do $$
declare
  target_event_id uuid;
  event_session_count bigint;
  expected_session_count bigint;
begin
  select id into target_event_id
    from public.events
   where name = 'AWS Student Community Day Mega Manila 2026';

  if target_event_id is null then
    raise exception 'finalized event was not found';
  end if;

  select count(*) into event_session_count
    from public.sessions
   where event_id = target_event_id;

  select count(*) into expected_session_count
    from public.sessions
   where event_id = target_event_id
     and id in (
       '10000000-0000-4000-8000-000000000001'::uuid,
       '10000000-0000-4000-8000-000000000002'::uuid,
       '10000000-0000-4000-8000-000000000003'::uuid,
       '10000000-0000-4000-8000-000000000004'::uuid,
       '10000000-0000-4000-8000-000000000005'::uuid,
       '10000000-0000-4000-8000-000000000006'::uuid,
       '10000000-0000-4000-8000-000000000007'::uuid,
       '10000000-0000-4000-8000-000000000008'::uuid,
       '10000000-0000-4000-8000-000000000009'::uuid,
       '10000000-0000-4000-8000-000000000010'::uuid,
       '10000000-0000-4000-8000-000000000011'::uuid,
       '10000000-0000-4000-8000-000000000012'::uuid,
       '10000000-0000-4000-8000-000000000013'::uuid,
       '10000000-0000-4000-8000-000000000014'::uuid,
       '10000000-0000-4000-8000-000000000015'::uuid,
       '10000000-0000-4000-8000-000000000016'::uuid
     );

  if event_session_count <> 16 or expected_session_count <> 16 then
    raise exception
      'revised program guard failed: event sessions %, known sessions %',
      event_session_count,
      expected_session_count;
  end if;
end;
$$;

with revised(
  id,
  title,
  description,
  start_time,
  end_time
) as (
  values
    (
      '10000000-0000-4000-8000-000000000009'::uuid,
      'Panel Discussion: From Students to Builders: Navigating Careers in Cloud, AI, and the Agentic Era',
      'The discussion will focus on how students and emerging builders can transition from academic learning and hands-on experimentation into careers in Cloud, AI, and agentic technologies.',
      '2026-09-11 14:30:00+08'::timestamptz,
      '2026-09-11 16:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000010'::uuid,
      'Plenary Reconvene, Awarding and Acknowledgements of Community Partners and Sponsor',
      null::text,
      '2026-09-11 16:00:00+08'::timestamptz,
      '2026-09-11 16:30:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000011'::uuid,
      'Awarding Ceremony (AWS BuilderCards & Raffles)',
      null::text,
      '2026-09-11 16:50:00+08'::timestamptz,
      '2026-09-11 17:30:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000012'::uuid,
      'Organizing Committee Acknowledgement (AWS BuilderCards & Raffles)',
      null::text,
      '2026-09-11 16:30:00+08'::timestamptz,
      '2026-09-11 16:50:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000013'::uuid,
      'Closing Remarks, Wrap-up & Photo Opportunity',
      null::text,
      '2026-09-11 17:30:00+08'::timestamptz,
      '2026-09-11 18:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000014'::uuid,
      'Workshop Track A: Agora Agents SDK Workshop',
      'Facilitators: Agora Ambassadors. This workshop runs simultaneously with Tech Talk 1.',
      '2026-09-11 11:05:00+08'::timestamptz,
      '2026-09-11 11:50:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000015'::uuid,
      'Workshop Track B: AWS MCP + OpenCode: Agentic Workflows and MCP Concepts',
      'Facilitator: David Marquez. This workshop runs simultaneously with Tech Talk 2.',
      '2026-09-11 13:15:00+08'::timestamptz,
      '2026-09-11 14:00:00+08'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000016'::uuid,
      'Workshop Track C: AWS BuilderCards Tournament',
      'Facilitator: Neil Riego. Team-based Build Challenge. Four teams with four members each (16 participants total). Open to all registered pass holders. This workshop/activity runs simultaneously with the Panel Discussion.',
      '2026-09-11 14:30:00+08'::timestamptz,
      '2026-09-11 16:00:00+08'::timestamptz
    )
)
update public.sessions as sessions
   set title = revised.title,
       description = revised.description,
       start_time = revised.start_time,
       end_time = revised.end_time,
       status = case
         when sessions.status_override is not null then sessions.status
         when now() < revised.start_time then 'not_started'
         when now() >= revised.end_time then 'finished'
         else 'ongoing'
       end
  from revised
 where sessions.id = revised.id
   and sessions.event_id = (
     select id
       from public.events
      where name = 'AWS Student Community Day Mega Manila 2026'
   );

do $$
declare
  revised_session_count bigint;
  revised_parallel_count bigint;
begin
  select count(*) into revised_session_count
    from public.sessions
   where id in (
     '10000000-0000-4000-8000-000000000009'::uuid,
     '10000000-0000-4000-8000-000000000010'::uuid,
     '10000000-0000-4000-8000-000000000011'::uuid,
     '10000000-0000-4000-8000-000000000012'::uuid,
     '10000000-0000-4000-8000-000000000013'::uuid,
     '10000000-0000-4000-8000-000000000014'::uuid,
     '10000000-0000-4000-8000-000000000015'::uuid,
     '10000000-0000-4000-8000-000000000016'::uuid
   )
   and (
     (id = '10000000-0000-4000-8000-000000000009'::uuid and end_time = '2026-09-11 16:00:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000010'::uuid and start_time = '2026-09-11 16:00:00+08'::timestamptz and end_time = '2026-09-11 16:30:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000011'::uuid and start_time = '2026-09-11 16:50:00+08'::timestamptz and end_time = '2026-09-11 17:30:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000012'::uuid and start_time = '2026-09-11 16:30:00+08'::timestamptz and end_time = '2026-09-11 16:50:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000013'::uuid and start_time = '2026-09-11 17:30:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000014'::uuid and end_time = '2026-09-11 11:50:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000015'::uuid and end_time = '2026-09-11 14:00:00+08'::timestamptz)
     or (id = '10000000-0000-4000-8000-000000000016'::uuid and end_time = '2026-09-11 16:00:00+08'::timestamptz)
   );

  select count(*) into revised_parallel_count
    from (
      select start_time
        from public.sessions
       where start_time in (
         '2026-09-11 11:05:00+08'::timestamptz,
         '2026-09-11 13:15:00+08'::timestamptz,
         '2026-09-11 14:30:00+08'::timestamptz
       )
       group by start_time
       having count(*) = 2
    ) parallel_groups;

  if revised_session_count <> 8 or revised_parallel_count <> 3 then
    raise exception
      'revised program verification failed: rows %, parallel groups %',
      revised_session_count,
      revised_parallel_count;
  end if;
end;
$$;
