begin;
select no_plan();

select ok((select relrowsecurity from pg_class where oid='public.event_admin_invitation_email_deliveries'::regclass), 'invitation delivery ledger has RLS');
select ok(
  not has_table_privilege('authenticated','public.event_admin_invitation_email_deliveries','select,insert,update,delete')
  and has_function_privilege('authenticated','public.get_event_admin_invitation_preview(text)','execute')
  and has_function_privilege('authenticated','public.reserve_event_admin_invitation_email(uuid,uuid)','execute')
  and not has_function_privilege('anon','public.reserve_event_admin_invitation_email(uuid,uuid)','execute'),
  'delivery operations are RPC-only and authenticated'
);
select is((select count(*)::integer from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public'
  and proname in ('get_event_admin_invitation_preview','reserve_event_admin_invitation_email','complete_event_admin_invitation_email')
  and prosecdef and proconfig && array['search_path=','search_path=""']), 3, 'new team functions are hardened security definers');

set local session_replication_role=replica;
insert into auth.users(id,email,email_confirmed_at) values
 ('81000000-0000-4000-8000-000000000001','team-owner@example.com',now()),
 ('81000000-0000-4000-8000-000000000002','team-admin@example.com',now()),
 ('81000000-0000-4000-8000-000000000003','team-invitee@example.com',now()),
 ('81000000-0000-4000-8000-000000000004','team-wrong@example.com',now()),
 ('82000000-0000-4000-8000-000000000001','team-other@example.com',now());
insert into public.profiles(id,name) values
 ('81000000-0000-4000-8000-000000000001','Team Owner'),('81000000-0000-4000-8000-000000000002','Team Admin'),
 ('81000000-0000-4000-8000-000000000003','Team Invitee'),('81000000-0000-4000-8000-000000000004','Wrong Team'),('82000000-0000-4000-8000-000000000001','Other Owner');
insert into public.events(id,name,starts_at,ends_at,status,theme,slug,timezone,lifecycle,ever_published,theme_preset,accent_color) values
 ('e8100000-0000-4000-8000-000000000001','Team Event',now()+interval '1 day',now()+interval '2 days','upcoming','Team Event','team-event','UTC','draft',false,'daylight','#2563EB'),
 ('e8200000-0000-4000-8000-000000000001','Other Team Event',now()+interval '1 day',now()+interval '2 days','upcoming','Other Team Event','other-team-event','UTC','draft',false,'daylight','#2563EB');
insert into public.event_memberships(id,event_id,user_id,role,status,display_name_snapshot,email_snapshot,ended_at) values
 ('f8100000-0000-4000-8000-000000000001','e8100000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','owner','active','Team Owner','team-owner@example.com',null),
 ('f8100000-0000-4000-8000-000000000002','e8100000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','admin','active','Team Admin','team-admin@example.com',null),
 ('f8200000-0000-4000-8000-000000000001','e8200000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','owner','active','Other Owner','team-other@example.com',null);
set local session_replication_role=origin;

set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000001';
select lives_ok($$select public.issue_event_admin_invitation('e8100000-0000-4000-8000-000000000001','team-invitee@example.com',repeat('a',64),'91000000-0000-4000-8000-000000000001')$$,'owner can issue team invitation');
select is((select public.get_event_admin_invitation_preview(repeat('a',64))->>'status'),'wrong_account','owner cannot preview an invitation for another email');

set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000004';
select is((select public.get_event_admin_invitation_preview(repeat('a',64))->>'status'),'wrong_account','wrong account receives no event details');

set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000003';
select is((select public.get_event_admin_invitation_preview(repeat('a',64))->>'status'),'valid','matching verified account can preview invitation');
select is((select public.get_event_admin_invitation_preview(repeat('a',64))->>'slug'),'team-event','preview returns the intended tenant only after email validation');

set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000002';
select throws_ok($$select public.reserve_event_admin_invitation_email((select id from public.event_admin_invitations where token_hash=repeat('a',64)),'91000000-0000-4000-8000-000000000002')$$,'P0001','event owner access required','an admin cannot reserve invitation email delivery');

set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000001';
select lives_ok($$select public.reserve_event_admin_invitation_email((select id from public.event_admin_invitations where token_hash=repeat('a',64)),'91000000-0000-4000-8000-000000000003')$$,'owner can reserve email delivery');
reset role;
select is((select count(*)::integer from public.event_admin_invitation_email_deliveries where event_id='e8100000-0000-4000-8000-000000000001'),1,'reservation is recorded without client table access');
select id as delivery_id from public.event_admin_invitation_email_deliveries where request_id='91000000-0000-4000-8000-000000000003' \gset
set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000001';
select lives_ok(format('select public.complete_event_admin_invitation_email(%L,true,%L,null)', :'delivery_id', 'provider-message-1'),'owner can complete own delivery reservation');
reset role;
select is((select status from public.event_admin_invitation_email_deliveries where request_id='91000000-0000-4000-8000-000000000003'),'sent','successful delivery records only provider id');

set local role authenticated;
set local request.jwt.claim.sub='82000000-0000-4000-8000-000000000001';
select throws_ok(format('select public.complete_event_admin_invitation_email(%L,false,null,%L)', :'delivery_id', 'provider_error'),'P0001','delivery not found','another tenant cannot complete a delivery');

set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000001';
select lives_ok($$select public.revoke_event_admin_invitation((select id from public.event_admin_invitations where token_hash=repeat('a',64)),'Invitation sent to the wrong recipient','91000000-0000-4000-8000-000000000004')$$,'owner can revoke invitation');
set local request.jwt.claim.sub='81000000-0000-4000-8000-000000000003';
select is((select public.get_event_admin_invitation_preview(repeat('a',64))->>'status'),'revoked','revoked invitation does not disclose event details');

select * from finish();
rollback;
