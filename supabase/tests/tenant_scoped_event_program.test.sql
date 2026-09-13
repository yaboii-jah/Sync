begin;

select no_plan();

select ok(
  exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'speakers_sponsors'
       and column_name = 'event_id' and is_nullable = 'NO'
  ) and exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'session_speakers'
       and column_name = 'event_id' and is_nullable = 'NO'
  ) and exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'my_flow_bookmarks'
       and column_name = 'event_id' and is_nullable = 'NO'
  ),
  'all program child rows carry a required event identifier'
);

select ok(
  not has_table_privilege('anon', 'public.sessions', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.speakers_sponsors', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.session_speakers', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'public.my_flow_bookmarks', 'select,insert,update,delete'),
  'anonymous clients cannot access program tables directly'
);

select ok(
  has_table_privilege('authenticated', 'public.sessions', 'select')
  and not has_table_privilege('authenticated', 'public.sessions', 'insert,update,delete')
  and has_table_privilege('authenticated', 'public.speakers_sponsors', 'select')
  and not has_table_privilege('authenticated', 'public.speakers_sponsors', 'insert,update,delete'),
  'authenticated program tables are read-only and rely on RLS'
);

select ok(
  has_function_privilege('anon', 'public.get_public_event_program(text)', 'execute')
  and has_function_privilege('authenticated', 'public.get_public_event_program(text)', 'execute')
  and not has_function_privilege('anon', 'public.admin_create_speaker(uuid,text,text,text,text,text,text,boolean,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.admin_create_speaker(uuid,text,text,text,text,text,text,boolean,uuid)', 'execute'),
  'the public read and authenticated authoring RPC grants are explicit'
);

select is(
  (
    select count(*)::integer from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'get_public_event_program', 'admin_create_session', 'admin_update_session',
        'admin_set_session_published', 'admin_delete_session',
        'admin_create_speaker', 'admin_update_speaker',
        'admin_set_speaker_published', 'admin_delete_speaker',
        'admin_set_session_speakers', 'admin_set_session_status',
        'admin_set_session_capacity', 'toggle_my_flow_bookmark',
        'claim_session_seat', 'release_session_seat'
      )
      and pg_proc.prosecdef
      and pg_proc.proconfig && array['search_path=', 'search_path=""']
  ),
  15,
  'all public program operations are hardened security definers'
);

set local session_replication_role = replica;

insert into auth.users (id, email, email_confirmed_at)
values
  ('41000000-0000-0000-0000-000000000001', 'program-owner-one@example.com', now()),
  ('41000000-0000-0000-0000-000000000002', 'program-admin-one@example.com', now()),
  ('41000000-0000-0000-0000-000000000003', 'program-attendee-one@example.com', now()),
  ('41000000-0000-0000-0000-000000000004', 'program-left-one@example.com', now()),
  ('42000000-0000-0000-0000-000000000001', 'program-owner-two@example.com', now()),
  ('42000000-0000-0000-0000-000000000002', 'program-attendee-two@example.com', now()),
  ('43000000-0000-0000-0000-000000000001', 'program-super@example.com', now());

insert into public.profiles (id, name)
values
  ('41000000-0000-0000-0000-000000000001', 'Program Owner One'),
  ('41000000-0000-0000-0000-000000000002', 'Program Admin One'),
  ('41000000-0000-0000-0000-000000000003', 'Program Attendee One'),
  ('41000000-0000-0000-0000-000000000004', 'Program Left One'),
  ('42000000-0000-0000-0000-000000000001', 'Program Owner Two'),
  ('42000000-0000-0000-0000-000000000002', 'Program Attendee Two'),
  ('43000000-0000-0000-0000-000000000001', 'Program Super');

