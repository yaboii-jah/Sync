begin;
select plan(37);

select ok((select attnotnull from pg_attribute where attrelid='public.event_networking_cards'::regclass and attname='event_id'), 'cards require event id');
select ok((select relrowsecurity from pg_class where oid='public.event_networking_cards'::regclass), 'card table has RLS');
select ok((select relrowsecurity from pg_class where oid='public.event_networking_card_links'::regclass), 'link table has RLS');
select ok((select relrowsecurity from pg_class where oid='public.event_networking_scan_history'::regclass), 'scan table has RLS');
select ok(not has_table_privilege('authenticated','public.event_networking_cards','select,insert,update,delete'), 'direct card access denied');
select ok(not has_table_privilege('authenticated','public.event_networking_scan_history','select,insert,update,delete'), 'direct scan access denied');
select ok(not has_function_privilege('anon','public.get_event_networking_card(uuid,uuid)','execute'), 'anonymous callers cannot read event cards');
select ok(not has_function_privilege('anon','public.save_event_reusable_social_links(uuid,text,text,text,text)','execute'), 'anonymous callers cannot edit reusable links');

set local session_replication_role=replica;
insert into auth.users(id,email) values
 ('91000000-0000-0000-0000-000000000001','network-one@example.com'),
 ('91000000-0000-0000-0000-000000000002','network-two@example.com'),
 ('92000000-0000-0000-0000-000000000001','network-other@example.com');
insert into public.profiles(id,name) values
 ('91000000-0000-0000-0000-000000000001','One'),
 ('91000000-0000-0000-0000-000000000002','Two'),
 ('92000000-0000-0000-0000-000000000001','Other');
insert into public.events(id,name,venue,starts_at,ends_at,status,theme,slug,lifecycle,ever_published,published_at,theme_preset,accent_color) values
 ('91000000-0000-0000-0000-000000000010','Networking One','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Networking One','networking-one','published',true,now(),'daylight','#2563EB'),
 ('92000000-0000-0000-0000-000000000010','Networking Two','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Networking Two','networking-two','published',true,now(),'daylight','#2563EB');
insert into public.event_memberships(id,event_id,user_id,role,display_name_snapshot) values
 ('91000000-0000-0000-0000-000000000011','91000000-0000-0000-0000-000000000010','91000000-0000-0000-0000-000000000001','owner','One'),
 ('91000000-0000-0000-0000-000000000012','91000000-0000-0000-0000-000000000010','91000000-0000-0000-0000-000000000002','attendee','Two'),
 ('92000000-0000-0000-0000-000000000011','92000000-0000-0000-0000-000000000010','92000000-0000-0000-0000-000000000001','owner','Other');
insert into public.social_profiles(user_id,network,url) values
 ('91000000-0000-0000-0000-000000000001','github','https://github.com/one'),
 ('91000000-0000-0000-0000-000000000002','github','https://github.com/two'),
 ('92000000-0000-0000-0000-000000000001','github','https://github.com/other');
set local session_replication_role=origin;

