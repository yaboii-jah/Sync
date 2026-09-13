begin;

select no_plan();

select ok(
  (select relrowsecurity from pg_class where oid = 'public.event_audit_log'::regclass),
  'event audit has RLS enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.event_audit_log', 'select')
  and not has_table_privilege('authenticated', 'public.event_audit_log', 'insert,update,delete'),
  'event audit is read-only to authenticated clients'
);

select ok(
  not has_table_privilege('anon', 'public.event_audit_log', 'select,insert,update,delete'),
  'anonymous clients have no event audit privileges'
);

select ok(
  not has_function_privilege('anon', 'public.join_event(uuid,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.join_event(uuid,uuid)', 'execute'),
  'join RPC is authenticated-only'
);

select ok(
  not has_function_privilege('anon', 'public.set_event_suspension(uuid,boolean,text,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.set_event_suspension(uuid,boolean,text,uuid)', 'execute'),
  'suspension RPC is authenticated-only and authorizes internally'
);

select is(
  (
    select count(*)::integer from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname in ('private', 'public')
      and pg_proc.proname in (
        'has_event_support_access', 'current_event_membership_id',
        'claim_event_request', 'claim_platform_request', 'join_event',
        'leave_event', 'moderate_event_attendee', 'remove_event_admin',
        'issue_event_admin_invitation', 'revoke_event_admin_invitation',
        'accept_event_admin_invitation', 'transfer_event_ownership',
        'publish_event', 'archive_event', 'delete_untouched_draft_event',
        'set_event_suspension', 'start_event_support_session',
        'end_event_support_session'
      )
      and pg_proc.prosecdef
      and pg_proc.proconfig && array['search_path=', 'search_path=""']
  ),
  18,
  'all operation and authorization functions are hardened security definers'
);

set local session_replication_role = replica;

insert into auth.users (id, email, email_confirmed_at)
values
  ('11000000-0000-0000-0000-000000000001', 'owner-one@example.com', now()),
  ('11000000-0000-0000-0000-000000000002', 'admin-one@example.com', now()),
  ('11000000-0000-0000-0000-000000000003', 'attendee-one@example.com', now()),
  ('11000000-0000-0000-0000-000000000004', 'blocked-one@example.com', now()),
  ('11000000-0000-0000-0000-000000000005', 'invitee@example.com', now()),
  ('11000000-0000-0000-0000-000000000006', 'wrong@example.com', now()),
  ('22000000-0000-0000-0000-000000000001', 'owner-two@example.com', now()),
  ('22000000-0000-0000-0000-000000000002', 'attendee-two@example.com', now()),
  ('33000000-0000-0000-0000-000000000001', 'super-one@example.com', now()),
  ('33000000-0000-0000-0000-000000000002', 'super-two@example.com', now());

insert into public.profiles (id, name)
values
  ('11000000-0000-0000-0000-000000000001', 'Owner One'),
  ('11000000-0000-0000-0000-000000000002', 'Admin One'),
  ('11000000-0000-0000-0000-000000000003', 'Attendee One'),
  ('11000000-0000-0000-0000-000000000004', 'Blocked One'),
  ('11000000-0000-0000-0000-000000000005', 'Invitee'),
  ('11000000-0000-0000-0000-000000000006', 'Wrong Account'),
  ('22000000-0000-0000-0000-000000000001', 'Owner Two'),
  ('22000000-0000-0000-0000-000000000002', 'Attendee Two'),
  ('33000000-0000-0000-0000-000000000001', 'Super One'),
  ('33000000-0000-0000-0000-000000000002', 'Super Two');

