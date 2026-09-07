begin;

select plan(12);

-- Invariant 15: seat claims have no client-side write path, and an attendee
-- can read only their own row. A workshop's roster must never be readable
-- from the attendee app, not even by an allowlisted admin's own /home page.

select ok(
  (
    select relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'session_seat_claims'
  ),
  'session_seat_claims has row-level security enabled'
);

select is(
  (
    select count(*)::integer
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'session_seat_claims'
  ),
  1,
  'session_seat_claims has exactly one policy'
);

select is(
  (
    select pg_policy.polcmd::text
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'session_seat_claims'
  ),
  'r',
  'the only session_seat_claims policy is a read policy'
);

select ok(
  (
    select pg_get_expr(pg_policy.polqual, pg_policy.polrelid)
      from pg_policy
      join pg_class on pg_class.oid = pg_policy.polrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'session_seat_claims'
  ) not like '%is_admin%',
  'the seat-claim read policy has no admin clause, so no roster is readable'
);

select is(
  (
    select count(*)::integer
      from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name = 'session_seat_claims'
       and grantee in ('anon', 'authenticated')
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'clients hold no write grant on session_seat_claims'
);

select is(
  (
    select count(*)::integer
      from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name = 'session_seat_claims'
       and grantee = 'anon'
  ),
  0,
  'anonymous clients hold no grant at all on session_seat_claims'
);

-- The seat functions must be security definer with a pinned search path, and
-- must not be callable anonymously.

select is(
  (
    select count(*)::integer
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
     where pg_namespace.nspname = 'public'
       and pg_proc.proname in (
         'claim_session_seat',
         'release_session_seat',
         'admin_set_session_capacity'
       )
       and pg_proc.prosecdef
       and pg_proc.proconfig @> array['search_path=']
  ),
  3,
  'all three seat functions are security definer with a pinned search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.claim_session_seat(uuid)',
    'execute'
  ),
  'anonymous clients cannot claim a seat'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.admin_set_session_capacity(uuid, integer, integer, boolean, uuid)',
    'execute'
  ),
  'anonymous clients cannot set a session capacity'
);

-- Taken seats can never exceed capacity, whichever writer moved last.

select ok(
  (
    select count(*) = 1
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'sessions'
       and pg_constraint.conname = 'sessions_seats_within_capacity'
  ),
  'sessions constrains reserved plus claimed seats to the capacity'
);

-- The three workshop tracks are seeded full at the organiser-export numbers.

select is(
  (
    select count(*)::integer
      from public.sessions
     where id in (
       '10000000-0000-4000-8000-000000000014'::uuid,
       '10000000-0000-4000-8000-000000000015'::uuid
     )
       and capacity = 33
       and reserved_seats + claimed_seats = 33
  ),
  2,
  'Workshop Tracks A and B are seeded full at 33/33'
);

select is(
  (
    select count(*)::integer
      from public.sessions
     where id = '10000000-0000-4000-8000-000000000016'::uuid
       and capacity = 16
       and reserved_seats + claimed_seats = 16
  ),
  1,
  'Workshop Track C is seeded full at 16/16'
);

select * from finish();

rollback;
