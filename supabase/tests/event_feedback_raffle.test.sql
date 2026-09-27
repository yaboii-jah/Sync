begin;
select plan(35);

select ok((select relrowsecurity from pg_class where oid='public.event_feedback'::regclass), 'feedback table has RLS');
select ok(not has_table_privilege('authenticated','public.event_feedback','select,insert,update,delete'), 'no direct feedback access');
select ok(not has_function_privilege('anon','public.submit_event_feedback(uuid,text,text,uuid)','execute'), 'anonymous submission denied');
select ok(not has_function_privilege('anon','public.list_event_feedback(uuid,integer)','execute'), 'anonymous feedback read denied');
select ok(not has_function_privilege('anon','public.get_event_raffle_attendees(uuid)','execute'), 'anonymous raffle denied');
select ok(not has_function_privilege('anon','public.get_event_raffle_attendee_detail(uuid,uuid)','execute'), 'anonymous raffle detail denied');
select ok((select count(*) from pg_constraint where conrelid='public.event_feedback'::regclass and contype='f')=2, 'event and composite membership FKs exist');

set local session_replication_role=replica;
insert into auth.users(id,email) values
 ('93000000-0000-0000-0000-000000000001','unit-owner-a@example.com'),
 ('93000000-0000-0000-0000-000000000002','unit-attendee-a@example.com'),
 ('93000000-0000-0000-0000-000000000003','unit-owner-b@example.com'),
 ('93000000-0000-0000-0000-000000000004','unit-attendee-b@example.com'),
 ('93000000-0000-0000-0000-000000000005','unit-blank@example.com');
insert into public.profiles(id,name) values
 ('93000000-0000-0000-0000-000000000001','Owner A'),
 ('93000000-0000-0000-0000-000000000002','Same Name'),
 ('93000000-0000-0000-0000-000000000003','Owner B'),
 ('93000000-0000-0000-0000-000000000004','Same Name'),
 ('93000000-0000-0000-0000-000000000005','   ');
insert into public.events(id,name,venue,starts_at,ends_at,status,theme,slug,lifecycle,ever_published,published_at,theme_preset,accent_color) values
 ('93000000-0000-0000-0000-000000000010','Unit A','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Unit A','unit-feedback-a','published',true,now(),'daylight','#2563EB'),
 ('93000000-0000-0000-0000-000000000020','Unit B','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Unit B','unit-feedback-b','published',true,now(),'daylight','#2563EB');
insert into public.event_memberships(id,event_id,user_id,role,display_name_snapshot) values
 ('93000000-0000-0000-0000-000000000011','93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000001','owner','Owner A'),
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000002','attendee','Same Name'),
 ('93000000-0000-0000-0000-000000000013','93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000005','attendee',''),
 ('93000000-0000-0000-0000-000000000021','93000000-0000-0000-0000-000000000020','93000000-0000-0000-0000-000000000003','owner','Owner B'),
 ('93000000-0000-0000-0000-000000000022','93000000-0000-0000-0000-000000000020','93000000-0000-0000-0000-000000000004','attendee','Same Name');
update public.event_memberships set email_snapshot='unit-attendee-a@example.com'
  where id='93000000-0000-0000-0000-000000000012';
set local session_replication_role=origin;