set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000001';
select is((public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')->'links')::text, '{}'::jsonb::text, 'new card selects no links');
select is(public.get_my_event_networking_card('92000000-0000-0000-0000-000000000010')::text, null, 'unrelated event cannot create card');
select throws_ok($$select public.save_event_networking_card('92000000-0000-0000-0000-000000000010',array['github'],1)$$,'active published event membership required','cross-event save denied');
select throws_ok($$select public.save_event_reusable_social_links('92000000-0000-0000-0000-000000000010','','','','https://github.com/one')$$,'active published event membership required','cross-event reusable-link save denied');
select lives_ok($$select public.save_event_networking_card('91000000-0000-0000-0000-000000000010',array['github'],2)$$,'owner selects own link');
select is((public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')->>'template')::integer,2,'template persisted');
select throws_ok($$select public.save_event_networking_card('91000000-0000-0000-0000-000000000010',array['linkedin'],1)$$,'invalid card selection','unsaved link rejected');
do $$ begin perform set_config('test.card_token',public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')->>'token',true); end $$;
reset role;
update public.events set suspended_at=now(),suspension_reason='test suspension'
 where id='91000000-0000-0000-0000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000001';
select is(public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')::text,null,'suspended event hides own card');
select throws_ok($$select public.save_event_networking_card('91000000-0000-0000-0000-000000000010',array['github'],2)$$,'active published event membership required','suspended event rejects card edits');
reset role;
update public.events set suspended_at=null,suspension_reason=null
 where id='91000000-0000-0000-0000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000001';
select lives_ok($$select public.record_event_networking_scan('91000000-0000-0000-0000-000000000010',current_setting('test.card_token')::uuid)$$,'self scan is ignored');
select is(jsonb_array_length(public.get_my_event_networking_scans('91000000-0000-0000-0000-000000000010')),0,'self scan creates no history');

set local request.jwt.claim.sub='92000000-0000-0000-0000-000000000001';
select is(public.get_event_networking_card('91000000-0000-0000-0000-000000000010',current_setting('test.card_token')::uuid)::text,null,'other event member cannot open card');

set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000002';
select ok(public.get_event_networking_card('91000000-0000-0000-0000-000000000010',
  current_setting('test.card_token')::uuid) is not null,'same-event member opens selected card');
select is(public.get_event_networking_card('92000000-0000-0000-0000-000000000010',
  current_setting('test.card_token')::uuid)::text,null,'wrong event card lookup hidden');
select lives_ok($$select public.record_event_networking_scan('91000000-0000-0000-0000-000000000010',
  current_setting('test.card_token')::uuid)$$,'member records scan');
select lives_ok($$select public.record_event_networking_scan('91000000-0000-0000-0000-000000000010',
  current_setting('test.card_token')::uuid)$$,'repeat scan accepted');
select is(jsonb_array_length(public.get_my_event_networking_scans('91000000-0000-0000-0000-000000000010')),1,'scan history deduplicated');
select lives_ok($$select public.save_event_networking_card('91000000-0000-0000-0000-000000000010',array['github'],1)$$,'second member selects own link');
select lives_ok($$select public.save_event_reusable_social_links('91000000-0000-0000-0000-000000000010','','','','https://github.com/two-updated')$$,'email-link member can save reusable URL without Google claim');
select is((public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')->'links'->>'github'),'https://github.com/two-updated','selected event link follows updated reusable URL');

reset role;
update public.event_memberships set status='blocked',ended_at=now() where id='91000000-0000-0000-0000-000000000012';
select is((select count(*)::integer from public.event_networking_card_links where membership_id='91000000-0000-0000-0000-000000000012'),0,'blocking clears selected links');
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000002';
select is(public.get_my_event_networking_scans('91000000-0000-0000-0000-000000000010')::text,'[]','blocked member cannot read history');
reset role;
update public.events set lifecycle='archived',archived_at=now() where id='91000000-0000-0000-0000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000001';
select throws_ok($$select public.save_event_networking_card('91000000-0000-0000-0000-000000000010',array['github'],1)$$,'active published event membership required','archived card read-only');
select is((public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')->>'template')::integer,2,'archived card remains readable');
set local request.jwt.claims='{"sub":"91000000-0000-0000-0000-000000000001","app_metadata":{"provider":"google"}}';
select lives_ok($$select public.save_social_profiles('','','','')$$,'removing global URL succeeds');
select is((public.get_my_event_networking_card('91000000-0000-0000-0000-000000000010')->'links')::text,'{}','removed global URL is no longer selected in event');
reset role;
update public.event_memberships set status='active',ended_at=null where id='91000000-0000-0000-0000-000000000012';
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000002';
select is(public.get_my_event_networking_scans('91000000-0000-0000-0000-000000000010')->0->>'token',null,'card with no selected live links is not clickable from history');
reset role;
update public.event_memberships set user_id=null where id='91000000-0000-0000-0000-000000000011';
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000002';
select is(public.get_my_event_networking_scans('91000000-0000-0000-0000-000000000010')->0->>'name','Former attendee','anonymized member name is not exposed in scan history');
select is(public.get_my_event_networking_scans('91000000-0000-0000-0000-000000000010')->0->>'token',null,'anonymized member card cannot reopen');

select * from finish();
rollback;
