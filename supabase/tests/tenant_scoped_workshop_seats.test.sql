begin;
select plan(26);

select ok((select attnotnull from pg_attribute where attrelid='public.session_seat_claims'::regclass and attname='event_id'),
  'seat claims require an event id');
select ok(exists(select 1 from pg_constraint where conrelid='public.session_seat_claims'::regclass
  and conname='session_seat_claims_event_session_fkey'), 'seat claims have a composite event/session foreign key');
select ok(not has_table_privilege('authenticated','public.session_seat_claims','insert,update,delete'),
  'clients cannot write claims directly');

set local session_replication_role=replica;
insert into auth.users(id,email) values
  ('81000000-0000-0000-0000-000000000001','seat-owner-one@example.com'),
  ('81000000-0000-0000-0000-000000000002','seat-attendee-one@example.com'),
  ('81000000-0000-0000-0000-000000000003','seat-attendee-two@example.com'),
  ('82000000-0000-0000-0000-000000000001','seat-owner-two@example.com'),
  ('83000000-0000-0000-0000-000000000001','seat-support@example.com');
insert into public.events(id,name,venue,starts_at,ends_at,status,theme,slug,lifecycle,ever_published,published_at,theme_preset,accent_color) values
  ('81000000-0000-0000-0000-000000000010','Seat One','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Seat One','seat-one','published',true,now(),'daylight','#2563EB'),
  ('82000000-0000-0000-0000-000000000010','Seat Two','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Seat Two','seat-two','published',true,now(),'daylight','#2563EB');
insert into public.event_memberships(id,event_id,user_id,role,display_name_snapshot) values
  ('81000000-0000-0000-0000-000000000011','81000000-0000-0000-0000-000000000010','81000000-0000-0000-0000-000000000001','owner','Owner'),
  ('81000000-0000-0000-0000-000000000012','81000000-0000-0000-0000-000000000010','81000000-0000-0000-0000-000000000002','attendee','Attendee'),
  ('81000000-0000-0000-0000-000000000013','81000000-0000-0000-0000-000000000010','81000000-0000-0000-0000-000000000003','attendee','Attendee Two'),
  ('82000000-0000-0000-0000-000000000011','82000000-0000-0000-0000-000000000010','82000000-0000-0000-0000-000000000001','owner','Owner Two');
insert into public.platform_super_admins(user_id) values('83000000-0000-0000-0000-000000000001');
insert into public.platform_support_sessions(super_admin_user_id,event_id,reason,expires_at)
values('83000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000010','Seat support check',now()+interval '30 minutes');
set local session_replication_role=origin;
insert into public.sessions(id,event_id,title,start_time,end_time,status,published,capacity) values
  ('81000000-0000-0000-0000-000000000020','81000000-0000-0000-0000-000000000010','One seat',now()+interval '26 hours',now()+interval '27 hours','not_started',true,1),
  ('82000000-0000-0000-0000-000000000020','82000000-0000-0000-0000-000000000010','Other seat',now()+interval '26 hours',now()+interval '27 hours','not_started',true,1);

set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000002';
select lives_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,'member claims a seat');
select is((select claimed_seats from public.sessions where id='81000000-0000-0000-0000-000000000020'),1,'trigger increments count');
select lives_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,'repeat claim is idempotent');
select is((select count(*)::integer from public.session_seat_claims where event_id='81000000-0000-0000-0000-000000000010'),1,'one claim row after replay');
select throws_ok($$select public.claim_session_seat('82000000-0000-0000-0000-000000000020')$$,
  'active event membership required','cross-event claim denied');

set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select throws_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,
  'no seats left','last seat cannot be oversold');
select is((select count(*)::integer from public.session_seat_claims where event_id='81000000-0000-0000-0000-000000000010'),0,
  'another attendee cannot read the claim roster');

reset role;
select throws_ok($$insert into public.session_seat_claims(event_id,session_id,user_id)
  values('82000000-0000-0000-0000-000000000010','81000000-0000-0000-0000-000000000020','81000000-0000-0000-0000-000000000003')$$,
  '23503',null,'composite FK rejects cross-event claim ownership');
update public.event_memberships set status='left',ended_at=now()
  where id='81000000-0000-0000-0000-000000000012';
select is((select claimed_seats from public.sessions where id='81000000-0000-0000-0000-000000000020'),0,
  'leaving automatically frees the seat');
select is((select count(*)::integer from public.my_flow_bookmarks where user_id='81000000-0000-0000-0000-000000000002'),1,
  'automatic release preserves the bookmark');

set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select lives_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,'freed seat is claimable');
reset role;
update public.event_memberships set status='blocked',ended_at=now()
  where id='81000000-0000-0000-0000-000000000013';
select is((select claimed_seats from public.sessions where id='81000000-0000-0000-0000-000000000020'),0,
  'blocking automatically frees the seat');
select is((select count(*)::integer from public.session_seat_claims where event_id='81000000-0000-0000-0000-000000000010'),0,
  'no stale claim row remains after blocking');
update public.event_memberships set status='active',ended_at=null
  where id='81000000-0000-0000-0000-000000000013';
set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select lives_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,'reactivated member can claim');
reset role;
update public.event_memberships set status='removed',ended_at=now()
  where id='81000000-0000-0000-0000-000000000013';
select is((select claimed_seats from public.sessions where id='81000000-0000-0000-0000-000000000020'),0,
  'removal automatically frees the seat');
update public.event_memberships set status='active',ended_at=null
  where id='81000000-0000-0000-0000-000000000013';
set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select lives_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,'member can reclaim after reactivation');
select lives_ok($$select public.release_session_seat('81000000-0000-0000-0000-000000000020')$$,'voluntary release remains available');

set local role authenticated;
set local request.jwt.claim.sub='83000000-0000-0000-0000-000000000001';
select throws_ok($$select public.admin_set_session_capacity('81000000-0000-0000-0000-000000000020',2,0,false,'83000000-0000-0000-0000-000000000020')$$,
  'event staff access required','support access cannot change capacity');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000001';
select lives_ok($$select public.admin_set_session_capacity('81000000-0000-0000-0000-000000000020',2,0,false,'81000000-0000-0000-0000-000000000021')$$,
  'event owner can set capacity');
select is((select capacity from public.sessions where id='81000000-0000-0000-0000-000000000020'),2,
  'owner capacity change persists');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select lives_ok($$select public.claim_session_seat('81000000-0000-0000-0000-000000000020')$$,
  'member can claim before account removal');
reset role;
delete from auth.users where id='81000000-0000-0000-0000-000000000003';
select is((select claimed_seats from public.sessions where id='81000000-0000-0000-0000-000000000020'),0,
  'auth identity deletion cannot strand a held-seat counter');
update public.events set lifecycle='archived',archived_at=now()
  where id='81000000-0000-0000-0000-000000000010';
set local role authenticated;
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000001';
select throws_ok($$select public.admin_set_session_capacity('81000000-0000-0000-0000-000000000020',3,0,false,'81000000-0000-0000-0000-000000000022')$$,
  'event content is read-only','archived event capacity is read-only');
select * from finish();
rollback;