set local role authenticated;
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000002';
select lives_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','idea','  Helpful event  ','93000000-0000-4000-8000-000000000001')$$, 'attendee submits to own event');
select lives_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','idea','  Helpful event  ','93000000-0000-4000-8000-000000000001')$$, 'retry succeeds');
select throws_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000020','idea','Wrong tenant','93000000-0000-4000-8000-000000000002')$$,'active attendee membership required','cross-event submission denied');
select throws_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','wrong','Invalid','93000000-0000-4000-8000-000000000003')$$,'invalid feedback','invalid category denied');
select throws_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','idea',' ','93000000-0000-4000-8000-000000000004')$$,'invalid feedback','blank feedback denied');
select throws_ok($$select * from public.list_event_feedback('93000000-0000-0000-0000-000000000010',100)$$,'event manager required','attendee cannot list feedback');
select throws_ok($$select public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')$$,'published event manager required','attendee cannot export raffle');
select throws_ok($$select public.get_event_raffle_attendee_detail('93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000012')$$,'published event manager required','attendee cannot see raffle detail');

set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.list_event_feedback('93000000-0000-0000-0000-000000000010',100)),1,'retry created only one feedback row');
select is((select message from public.list_event_feedback('93000000-0000-0000-0000-000000000010',100)),'Helpful event','feedback text trimmed');
select throws_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','idea','Owner','93000000-0000-4000-8000-000000000005')$$,'active attendee membership required','owner cannot submit attendee feedback');
select throws_ok($$select * from public.list_event_feedback('93000000-0000-0000-0000-000000000020',100)$$,'event manager required','other event feedback denied');
select is(jsonb_array_length(public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')->'attendees'),1,'raffle includes only named local attendee');
select is((public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')->>'excluded_blank_count')::integer,1,'blank attendee skipped');
select throws_ok($$select public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000020')$$,'published event manager required','cross-event raffle denied');
select is(public.get_event_raffle_attendee_detail('93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000012')->>'name','Same Name','manager can confirm own attendee');
select is(public.get_event_raffle_attendee_detail('93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000012')->>'email','unit-attendee-a@example.com','detail reveals only selected own attendee email');
select is(public.get_event_raffle_attendee_detail('93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000022')::text,null,'other event member detail hidden');

reset role;
update public.event_memberships set status='removed',ended_at=now() where id='93000000-0000-0000-0000-000000000012';
set local role authenticated;
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000002';
select throws_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','idea','Removed','93000000-0000-4000-8000-000000000007')$$,'active attendee membership required','removed attendee cannot submit');
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000001';
select is(jsonb_array_length(public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')->'attendees'),0,'removed attendee is absent from raffle');
reset role;
update public.event_memberships set status='active',ended_at=null where id='93000000-0000-0000-0000-000000000012';

reset role;
update public.events set lifecycle='archived',archived_at=now() where id='93000000-0000-0000-0000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000002';
select throws_ok($$select public.submit_event_feedback('93000000-0000-0000-0000-000000000010','idea','Too late','93000000-0000-4000-8000-000000000006')$$,'published event required','archived submissions denied');
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.list_event_feedback('93000000-0000-0000-0000-000000000010',100)),1,'archived feedback readable');
select is(jsonb_array_length(public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')->'attendees'),1,'archived raffle readable');
reset role;
update public.events set suspended_at=now(),suspension_reason='test' where id='93000000-0000-0000-0000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000001';
select throws_ok($$select * from public.list_event_feedback('93000000-0000-0000-0000-000000000010',100)$$,'event manager required','suspended feedback hidden');
select throws_ok($$select public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')$$,'published event manager required','suspended raffle hidden');
select throws_ok($$select public.get_event_raffle_attendee_detail('93000000-0000-0000-0000-000000000010','93000000-0000-0000-0000-000000000012')$$,'published event manager required','suspended detail hidden');

reset role;
update public.events set suspended_at=null,suspension_reason=null where id='93000000-0000-0000-0000-000000000010';
update public.event_memberships set user_id=null where id='93000000-0000-0000-0000-000000000012';
set local role authenticated;
set local request.jwt.claim.sub='93000000-0000-0000-0000-000000000001';
select is((select attendee_name from public.list_event_feedback('93000000-0000-0000-0000-000000000010',100)),'Former attendee','anonymized author name not exposed');
select is(jsonb_array_length(public.get_event_raffle_attendees('93000000-0000-0000-0000-000000000010')->'attendees'),0,'anonymized attendee is absent from raffle');

select * from finish();
rollback;
