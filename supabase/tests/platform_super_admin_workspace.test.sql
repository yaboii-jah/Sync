begin;
select no_plan();

select ok(
  not has_function_privilege('anon', 'public.platform_super_admin_overview()', 'execute')
  and has_function_privilege('authenticated', 'public.platform_super_admin_overview()', 'execute'),
  'platform overview is authenticated-only and authorizes internally'
);
select is(
  (select count(*)::integer from pg_proc join pg_namespace n on n.oid = pg_proc.pronamespace
    where n.nspname in ('public','private')
      and proname in ('require_platform_super_admin','platform_super_admin_overview',
        'platform_super_admin_list_events','platform_super_admin_event',
        'platform_super_admin_list_users','platform_super_admin_user',
        'platform_super_admin_list_feedback','platform_super_admin_list_audit',
        'platform_super_admin_list_attendees','set_platform_quota_override',
        'get_event_branding_upload_limit')
      and prosecdef and proconfig && array['search_path=', 'search_path=""']),
  11, 'all platform workspace functions are hardened security definers'
);

set local session_replication_role = replica;
insert into auth.users (id,email,email_confirmed_at) values
 ('91000000-0000-0000-0000-000000000001','platform-owner@example.com',now()),
 ('91000000-0000-0000-0000-000000000002','platform-attendee@example.com',now()),
 ('91000000-0000-0000-0000-000000000003','platform-ordinary@example.com',now()),
 ('91000000-0000-0000-0000-000000000004','platform-super@example.com',now());
insert into public.profiles(id,name) values
 ('91000000-0000-0000-0000-000000000001','Platform Owner'),
 ('91000000-0000-0000-0000-000000000002','Platform Attendee'),
 ('91000000-0000-0000-0000-000000000003','Ordinary User'),
 ('91000000-0000-0000-0000-000000000004','Platform Operator');
insert into public.events(id,name,starts_at,ends_at,status,theme,slug,timezone,lifecycle,ever_published,theme_preset,accent_color)
values
 ('92000000-0000-0000-0000-000000000001','Platform Event One',now()+interval '1 day',now()+interval '2 days','upcoming','One','platform-event-one','Asia/Manila','published',true,'daylight','#2563EB'),
 ('92000000-0000-0000-0000-000000000002','Platform Event Two',now()+interval '3 days',now()+interval '4 days','upcoming','Two','platform-event-two','Asia/Manila','published',true,'daylight','#2563EB');
insert into public.event_memberships(id,event_id,user_id,role,status,display_name_snapshot,email_snapshot) values
 ('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','owner','active','Platform Owner','platform-owner@example.com'),
 ('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000002','attendee','active','Platform Attendee','platform-attendee@example.com'),
 ('93000000-0000-0000-0000-000000000003','92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','owner','active','Platform Owner','platform-owner@example.com');
insert into public.platform_super_admins(user_id) values ('91000000-0000-0000-0000-000000000004');
set local session_replication_role = origin;
set local role authenticated;
set local request.jwt.claim.sub = '91000000-0000-0000-0000-000000000003';

select throws_ok($$select public.platform_super_admin_overview()$$,'P0001','super admin access required','ordinary users cannot read the platform overview');
select throws_ok($$select public.platform_super_admin_list_users('',null,null,25)$$,'P0001','super admin access required','ordinary users cannot enumerate global identities');

set local request.jwt.claim.sub = '91000000-0000-0000-0000-000000000004';
select ok((public.platform_super_admin_overview()->>'events')::integer >= 2,'super admin receives platform health counts');
select is(jsonb_array_length(public.platform_super_admin_list_events('Platform Event',null,null,null,null,25)),2,'event search returns the matching tenants');
select is(jsonb_array_length(public.platform_super_admin_list_users('platform-owner',null,null,25)),1,'user search can match verified email');
select throws_ok(
  $$select public.platform_super_admin_list_attendees('92000000-0000-0000-0000-000000000001','',null,null,null,25)$$,
  'P0001','active support session required','attendee PII is unavailable before support starts'
);

select lives_ok(
  $$select public.start_event_support_session('92000000-0000-0000-0000-000000000001','Investigating attendee access','94000000-0000-4000-8000-000000000001')$$,
  'support can start for the first tenant'
);
select is(jsonb_array_length(public.platform_super_admin_list_attendees('92000000-0000-0000-0000-000000000001','',null,null,null,25)),1,'active support reveals only that event attendee');
select lives_ok(
  $$select public.start_event_support_session('92000000-0000-0000-0000-000000000002','Investigating a second tenant','94000000-0000-4000-8000-000000000002')$$,
  'starting support for another tenant succeeds'
);
select is(
  (select count(*)::integer from public.platform_support_sessions where super_admin_user_id='91000000-0000-0000-0000-000000000004' and ended_at is null and expires_at > now()),
  1, 'an operator has only one live support session'
);
select throws_ok(
  $$select public.platform_super_admin_list_attendees('92000000-0000-0000-0000-000000000001','',null,null,null,25)$$,
  'P0001','active support session required','replacement support immediately closes prior tenant PII access'
);

select lives_ok(
  $$select public.set_platform_quota_override('91000000-0000-0000-0000-000000000001',7,12,600,20971520,'Approved for a larger organizer','95000000-0000-4000-8000-000000000001')$$,
  'super admin can set an audited quota override'
);
select is((select branding_upload_bytes from public.platform_quota_overrides where user_id='91000000-0000-0000-0000-000000000001'),20971520::bigint,'branding quota is stored in bytes');
select throws_ok(
  $$select public.set_platform_quota_override('91000000-0000-0000-0000-000000000001',7,12,600,52428801,'Too large for configured storage','95000000-0000-4000-8000-000000000002')$$,
  'P0001','invalid quota value','branding overrides cannot exceed configured Storage capacity'
);
select lives_ok(
  $$select public.set_platform_quota_override('91000000-0000-0000-0000-000000000001',null,null,null,null,'Return this user to defaults','95000000-0000-4000-8000-000000000003')$$,
  'clearing every value removes the override'
);
select is_empty($$select user_id from public.platform_quota_overrides where user_id='91000000-0000-0000-0000-000000000001'$$,'cleared quota row no longer exists');
set local role postgres;
select is((select file_size_limit from storage.buckets where id='event-branding-staging'),52428800::bigint,'staging bucket permits the maximum operator-selectable quota');

select * from finish();
rollback;
