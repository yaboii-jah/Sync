begin;

select plan(33);

select ok(
  (
    select relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
  ),
  'app_feedback has row-level security enabled'
);

select is(
  (
    select count(*)::integer
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
  ),
  1,
  'app_feedback has exactly one insert policy'
);

select is(
  (
    select pg_policy.polcmd::text
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
  ),
  'a',
  'the app_feedback policy only permits inserts'
);

select ok(
  (
    select pg_get_expr(pg_policy.polwithcheck, pg_policy.polrelid)
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
  ) like '%auth.uid%'
  and (
    select pg_get_expr(pg_policy.polwithcheck, pg_policy.polrelid)
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
  ) like '%user_id%',
  'the app_feedback policy binds inserted rows to auth.uid()'
);

select ok(
  has_table_privilege('anon', 'public.app_feedback', 'select,insert,update,delete') = false,
  'anonymous clients have no app_feedback table privileges'
);

select ok(
  has_table_privilege('authenticated', 'public.app_feedback', 'select,update,delete') = false,
  'attendees cannot read, update, or delete app_feedback'
);

select ok(
  has_column_privilege('authenticated', 'public.app_feedback', 'category', 'insert'),
  'attendees can insert the feedback category'
);

select ok(
  has_column_privilege('authenticated', 'public.app_feedback', 'message', 'insert'),
  'attendees can insert the feedback message'
);

select ok(
  has_column_privilege('authenticated', 'public.app_feedback', 'request_id', 'insert'),
  'attendees can insert the request UUID'
);

select ok(
  has_column_privilege('authenticated', 'public.app_feedback', 'user_id', 'insert') = false,
  'attendees cannot supply a feedback owner directly'
);

select ok(
  (
    select count(*) = 1
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
       and pg_constraint.conname = 'app_feedback_request_unique'
  ),
  'feedback retries are unique per attendee and request UUID'
);

select ok(
  (
    select pg_get_constraintdef(oid)
      from pg_constraint
     where conname = 'app_feedback_request_unique'
  ) like '%user_id%request_id%',
  'the uniqueness constraint covers both the attendee and request UUID'
);

select is(
  (
    select count(*)::integer
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'app_feedback'
       and pg_constraint.contype = 'c'
  ),
  2,
  'feedback has category and trimmed-message checks'
);

select is(
  (
    select confdeltype::text
      from pg_constraint
     where conname = 'app_feedback_user_id_fkey'
  ),
  'c',
  'feedback cascades when its attendee profile is deleted'
);

select ok(
  (
    select count(*) = 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'admin_list_feedback'
       and pg_proc.prosecdef
       and pg_proc.proconfig @> array['search_path=']
  ),
  'the admin feedback function is a security definer with a pinned search path'
);

select ok(
  (
    select count(*) = 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'submit_app_feedback'
       and not pg_proc.prosecdef
       and pg_proc.proconfig @> array['search_path=']
  ),
  'the attendee feedback function preserves invoker RLS with a pinned search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.admin_list_feedback(integer)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.submit_app_feedback(text, text, uuid)',
    'execute'
  ),
  'anonymous clients cannot execute feedback functions'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.admin_list_feedback(integer)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.submit_app_feedback(text, text, uuid)',
    'execute'
  ),
  'authenticated clients can call the database-gated feedback functions'
);

select ok(
  (
    select count(*) = 1
      from pg_index
      join pg_class on pg_class.oid = pg_index.indexrelid
      join pg_class as table_class on table_class.oid = pg_index.indrelid
      join pg_namespace on pg_namespace.oid = table_class.relnamespace
     where pg_class.relname = 'app_feedback_created_at_idx'
       and pg_namespace.nspname = 'public'
       and table_class.relname = 'app_feedback'
       and pg_get_indexdef(pg_index.indexrelid) like '%created_at DESC%'
       and pg_get_indexdef(pg_index.indexrelid) like '%id DESC%'
  ),
  'feedback has a newest-first admin list index'
);

select is(
  (
    select url
      from public.quick_links
     where label = 'Feedback'
  ),
  '/more/feedback',
  'More includes the native feedback quick link'
);