insert into public.events (
  id, name, starts_at, ends_at, status, theme, slug, timezone,
  lifecycle, ever_published, published_at, theme_preset, accent_color
)
values
  ('a1000000-0000-0000-0000-000000000001', 'Event One', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Event One', 'event-one', 'Asia/Manila', 'published', true, now(), 'daylight', '#2563EB'),
  ('a2000000-0000-0000-0000-000000000002', 'Event Two', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Event Two', 'event-two', 'Asia/Manila', 'published', true, now(), 'midnight', '#7C3AED'),
  ('a3000000-0000-0000-0000-000000000003', 'Draft Publish', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Draft Publish', 'draft-publish', 'Asia/Manila', 'draft', false, null, 'festival', '#EA580C'),
  ('a4000000-0000-0000-0000-000000000004', 'Draft With Activity', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Draft Activity', 'draft-activity', 'Asia/Manila', 'draft', false, null, 'daylight', '#2563EB'),
  ('a5000000-0000-0000-0000-000000000005', 'Draft Delete', now() + interval '1 day', now() + interval '2 days', 'upcoming', 'Draft Delete', 'draft-delete', 'Asia/Manila', 'draft', false, null, 'daylight', '#2563EB');

insert into public.event_memberships (
  id, event_id, user_id, role, status, display_name_snapshot, email_snapshot, ended_at
)
values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'owner', 'active', 'Owner One', 'owner-one@example.com', null),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'admin', 'active', 'Admin One', 'admin-one@example.com', null),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'attendee', 'active', 'Attendee One', 'attendee-one@example.com', null),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'attendee', 'blocked', 'Blocked One', 'blocked-one@example.com', now()),
  ('b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'owner', 'active', 'Owner Two', 'owner-two@example.com', null),
  ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'attendee', 'active', 'Attendee Two', 'attendee-two@example.com', null),
  ('b3000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'owner', 'active', 'Owner One', 'owner-one@example.com', null),
  ('b4000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'owner', 'active', 'Owner One', 'owner-one@example.com', null),
  ('b4000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000006', 'attendee', 'active', 'Wrong Account', 'wrong@example.com', null),
  ('b5000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', 'owner', 'active', 'Owner One', 'owner-one@example.com', null);

insert into public.platform_super_admins (user_id)
values
  ('33000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000002');

insert into public.event_admin_invitations (
  event_id, email, token_hash, invited_by_membership_id, request_id,
  created_at, expires_at
) values (
  'a1000000-0000-0000-0000-000000000001', 'wrong@example.com', repeat('d', 64),
  'b1000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000000', now() - interval '8 days',
  now() - interval '1 day'
);

set local session_replication_role = origin;
set local role authenticated;
set local request.jwt.claim.sub = '33000000-0000-0000-0000-000000000001';

select is_empty(
  $$select id from public.event_memberships where event_id = 'a1000000-0000-0000-0000-000000000001'$$,
  'a super admin has no blanket event membership PII access'
);

select lives_ok(
  $$select public.start_event_support_session(
    'a1000000-0000-0000-0000-000000000001',
    'Investigating an organizer support request',
    'c0000000-0000-0000-0000-000000000001'
  )$$,
  'a super admin can start a reason-gated support session'
);

select is(
  (select count(*)::integer from public.event_memberships where event_id = 'a1000000-0000-0000-0000-000000000001'),
  4,
  'active support grants event-level membership visibility'
);

select is_empty(
  $$select id from public.event_memberships where event_id = 'a2000000-0000-0000-0000-000000000002'$$,
  'support access does not cross tenant boundaries'
);

select lives_ok(
  $$select public.moderate_event_attendee(
    'b1000000-0000-0000-0000-000000000003', 'removed',
    'Removed during an authorized support review',
    'c0000000-0000-0000-0000-000000000004'
  )$$,
  'active support grants admin-level attendee moderation'
);

select lives_ok(
  $$select public.moderate_event_attendee(
    'b1000000-0000-0000-0000-000000000003', 'active', null,
    'c0000000-0000-0000-0000-000000000005'
  )$$,
  'active support can restore an attendee after review'
);

select throws_ok(
  $$select public.archive_event(
    'a1000000-0000-0000-0000-000000000001',
    'Support must never receive owner authority',
    'c0000000-0000-0000-0000-000000000006'
  )$$,
  'P0001', 'event owner access required',
  'active support never receives owner-level lifecycle authority'
);

select ok(
  exists (
    select 1 from public.event_audit_log
     where request_id = 'c0000000-0000-0000-0000-000000000004'
       and actor_user_id = '33000000-0000-0000-0000-000000000001'
       and actor_membership_id is null
  ),
  'support moderation is audited without inventing an event membership'
);

select lives_ok(
  $$select public.end_event_support_session(
    (select id from public.platform_support_sessions
      where event_id = 'a1000000-0000-0000-0000-000000000001'
        and super_admin_user_id = '33000000-0000-0000-0000-000000000001'),
    'c0000000-0000-0000-0000-000000000002'
  )$$,
  'a super admin can end their support session'
);

select is_empty(
  $$select id from public.event_memberships where event_id = 'a1000000-0000-0000-0000-000000000001'$$,
  'event PII visibility ends with the support session'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000003';

select throws_ok(
  $$select public.start_event_support_session(
    'a1000000-0000-0000-0000-000000000001', 'Unauthorized support attempt',
    'c0000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'super admin access required',
  'ordinary attendees cannot start support sessions'
);

select lives_ok(
  $$select public.leave_event(
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001'
  )$$,
  'an attendee can leave an active event'
);

select is(
  (select status from public.event_memberships where user_id = '11000000-0000-0000-0000-000000000003' and event_id = 'a1000000-0000-0000-0000-000000000001'),
  'left',
  'leaving preserves an inactive membership'
);

select lives_ok(
  $$select public.join_event(
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002'
  )$$,
  'a former attendee can rejoin'
);

select is(
  (select status from public.event_memberships where user_id = '11000000-0000-0000-0000-000000000003' and event_id = 'a1000000-0000-0000-0000-000000000001'),
  'active',
  'rejoin reactivates the attendee membership'
);

select throws_ok(
  $$select public.join_event(
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001'
  )$$,
  'P0001', 'request id was already used for another mutation',
  'a request UUID cannot be reused for a different mutation'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select throws_ok(
  $$select public.leave_event(
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'owner must transfer ownership or archive the event',
  'an owner cannot abandon an active event'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000002';

select lives_ok(
  $$select public.moderate_event_attendee(
    'b1000000-0000-0000-0000-000000000003', 'removed',
    'Removed after an organizer review',
    'c2000000-0000-0000-0000-000000000001'
  )$$,
  'an event admin can remove an attendee'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000003';

select lives_ok(
  $$select public.join_event(
    'a1000000-0000-0000-0000-000000000001',
    'c2000000-0000-0000-0000-000000000002'
  )$$,
  'a removed attendee may rejoin'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000002';

select lives_ok(
  $$select public.moderate_event_attendee(
    'b1000000-0000-0000-0000-000000000003', 'blocked',
    'Blocked after a safety review',
    'c2000000-0000-0000-0000-000000000003'
  )$$,
  'an event admin can block an attendee'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000003';

select throws_ok(
  $$select public.join_event(
    'a1000000-0000-0000-0000-000000000001',
    'c2000000-0000-0000-0000-000000000004'
  )$$,
  'P0001', 'membership is blocked',
  'a blocked attendee cannot rejoin'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000002';

select lives_ok(
  $$select public.moderate_event_attendee(
    'b1000000-0000-0000-0000-000000000003', 'active', null,
    'c2000000-0000-0000-0000-000000000005'
  )$$,
  'event staff can restore a blocked attendee'
);

select throws_ok(
  $$select public.moderate_event_attendee(
    'b2000000-0000-0000-0000-000000000002', 'removed',
    'Cross tenant moderation attempt',
    'c2000000-0000-0000-0000-000000000006'
  )$$,
  'P0001', 'event staff access required',
  'an admin cannot moderate another tenant'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000004';

select throws_ok(
  $$select public.join_event(
    'a1000000-0000-0000-0000-000000000001',
    'c2000000-0000-0000-0000-000000000007'
  )$$,
  'P0001', 'membership is blocked',
  'a previously blocked member remains blocked'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.issue_event_admin_invitation(
    'a1000000-0000-0000-0000-000000000001', 'invitee@example.com',
    repeat('a', 64), 'c3000000-0000-0000-0000-000000000001'
  )$$,
  'the owner can issue an admin invitation'
);

select is(
  public.issue_event_admin_invitation(
    'a1000000-0000-0000-0000-000000000001', 'invitee@example.com',
    repeat('a', 64), 'c3000000-0000-0000-0000-000000000001'
  ),
  (select id from public.event_admin_invitations where token_hash = repeat('a', 64)),
  'invitation issuance is idempotent for the same request UUID'
);

select lives_ok(
  $$select public.issue_event_admin_invitation(
    'a1000000-0000-0000-0000-000000000001', 'invitee@example.com',
    repeat('b', 64), 'c3000000-0000-0000-0000-000000000002'
  )$$,
  'resending rotates the token while retaining the pending invitation'
);

select results_eq(
  $$select count(*)::bigint
      from public.event_admin_invitations
     where event_id = 'a1000000-0000-0000-0000-000000000001'
       and lower(email) = 'invitee@example.com'
       and token_hash = repeat('b', 64)
       and accepted_at is null
       and revoked_at is null$$,
  array[1::bigint],
  'resending keeps exactly one pending invitation with the rotated token'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000006';

select throws_ok(
  $$select public.accept_event_admin_invitation(
    repeat('b', 64), 'c3000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'invitation email does not match the verified account',
  'an invitation is bound to the exact verified email'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000005';

select throws_ok(
  $$select public.accept_event_admin_invitation(
    repeat('a', 64), 'c3000000-0000-0000-0000-000000000004'
  )$$,
  'P0001', 'invitation not found',
  'the rotated invitation token is invalid'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000006';

select throws_ok(
  $$select public.accept_event_admin_invitation(
    repeat('d', 64), 'c3000000-0000-0000-0000-000000000009'
  )$$,
  'P0001', 'invitation expired',
  'an expired invitation cannot be accepted'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000005';

select lives_ok(
  $$select public.accept_event_admin_invitation(
    repeat('b', 64), 'c3000000-0000-0000-0000-000000000005'
  )$$,
  'the matching verified account can accept the current invitation'
);

select is(
  (select role from public.event_memberships where user_id = '11000000-0000-0000-0000-000000000005' and event_id = 'a1000000-0000-0000-0000-000000000001'),
  'admin',
  'invitation acceptance creates an active admin membership'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.issue_event_admin_invitation(
    'a1000000-0000-0000-0000-000000000001', 'wrong@example.com',
    repeat('c', 64), 'c3000000-0000-0000-0000-000000000006'
  )$$,
  'the owner can issue another invitation'
);

select lives_ok(
  $$select public.revoke_event_admin_invitation(
    (select id from public.event_admin_invitations where token_hash = repeat('c', 64)),
    'Invitation was sent in error',
    'c3000000-0000-0000-0000-000000000007'
  )$$,
  'the owner can revoke a pending invitation'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000006';

select throws_ok(
  $$select public.accept_event_admin_invitation(
    repeat('c', 64), 'c3000000-0000-0000-0000-000000000008'
  )$$,
  'P0001', 'invitation was revoked',
  'a revoked invitation cannot be accepted'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.issue_event_admin_invitation(
    'a1000000-0000-0000-0000-000000000001', 'wrong@example.com',
    repeat('e', 64), 'c3000000-0000-0000-0000-000000000010'
  )$$,
  'a revoked address can receive a fresh invitation'
);

reset role;
update auth.users
   set email_confirmed_at = null
 where id = '11000000-0000-0000-0000-000000000006';
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000006';

select throws_ok(
  $$select public.accept_event_admin_invitation(
    repeat('e', 64), 'c3000000-0000-0000-0000-000000000011'
  )$$,
  'P0001', 'invitation email does not match the verified account',
  'an unverified account cannot accept a matching invitation'
);

reset role;
update auth.users
   set email_confirmed_at = now()
 where id = '11000000-0000-0000-0000-000000000006';
insert into public.platform_quota_overrides (
  user_id, event_admin_limit, reason, updated_by
) values (
  '11000000-0000-0000-0000-000000000001', 2,
  'Exercise the event admin quota boundary',
  '33000000-0000-0000-0000-000000000001'
);
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000006';

select throws_ok(
  $$select public.accept_event_admin_invitation(
    repeat('e', 64), 'c3000000-0000-0000-0000-000000000012'
  )$$,
  'P0001', 'event admin limit reached',
  'admin invitation acceptance enforces the owner quota'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.transfer_event_ownership(
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'c4000000-0000-0000-0000-000000000001'
  )$$,
  'the owner can transfer ownership to an active admin'
);

select is(
  (select count(*)::integer from public.event_memberships where event_id = 'a1000000-0000-0000-0000-000000000001' and role = 'owner' and status = 'active'),
  1,
  'ownership transfer preserves exactly one active owner'
);

select is(
  (select role from public.event_memberships where id = 'b1000000-0000-0000-0000-000000000001'),
  'admin',
  'the previous owner becomes an admin'
);

select lives_ok(
  $$select public.transfer_event_ownership(
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'c4000000-0000-0000-0000-000000000001'
  )$$,
  'ownership transfer replay succeeds after the actor loses owner role'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000002';

select lives_ok(
  $$select public.remove_event_admin(
    (select id from public.event_memberships where event_id = 'a1000000-0000-0000-0000-000000000001' and user_id = '11000000-0000-0000-0000-000000000005'),
    'Admin access is no longer needed',
    'c4000000-0000-0000-0000-000000000002'
  )$$,
  'the new owner can remove an active admin'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.publish_event(
    'a3000000-0000-0000-0000-000000000003',
    'c5000000-0000-0000-0000-000000000001'
  )$$,
  'a draft owner can publish a complete event'
);

select is(
  (select lifecycle from public.events where id = 'a3000000-0000-0000-0000-000000000003'),
  'published',
  'publishing updates lifecycle state'
);

select lives_ok(
  $$select public.archive_event(
    'a3000000-0000-0000-0000-000000000003',
    'The event has now concluded',
    'c5000000-0000-0000-0000-000000000002'
  )$$,
  'the owner can archive a published event'
);

select is(
  (select lifecycle from public.events where id = 'a3000000-0000-0000-0000-000000000003'),
  'archived',
  'archiving produces read-only lifecycle state'
);

select throws_ok(
  $$select public.delete_untouched_draft_event(
    'a4000000-0000-0000-0000-000000000004',
    'Removing an unused draft event',
    'c5000000-0000-0000-0000-000000000003'
  )$$,
  'P0001', 'draft has activity and must be archived',
  'a draft with membership activity cannot be deleted'
);

select lives_ok(
  $$select public.delete_untouched_draft_event(
    'a5000000-0000-0000-0000-000000000005',
    'Removing an unused draft event',
    'c5000000-0000-0000-0000-000000000004'
  )$$,
  'an untouched draft can be deleted'
);

select is_empty(
  $$select id from public.events where id = 'a5000000-0000-0000-0000-000000000005'$$,
  'draft deletion removes the event'
);

set local request.jwt.claim.sub = '33000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.set_event_suspension(
    'a2000000-0000-0000-0000-000000000002', true,
    'Suspended for a platform safety review',
    'c6000000-0000-0000-0000-000000000001'
  )$$,
  'a super admin can suspend an event with a reason'
);

set local request.jwt.claim.sub = '22000000-0000-0000-0000-000000000002';

select throws_ok(
  $$select public.leave_event(
    'a2000000-0000-0000-0000-000000000002',
    'c6000000-0000-0000-0000-000000000002'
  )$$,
  'P0001', 'event membership is read-only',
  'ordinary event mutations stop while suspended'
);

set local request.jwt.claim.sub = '33000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.set_event_suspension(
    'a2000000-0000-0000-0000-000000000002', false, null,
    'c6000000-0000-0000-0000-000000000003'
  )$$,
  'a super admin can lift a suspension'
);

select lives_ok(
  $$select public.set_event_suspension(
    'a2000000-0000-0000-0000-000000000002', false, null,
    'c6000000-0000-0000-0000-000000000003'
  )$$,
  'suspension mutation replay is idempotent'
);

reset role;

select throws_ok(
  $$update public.event_audit_log set action = 'tampered' where true$$,
  'P0001', 'admin audit entries are immutable',
  'event audit rows are immutable even to direct database writers'
);

select ok(
  exists (
    select 1 from public.platform_audit_log
     where action = 'event.delete_draft'
       and details ->> 'deleted_event_id' = 'a5000000-0000-0000-0000-000000000005'
  ),
  'draft deletion leaves a durable platform audit tombstone'
);

select ok(
  (select count(*) >= 10 from public.event_audit_log),
  'event operations produced durable audit history'
);

select * from finish();
rollback;