insert into public.events (
  id, name, starts_at, ends_at, status, theme, slug, timezone,
  lifecycle, ever_published, published_at, theme_preset, accent_color
) values
  ('e1000000-0000-0000-0000-000000000001', 'Program Event One', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Program Event One', 'program-event-one', 'Asia/Manila', 'published', true, now(), 'daylight', '#2563EB'),
  ('e2000000-0000-0000-0000-000000000002', 'Program Event Two', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Program Event Two', 'program-event-two', 'Asia/Manila', 'published', true, now(), 'midnight', '#7C3AED'),
  ('e3000000-0000-0000-0000-000000000003', 'Program Draft', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Program Draft', 'program-draft', 'Asia/Manila', 'draft', false, null, 'festival', '#EA580C');

insert into public.event_memberships (
  id, event_id, user_id, role, status, display_name_snapshot, email_snapshot, ended_at
) values
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'owner', 'active', 'Program Owner One', 'program-owner-one@example.com', null),
  ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', 'admin', 'active', 'Program Admin One', 'program-admin-one@example.com', null),
  ('f1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', 'attendee', 'active', 'Program Attendee One', 'program-attendee-one@example.com', null),
  ('f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 'attendee', 'left', 'Program Left One', 'program-left-one@example.com', now()),
  ('f2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'owner', 'active', 'Program Owner Two', 'program-owner-two@example.com', null),
  ('f2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'attendee', 'active', 'Program Attendee Two', 'program-attendee-two@example.com', null),
  ('f3000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001', 'owner', 'active', 'Program Owner One', 'program-owner-one@example.com', null);

insert into public.platform_super_admins (user_id)
values ('43000000-0000-0000-0000-000000000001');

insert into public.platform_quota_overrides (
  user_id, event_session_limit, reason, updated_by
) values (
  '41000000-0000-0000-0000-000000000001', 4,
  'Exercise the event session quota boundary',
  '43000000-0000-0000-0000-000000000001'
);

set local session_replication_role = origin;

insert into public.sessions (
  id, event_id, title, start_time, end_time, status, published, capacity
) values
  ('51000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Published One', now() + interval '26 hours', now() + interval '27 hours', 'not_started', true, 10),
  ('51000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Draft One', now() + interval '28 hours', now() + interval '29 hours', 'not_started', false, null),
  ('51000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Overlap One', now() + interval '26 hours 30 minutes', now() + interval '27 hours 30 minutes', 'not_started', true, null),
  ('52000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'Published Two', now() + interval '26 hours', now() + interval '27 hours', 'not_started', true, null),
  ('53000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000003', 'Draft Event Session', now() + interval '26 hours', now() + interval '27 hours', 'not_started', false, null);

insert into public.speakers_sponsors (
  id, event_id, name, role, published
) values
  ('61000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Published Speaker One', 'speaker', true),
  ('61000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Draft Speaker One', 'speaker', false),
  ('62000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'Published Speaker Two', 'speaker', true);

insert into public.session_speakers (event_id, session_id, speaker_id)
values
  ('e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002'),
  ('e2000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001');

set local role anon;

select is(
  jsonb_array_length(public.get_public_event_program('program-event-one') -> 'sessions'),
  2,
  'the anonymous program RPC returns only published sessions'
);

select is(
  jsonb_array_length(public.get_public_event_program('program-event-one') -> 'speakers'),
  1,
  'the anonymous program RPC returns only explicitly published speakers'
);

select is(
  public.get_public_event_program('program-draft'),
  null,
  'draft events have no anonymous program payload'
);

set local role authenticated;
set local request.jwt.claim.sub = '41000000-0000-0000-0000-000000000003';

select is(
  (select count(*)::integer from public.sessions),
  2,
  'an attendee sees only published sessions in their event'
);

select is(
  (select count(*)::integer from public.speakers_sponsors),
  1,
  'an attendee sees only published speakers in their event'
);

select is(
  (select count(*)::integer from public.session_speakers),
  1,
  'an attendee sees only links between visible event content'
);

set local request.jwt.claim.sub = '41000000-0000-0000-0000-000000000004';

select is_empty(
  $$select id from public.sessions where event_id = 'e1000000-0000-0000-0000-000000000001'$$,
  'an inactive membership cannot read event sessions'
);

set local request.jwt.claim.sub = '42000000-0000-0000-0000-000000000001';

select results_eq(
  $$select event_id from public.sessions$$,
  $$values ('e2000000-0000-0000-0000-000000000002'::uuid)$$,
  'event staff cannot read another tenant program'
);

set local request.jwt.claim.sub = '43000000-0000-0000-0000-000000000001';

select is_empty(
  $$select id from public.sessions where event_id = 'e1000000-0000-0000-0000-000000000001'$$,
  'a super admin has no blanket program-content access'
);

select lives_ok(
  $$select public.start_event_support_session(
    'e1000000-0000-0000-0000-000000000001',
    'Investigating an organizer program issue',
    '71000000-0000-0000-0000-000000000001'
  )$$,
  'a super admin can open scoped program support'
);

select is(
  (select count(*)::integer from public.sessions where event_id = 'e1000000-0000-0000-0000-000000000001'),
  3,
  'active support reveals published and draft program rows for one event'
);

select lives_ok(
  $$select public.admin_create_speaker(
    'e1000000-0000-0000-0000-000000000001', 'Support Added Speaker',
    null, 'speaker', null, null, null, false,
    '71000000-0000-0000-0000-000000000002'
  )$$,
  'active support receives admin-level program authoring'
);

select throws_ok(
  $$select public.admin_create_speaker(
    'e2000000-0000-0000-0000-000000000002', 'Cross Tenant Support',
    null, 'speaker', null, null, null, false,
    '71000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'event staff access required',
  'support authority does not cross event boundaries'
);

select lives_ok(
  $$select public.end_event_support_session(
    (select id from public.platform_support_sessions
      where event_id = 'e1000000-0000-0000-0000-000000000001'
        and super_admin_user_id = '43000000-0000-0000-0000-000000000001'),
    '71000000-0000-0000-0000-000000000004'
  )$$,
  'program support access can be ended'
);

set local request.jwt.claim.sub = '41000000-0000-0000-0000-000000000002';

select is(
  public.admin_create_session(
    'e1000000-0000-0000-0000-000000000001', 'Admin Created Session',
    null, 'Room A', now() + interval '30 hours', now() + interval '31 hours',
    false, '72000000-0000-0000-0000-000000000001'
  ),
  public.admin_create_session(
    'e1000000-0000-0000-0000-000000000001', 'Admin Created Session',
    null, 'Room A', now() + interval '30 hours', now() + interval '31 hours',
    false, '72000000-0000-0000-0000-000000000001'
  ),
  'session creation is idempotent for the same request UUID'
);

select throws_ok(
  $$select public.admin_create_session(
    'e1000000-0000-0000-0000-000000000001', 'Outside Event',
    null, null, now() + interval '47 hours', now() + interval '49 hours',
    false, '72000000-0000-0000-0000-000000000002'
  )$$,
  'P0001', 'session must be within the event window',
  'session authoring enforces the event time window'
);

select throws_ok(
  $$select public.admin_create_session(
    'e1000000-0000-0000-0000-000000000001', 'Over Quota',
    null, null, now() + interval '32 hours', now() + interval '33 hours',
    false, '72000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'event session limit reached',
  'session creation enforces the event owner quota'
);

select throws_ok(
  $$select public.admin_update_session(
    '52000000-0000-0000-0000-000000000001', 'Cross Tenant Update',
    null, null, now() + interval '26 hours', now() + interval '27 hours',
    '72000000-0000-0000-0000-000000000004'
  )$$,
  'P0001', 'event staff access required',
  'an event admin cannot update another tenant session'
);

select throws_ok(
  $$select public.admin_set_session_status(
    '51000000-0000-0000-0000-000000000001', 'start', true,
    '72000000-0000-0000-0000-000000000005'
  )$$,
  'P0001', 'event notifications are not yet available',
  'schedule status cannot send an unscoped legacy notification'
);

select lives_ok(
  $$select public.admin_set_session_speakers(
    '51000000-0000-0000-0000-000000000002',
    array['61000000-0000-0000-0000-000000000001'::uuid],
    '72000000-0000-0000-0000-000000000006'
  )$$,
  'event staff can atomically replace a session speaker list'
);

select throws_ok(
  $$select public.admin_set_session_speakers(
    '51000000-0000-0000-0000-000000000002',
    array['62000000-0000-0000-0000-000000000001'::uuid],
    '72000000-0000-0000-0000-000000000007'
  )$$,
  'P0001', 'every speaker must belong to the session event',
  'a cross-tenant session-speaker link is refused'
);

select lives_ok(
  $$select public.admin_set_speaker_published(
    '61000000-0000-0000-0000-000000000002', true,
    '72000000-0000-0000-0000-000000000008'
  )$$,
  'event staff can explicitly publish a speaker'
);

set local request.jwt.claim.sub = '41000000-0000-0000-0000-000000000003';

select is(
  (public.toggle_my_flow_bookmark('51000000-0000-0000-0000-000000000001') ->> 'bookmarked')::boolean,
  true,
  'an active attendee can bookmark a published session'
);

select results_eq(
  $$select event_id from public.my_flow_bookmarks
     where session_id = '51000000-0000-0000-0000-000000000001'$$,
  $$values ('e1000000-0000-0000-0000-000000000001'::uuid)$$,
  'bookmark writes persist the derived tenant identifier'
);

select throws_ok(
  $$select public.toggle_my_flow_bookmark('52000000-0000-0000-0000-000000000001')$$,
  'P0001', 'active event membership required',
  'an attendee cannot bookmark another tenant session'
);

select lives_ok(
  $$select public.claim_session_seat('51000000-0000-0000-0000-000000000001')$$,
  'seat claiming remains compatible with event-scoped bookmarks'
);

select throws_ok(
  $$select public.claim_session_seat('52000000-0000-0000-0000-000000000001')$$,
  'P0001', 'active event membership required',
  'seat claiming cannot cross tenant boundaries'
);

set local request.jwt.claim.sub = '43000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.set_event_suspension(
    'e1000000-0000-0000-0000-000000000001', true,
    'Suspending program access for a safety review',
    '73000000-0000-0000-0000-000000000001'
  )$$,
  'a super admin can suspend the program tenant'
);

set local request.jwt.claim.sub = '41000000-0000-0000-0000-000000000003';

select is_empty(
  $$select id from public.sessions where event_id = 'e1000000-0000-0000-0000-000000000001'$$,
  'suspension removes ordinary program visibility'
);

select throws_ok(
  $$select public.toggle_my_flow_bookmark('51000000-0000-0000-0000-000000000003')$$,
  'P0001', 'event schedule is read-only',
  'suspension blocks bookmark mutations'
);

reset role;

select throws_ok(
  $$insert into public.session_speakers (event_id, session_id, speaker_id)
    values (
      'e1000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000002',
      '62000000-0000-0000-0000-000000000001'
    )$$,
  '23503',
  'insert or update on table "session_speakers" violates foreign key constraint "session_speakers_speaker_fkey"',
  'the composite foreign key rejects a direct cross-tenant speaker link'
);

select throws_ok(
  $$update public.events
       set starts_at = now() + interval '27 hours'
     where id = 'e1000000-0000-0000-0000-000000000001'$$,
  'P0001', 'event window must contain every existing session',
  'event date edits cannot strand existing sessions'
);

select ok(
  exists (
    select 1 from public.event_audit_log
     where event_id = 'e1000000-0000-0000-0000-000000000001'
       and action = 'session.create'
       and request_id = '72000000-0000-0000-0000-000000000001'
  ) and exists (
    select 1 from public.event_audit_log
     where event_id = 'e1000000-0000-0000-0000-000000000001'
       and action = 'speaker.create'
       and actor_membership_id is null
  ),
  'program authoring records tenant-scoped staff and support audit entries'
);

select * from finish();
rollback;