set local session_replication_role = replica;

insert into auth.users (id, email)
values
  ('44444444-4444-4444-4444-444444444444', 'feedback-owner@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'feedback-stranger@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'feedback-admin@example.com');

insert into public.profiles (id, name, photo_url)
values
  ('44444444-4444-4444-4444-444444444444', 'Feedback Owner', 'https://example.com/owner.png'),
  ('55555555-5555-5555-5555-555555555555', 'Feedback Stranger', null),
  ('66666666-6666-6666-6666-666666666666', 'Feedback Admin', null);

insert into public.app_feedback (user_id, category, message, request_id)
select
  '44444444-4444-4444-4444-444444444444',
  'bug',
  'Seed feedback ' || series,
  gen_random_uuid()
from generate_series(1, 101) as series;

insert into public.admin_users (user_id)
values ('66666666-6666-6666-6666-666666666666');

set local session_replication_role = origin;
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select lives_ok(
  $$select public.submit_app_feedback(
    'bug',
    '  The attendee feedback form works.  ',
    '77777777-7777-4777-8777-777777777777'
  )$$,
  'an attendee can submit feedback without supplying an owner'
);

select lives_ok(
  $$select public.submit_app_feedback(
    'idea',
    'A duplicate retry is a no-op.',
    '77777777-7777-4777-8777-777777777777'
  )$$,
  'a repeated request UUID is an idempotent no-op'
);

set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

select lives_ok(
  $$select public.submit_app_feedback(
    'usability',
    'The same request UUID is valid for another attendee.',
    '77777777-7777-4777-8777-777777777777'
  )$$,
  'the request UUID is unique per attendee rather than globally'
);

select throws_ok(
  $$select public.submit_app_feedback(
    'other',
    'An invalid category.',
    '88888888-8888-4888-8888-888888888888'
  )$$,
  '23514',
  null,
  'an invalid feedback category is rejected'
);

select throws_ok(
  $$select public.submit_app_feedback(
    'bug',
    '   ',
    '99999999-9999-4999-8999-999999999999'
  )$$,
  '23514',
  null,
  'a blank feedback message is rejected'
);

select throws_ok(
  $$select public.submit_app_feedback(
    'bug',
    repeat('x', 2001),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )$$,
  '23514',
  null,
  'a feedback message over 2000 characters is rejected'
);

select throws_ok(
  $$select public.submit_app_feedback(
    'bug',
    'A missing request UUID.',
    null
  )$$,
  '23502',
  null,
  'a missing request UUID is rejected'
);

select throws_ok(
  $$insert into public.app_feedback (category, message, request_id, user_id)
    values ('idea', 'A forged owner.', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444')$$,
  '42501',
  null,
  'an attendee cannot supply the feedback owner'
);

select throws_ok(
  $$select * from public.admin_list_feedback(100)$$,
  'P0001',
  'admin access required',
  'a non-admin cannot read feedback through the admin function'
);

set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select is(
  (
    select count(*)
      from public.admin_list_feedback(100)
  ),
  100::bigint,
  'the admin feedback function caps results at 100 newest submissions'
);

select ok(
  (
    select pg_get_function_result(pg_proc.oid)
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'admin_list_feedback'
  ) like '%category%'
  and (
    select pg_get_function_result(pg_proc.oid)
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'admin_list_feedback'
  ) like '%attendee_name%'
  and (
    select pg_get_function_result(pg_proc.oid)
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'admin_list_feedback'
  ) like '%attendee_photo_url%',
  'the admin function exposes only the documented feedback fields'
);

set local role postgres;

select is(
  (
    select count(*)
      from public.app_feedback
     where user_id = '44444444-4444-4444-4444-444444444444'
  ),
  102::bigint,
  'the idempotent owner submission adds exactly one row'
);

delete from public.profiles
 where id = '44444444-4444-4444-4444-444444444444';

select is(
  (
    select count(*)
      from public.app_feedback
     where user_id = '44444444-4444-4444-4444-444444444444'
  ),
  0::bigint,
  'profile deletion cascades to the attendee feedback rows'
);

select * from finish();
rollback;
