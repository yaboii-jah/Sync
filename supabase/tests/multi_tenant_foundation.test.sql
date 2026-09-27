begin;

select plan(19);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_memberships'::regclass),
  'event memberships have RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_admin_invitations'::regclass),
  'admin invitations have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.event_memberships', 'select,insert,update,delete'),
  'anonymous users have no membership table privileges'
);

select ok(
  has_table_privilege('authenticated', 'public.event_memberships', 'select')
  and not has_table_privilege('authenticated', 'public.event_memberships', 'insert,update,delete'),
  'authenticated users can only select memberships directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.event_admin_invitations', 'insert,update,delete'),
  'admin invitations cannot be mutated directly'
);

select ok(
  (
    select prosecdef
           and proconfig && array['search_path=', 'search_path=""']
      from pg_proc
     where oid = 'private.has_event_role(uuid,text[])'::regprocedure
  ),
  'event role helper is security definer with an empty search path'
);

select ok(
  (
    select prosecdef
           and proconfig && array['search_path=', 'search_path=""']
      from pg_proc
     where oid = 'private.is_platform_super_admin()'::regprocedure
  ),
  'super-admin helper is security definer with an empty search path'
);

select ok(
  not has_function_privilege('anon', 'private.has_event_role(uuid,text[])', 'execute'),
  'anonymous users cannot execute the event role helper'
);

select ok(
  not exists (
    select 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname like 'merch\_%' escape '\'
       and (
         has_function_privilege('anon', pg_proc.oid, 'execute')
         or has_function_privilege('authenticated', pg_proc.oid, 'execute')
       )
  ),
  'quarantined merchandise functions have no client execution grants'
);

select ok(
  exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and indexname = 'event_memberships_one_active_owner_idx'
  ),
  'active event ownership has a unique partial index'
);

set local session_replication_role = replica;

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'owner-one@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'attendee-one@example.com'),
  ('20000000-0000-0000-0000-000000000001', 'owner-two@example.com'),
  ('20000000-0000-0000-0000-000000000002', 'attendee-two@example.com'),
  ('30000000-0000-0000-0000-000000000001', 'super@example.com');

insert into public.events (
  id, name, venue, starts_at, ends_at, status, theme, slug, lifecycle,
  ever_published, published_at, theme_preset, accent_color
)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001', 'Tenant One', 'Room 1',
    now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Tenant One',
    'tenant-one', 'published', true, now(), 'daylight', '#2563EB'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002', 'Tenant Two', 'Room 2',
    now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Tenant Two',
    'tenant-two', 'published', true, now(), 'midnight', '#7C3AED'
  );

insert into public.event_memberships (id, event_id, user_id, role, display_name_snapshot)
values
  ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'Owner One'),
  ('a2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'attendee', 'Attendee One'),
  ('b1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'owner', 'Owner Two'),
  ('b2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'attendee', 'Attendee Two');

insert into public.platform_super_admins (user_id)
values ('30000000-0000-0000-0000-000000000001');

set local session_replication_role = origin;

select throws_ok(
  $$insert into public.event_memberships (event_id, user_id, role, display_name_snapshot)
    values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'owner',
      'Second Owner'
    )$$,
  '23505',
  null,
  'an event cannot have two active owners'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select results_eq(
  $$select display_name_snapshot from public.event_memberships order by display_name_snapshot$$,
  array['Attendee One', 'Owner One'],
  'an owner sees every membership in their event only'
);

select is(
  (select private.has_event_role('aaaaaaaa-0000-0000-0000-000000000001', array['owner'])),
  true,
  'owner role helper recognizes the current tenant'
);

select is(
  (select private.has_event_role('bbbbbbbb-0000-0000-0000-000000000002', array['owner'])),
  false,
  'owner role helper rejects another tenant'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

select results_eq(
  $$select display_name_snapshot from public.event_memberships order by display_name_snapshot$$,
  array['Attendee One'],
  'an attendee only sees their own membership'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';

select is_empty(
  $$select id from public.event_memberships
     where event_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'an attendee cannot read another tenant'
);

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';

select is(
  (select private.is_platform_super_admin()),
  true,
  'active super admin is recognized'
);

select is(
  (select count(*)::integer from public.event_memberships),
  0,
  'a super admin has no blanket membership PII access'
);

select is(
  (select count(*)::integer from public.platform_super_admins where user_id = '30000000-0000-0000-0000-000000000001'),
  1,
  'a super admin can read platform assignments'
);

select * from finish();
rollback;
