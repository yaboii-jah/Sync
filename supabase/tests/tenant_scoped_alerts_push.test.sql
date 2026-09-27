begin;

select plan(11);

set local session_replication_role = replica;
insert into auth.users(id,email) values
  ('71000000-0000-0000-0000-000000000001','alert-owner-one@example.com'),
  ('71000000-0000-0000-0000-000000000002','alert-attendee-one@example.com'),
  ('72000000-0000-0000-0000-000000000001','alert-owner-two@example.com'),
  ('73000000-0000-0000-0000-000000000001','alert-outsider@example.com');
insert into public.events(id,name,venue,starts_at,ends_at,status,theme,slug,lifecycle,ever_published,published_at,theme_preset,accent_color)
values
  ('71000000-0000-0000-0000-000000000010','Alerts One','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Alerts One','alerts-one','published',true,now(),'daylight','#2563EB'),
  ('72000000-0000-0000-0000-000000000010','Alerts Two','Room',now()+interval '1 day',now()+interval '2 days','upcoming','Alerts Two','alerts-two','published',true,now(),'daylight','#2563EB');
insert into public.event_memberships(id,event_id,user_id,role,display_name_snapshot) values
  ('71000000-0000-0000-0000-000000000011','71000000-0000-0000-0000-000000000010','71000000-0000-0000-0000-000000000001','owner','Owner One'),
  ('71000000-0000-0000-0000-000000000012','71000000-0000-0000-0000-000000000010','71000000-0000-0000-0000-000000000002','attendee','Attendee One'),
  ('72000000-0000-0000-0000-000000000011','72000000-0000-0000-0000-000000000010','72000000-0000-0000-0000-000000000001','owner','Owner Two');
set local session_replication_role = origin;

set local role authenticated;
set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000001';
select lives_ok($$select public.send_event_alert('71000000-0000-0000-0000-000000000010','First alert','Hello','all','{}'::uuid[],'71000000-0000-0000-0000-000000000020')$$,
  'owner can send an all-member event alert');
select is((select count(*)::integer from public.notification_recipients where event_id='71000000-0000-0000-0000-000000000010'),2,
  'all-member alert snapshots active members');
select is((select count(*)::integer from public.notifications where event_id='71000000-0000-0000-0000-000000000010'),1,
  'one event notification was created');
select lives_ok($$select public.send_event_alert('71000000-0000-0000-0000-000000000010','First alert','Hello','all','{}'::uuid[],'71000000-0000-0000-0000-000000000020')$$,
  'same request id safely replays');
select is((select count(*)::integer from public.notifications where event_id='71000000-0000-0000-0000-000000000010'),1,
  'replay does not create a duplicate');
select throws_ok($$select public.send_event_alert('72000000-0000-0000-0000-000000000010','Wrong event','Hello','all','{}'::uuid[],'71000000-0000-0000-0000-000000000021')$$,
  'event staff access required', 'owner cannot send to another event');
select throws_ok($$select public.send_event_alert('71000000-0000-0000-0000-000000000010','Wrong member','Hello','selected',array['72000000-0000-0000-0000-000000000011']::uuid[],'71000000-0000-0000-0000-000000000022')$$,
  'selected member is outside this event or inactive', 'cross-event recipient is rejected');

set local request.jwt.claim.sub = '71000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.notifications where event_id='71000000-0000-0000-0000-000000000010'),1,
  'recipient can read its event alert');
select lives_ok($$select public.set_event_push_preference('71000000-0000-0000-0000-000000000010',true)$$,
  'member can opt in for its event');
select throws_ok($$select public.set_event_push_preference('72000000-0000-0000-0000-000000000010',true)$$,
  'active event membership required', 'member cannot opt in for another event');

set local request.jwt.claim.sub = '73000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.notifications where event_id='71000000-0000-0000-0000-000000000010'),0,
  'outsider cannot read the event alert');

select * from finish();
rollback;
