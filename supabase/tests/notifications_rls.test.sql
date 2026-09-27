begin;

select plan(11);

select ok(
  (
    select relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'notifications'
  ),
  'notifications has row-level security enabled'
);

select is(
  (
    select count(*)::integer
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'notifications'
       and pg_policy.polcmd in ('r', '*')
  ),
  1,
  'notifications has exactly one read policy'
);

select ok(
  (
    select pg_get_expr(pg_policy.polqual, pg_policy.polrelid)
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'notifications'
       and pg_policy.polname = 'Recipients and admins can view notifications'
  ) like '%notification_recipients%'
  and (
    select pg_get_expr(pg_policy.polqual, pg_policy.polrelid)
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'notifications'
       and pg_policy.polname = 'Recipients and admins can view notifications'
  ) like '%is_admin%',
  'notification reads require admin access or a matching recipient snapshot'
);

select ok(
  has_table_privilege('anon', 'public.notifications', 'select') = false,
  'anon cannot read notifications'
);

select ok(
  has_table_privilege('authenticated', 'public.notifications', 'select'),
  'authenticated can read notifications through RLS'
);

select ok(
  has_table_privilege('anon', 'public.notifications', 'insert,update,delete') = false,
  'anon has no notification write privileges'
);

select ok(
  has_table_privilege('authenticated', 'public.notifications', 'insert,update,delete') = false,
  'authenticated has no notification write privileges'
);

select ok(
  not exists (
    select 1
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'notifications'
       and pg_policy.polcmd in ('r', '*')
       and pg_get_expr(pg_policy.polqual, pg_policy.polrelid) ilike '%true%'
  ),
  'notifications has no unconditional read policy'
);

-- Use fixed rows inside the transaction so this test proves row visibility,
-- not just the policy text. Replication mode skips the push webhook trigger.
set local session_replication_role = replica;

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'notification-owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'notification-stranger@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'notification-admin@example.com');

insert into public.notifications (id, event_id, type, title)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from public.events where theme_preset = 'legacy_aws' order by id limit 1),
  'announcement',
  'Recipient-only test alert'
);

insert into public.notification_recipients (event_id, notification_id, user_id)
values (
  (select id from public.events where theme_preset = 'legacy_aws' order by id limit 1),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111'
);

insert into public.event_memberships (event_id, user_id, role, display_name_snapshot)
values ((select id from public.events where theme_preset = 'legacy_aws' order by id limit 1),
  '11111111-1111-1111-1111-111111111111', 'attendee', 'Notification owner');

insert into public.admin_users (user_id)
values ('33333333-3333-3333-3333-333333333333');

set local session_replication_role = origin;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select id::text from public.notifications
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  'the selected recipient can read the alert'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is_empty(
  $$select id from public.notifications
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'a non-selected attendee cannot read the alert'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select results_eq(
  $$select id::text from public.notifications
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  'an allowlisted admin can read the alert'
);

select * from finish();
rollback;
