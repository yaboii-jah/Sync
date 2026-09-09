begin;

select plan(8);

select ok(
  exists (
    select 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'admin_get_raffle_attendees'
  ),
  'the raffle attendee RPC exists'
);

select ok(
  has_function_privilege('anon', 'public.admin_get_raffle_attendees()', 'execute') = false,
  'anonymous clients cannot execute the raffle attendee RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.admin_get_raffle_attendees()', 'execute'),
  'authenticated clients may reach the allowlist check'
);

select ok(
  (
    select prosecdef
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname = 'admin_get_raffle_attendees'
  ),
  'the raffle attendee RPC has the privileges required for its narrow admin read'
);

set local session_replication_role = replica;

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'raffle-admin@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'raffle-ana@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'raffle-juan-one@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'raffle-juan-two@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'raffle-blank@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'raffle-whitespace@example.com');

insert into public.profiles (id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'Event operator'),
  ('22222222-2222-2222-2222-222222222222', 'Ana'),
  ('33333333-3333-3333-3333-333333333333', E' Juan\tCruz '),
  ('44444444-4444-4444-4444-444444444444', 'juan  cruz'),
  ('55555555-5555-5555-5555-555555555555', ''),
  ('66666666-6666-6666-6666-666666666666', E' \n\t ');

insert into public.admin_users (user_id)
values ('11111111-1111-1111-1111-111111111111');

set local session_replication_role = origin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$select public.admin_get_raffle_attendees()$$,
  'P0001',
  'admin access required',
  'a non-admin cannot read the raffle attendee snapshot'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (public.admin_get_raffle_attendees() ->> 'excluded_blank_count')::integer,
  2,
  'the snapshot reports profiles skipped for blank names'
);

select results_eq(
  $$
    select entry.value ->> 'name'
      from jsonb_array_elements(public.admin_get_raffle_attendees() -> 'attendees') as entry(value)
  $$,
  array['Ana', 'Juan Cruz', 'juan cruz'],
  'the snapshot excludes admins and blank names while normalizing whitespace'
);

select is(
  (
    select count(*)::integer
      from jsonb_array_elements(public.admin_get_raffle_attendees() -> 'attendees') as entry(value)
     where entry.value ? 'id'
       and entry.value ? 'name'
       and not exists (
         select 1
           from jsonb_object_keys(entry.value) as key(name)
          where key.name not in ('id', 'name')
       )
  ),
  3,
  'each eligible attendee exposes only an internal ID and name'
);

select * from finish();
rollback;
