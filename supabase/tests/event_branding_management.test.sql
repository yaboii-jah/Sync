begin;
select no_plan();

select ok(
  (select not public and file_size_limit = 10485760 and allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
     from storage.buckets where id = 'event-branding-staging')
  and (select public and file_size_limit = 2097152 and allowed_mime_types = array['image/webp']::text[]
     from storage.buckets where id = 'event-branding'),
  'branding buckets have explicit access, size, and MIME limits'
);
select ok(
  has_function_privilege('authenticated','public.set_event_branding(uuid,text,text,uuid)','execute')
  and not has_function_privilege('anon','public.set_event_branding(uuid,text,text,uuid)','execute'),
  'branding mutation is authenticated only'
);
select ok(
  has_function_privilege('authenticated','private.can_manage_event_branding_object(text,text)','execute')
  and not has_function_privilege('anon','private.can_manage_event_branding_object(text,text)','execute'),
  'the Storage policy helper is exposed only to authenticated callers'
);
select is(
  (select count(*)::integer from pg_proc join pg_namespace n on n.oid=pronamespace
    where n.nspname in ('public','private')
      and proname in ('set_event_branding','can_manage_event_branding_object')
      and prosecdef and proconfig && array['search_path=','search_path=""']),
  2,
  'privileged branding functions pin the search path'
);
select is(
  (select count(*)::integer from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'Event staff can % branding % objects'),
  5,
  'Storage operations are covered by narrow event-branding policies'
);

set local session_replication_role = replica;
insert into auth.users (id,email,email_confirmed_at) values
 ('61000000-0000-4000-8000-000000000001','branding-owner@example.com',now()),
 ('61000000-0000-4000-8000-000000000002','branding-admin@example.com',now()),
 ('61000000-0000-4000-8000-000000000003','branding-attendee@example.com',now()),
 ('62000000-0000-4000-8000-000000000001','branding-other@example.com',now());
insert into public.profiles(id,name) values
 ('61000000-0000-4000-8000-000000000001','Branding Owner'),
 ('61000000-0000-4000-8000-000000000002','Branding Admin'),
 ('61000000-0000-4000-8000-000000000003','Branding Attendee'),
 ('62000000-0000-4000-8000-000000000001','Other Owner');
insert into public.events (
  id,name,starts_at,ends_at,status,theme,slug,timezone,lifecycle,ever_published,published_at,archived_at,theme_preset,accent_color
) values
 ('e6100000-0000-4000-8000-000000000001','Branding One',now()+interval '1 day',now()+interval '2 days','upcoming','Branding One','branding-one','UTC','draft',false,null,null,'daylight','#2563EB'),
 ('e6200000-0000-4000-8000-000000000002','Branding Two',now()+interval '1 day',now()+interval '2 days','upcoming','Branding Two','branding-two','UTC','draft',false,null,null,'daylight','#2563EB'),
 ('e6300000-0000-4000-8000-000000000003','Branding Archived',now()-interval '2 days',now()-interval '1 day','ended','Branding Archived','branding-archived','UTC','archived',true,now()-interval '3 days',now()-interval '1 day','daylight','#2563EB'),
 ('e6400000-0000-4000-8000-000000000004','Branding Suspended',now()+interval '1 day',now()+interval '2 days','upcoming','Branding Suspended','branding-suspended','UTC','draft',false,null,null,'daylight','#2563EB');
update public.events set suspended_at=now(),suspension_reason='Branding policy test' where id='e6400000-0000-4000-8000-000000000004';
insert into public.event_memberships(id,event_id,user_id,role,status,display_name_snapshot,ended_at) values
 ('f6100000-0000-4000-8000-000000000001','e6100000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','owner','active','Branding Owner',null),
 ('f6100000-0000-4000-8000-000000000002','e6100000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','admin','active','Branding Admin',null),
 ('f6100000-0000-4000-8000-000000000003','e6100000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','attendee','active','Branding Attendee',null),
 ('f6200000-0000-4000-8000-000000000001','e6200000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000001','owner','active','Other Owner',null),
 ('f6300000-0000-4000-8000-000000000001','e6300000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001','owner','active','Branding Owner',null),
 ('f6400000-0000-4000-8000-000000000001','e6400000-0000-4000-8000-000000000004','61000000-0000-4000-8000-000000000001','owner','active','Branding Owner',null);
set local session_replication_role = origin;

set local role authenticated;
set local request.jwt.claim.sub='61000000-0000-4000-8000-000000000001';
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id,metadata) values (
  'event-branding-staging','events/e6100000-0000-4000-8000-000000000001/branding/staging/61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000001.png',
  '61000000-0000-4000-8000-000000000001','{"mimetype":"image/png","size":128}'::jsonb)$$,
  'owner can insert a correctly scoped private staging object');
select is((select count(*)::integer from storage.objects where bucket_id='event-branding-staging'),1,'owner can read own staging object');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id,metadata) values (
  'event-branding-staging','events/e6200000-0000-4000-8000-000000000002/branding/staging/61000000-0000-4000-8000-000000000001/71000000-0000-4000-8000-000000000002.png',
  '61000000-0000-4000-8000-000000000001','{"mimetype":"image/png","size":128}'::jsonb)$$,'42501',null,
  'Storage policy denies a cross-tenant staging upload');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id,metadata) values (
  'event-branding-staging','events/not-an-event/branding/staging/61000000-0000-4000-8000-000000000001/unsafe.svg',
  '61000000-0000-4000-8000-000000000001','{"mimetype":"image/svg+xml","size":128}'::jsonb)$$,'42501',null,
  'Storage policy denies malformed paths and unsupported extensions');
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id,metadata) values (
  'event-branding','events/e6100000-0000-4000-8000-000000000001/branding/logo/72000000-0000-4000-8000-000000000001.webp',
  '61000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":256}'::jsonb)$$,
  'owner can insert a versioned delivery object');
select is(
  public.set_event_branding('e6100000-0000-4000-8000-000000000001','logo','events/e6100000-0000-4000-8000-000000000001/branding/logo/72000000-0000-4000-8000-000000000001.webp','73000000-0000-4000-8000-000000000001'),
  null,
  'owner can attach a normalized logo');
select is((select logo_path from public.events where id='e6100000-0000-4000-8000-000000000001'),
  'events/e6100000-0000-4000-8000-000000000001/branding/logo/72000000-0000-4000-8000-000000000001.webp','logo path is stored on the tenant event');
select lives_ok($$select public.set_event_branding('e6100000-0000-4000-8000-000000000001','logo',null,'73000000-0000-4000-8000-000000000001')$$,
  'replaying a branding request is idempotent');
select is((select count(*)::integer from public.event_audit_log where request_id='73000000-0000-4000-8000-000000000001'),1,'branding mutation is audited once');
select throws_ok($$select public.set_event_branding('e6100000-0000-4000-8000-000000000001','avatar',null,'73000000-0000-4000-8000-000000000002')$$,
  'P0001','valid branding asset kind is required','unknown asset kinds are rejected');
select throws_ok($$select public.set_event_branding('e6100000-0000-4000-8000-000000000001','cover','events/e6100000-0000-4000-8000-000000000001/branding/cover/72000000-0000-4000-8000-000000000099.webp','73000000-0000-4000-8000-000000000003')$$,
  'P0001','normalized branding asset is required','database refuses a path without a normalized Storage object');

set local request.jwt.claim.sub='61000000-0000-4000-8000-000000000002';
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id,metadata) values (
  'event-branding','events/e6100000-0000-4000-8000-000000000001/branding/cover/72000000-0000-4000-8000-000000000002.webp',
  '61000000-0000-4000-8000-000000000002','{"mimetype":"image/webp","size":512}'::jsonb)$$,
  'active event admin can insert a delivery object');
select is(public.set_event_branding('e6100000-0000-4000-8000-000000000001','cover','events/e6100000-0000-4000-8000-000000000001/branding/cover/72000000-0000-4000-8000-000000000002.webp','73000000-0000-4000-8000-000000000004'),null,
  'active event admin can update cover branding');

set local request.jwt.claim.sub='61000000-0000-4000-8000-000000000003';
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id,metadata) values (
  'event-branding-staging','events/e6100000-0000-4000-8000-000000000001/branding/staging/61000000-0000-4000-8000-000000000003/71000000-0000-4000-8000-000000000003.png',
  '61000000-0000-4000-8000-000000000003','{"mimetype":"image/png","size":128}'::jsonb)$$,'42501',null,
  'attendee cannot upload event branding');
select throws_ok($$select public.set_event_branding('e6100000-0000-4000-8000-000000000001','logo',null,'73000000-0000-4000-8000-000000000005')$$,
  'P0001','event staff access required','attendee cannot mutate branding');

set local request.jwt.claim.sub='62000000-0000-4000-8000-000000000001';
select throws_ok($$select public.set_event_branding('e6100000-0000-4000-8000-000000000001','logo',null,'73000000-0000-4000-8000-000000000006')$$,
  'P0001','event staff access required','unrelated owner cannot mutate another tenant');

set local request.jwt.claim.sub='61000000-0000-4000-8000-000000000001';
select throws_ok($$select public.set_event_branding('e6300000-0000-4000-8000-000000000003','logo',null,'73000000-0000-4000-8000-000000000007')$$,
  'P0001','event administration is read-only','archived event branding is read-only');
select throws_ok($$select public.set_event_branding('e6400000-0000-4000-8000-000000000004','logo',null,'73000000-0000-4000-8000-000000000008')$$,
  'P0001','event administration is read-only','suspended event branding is read-only');
select is(public.set_event_branding('e6100000-0000-4000-8000-000000000001','logo',null,'73000000-0000-4000-8000-000000000009'),
  'events/e6100000-0000-4000-8000-000000000001/branding/logo/72000000-0000-4000-8000-000000000001.webp','removal returns the prior object path for cleanup');
select is((select logo_path from public.events where id='e6100000-0000-4000-8000-000000000001'),null,'branding removal clears the event path');
select ok(private.can_manage_event_branding_object(
  'events/e6100000-0000-4000-8000-000000000001/branding/logo/72000000-0000-4000-8000-000000000001.webp','delivery'),
  'owner remains authorized to remove an obsolete delivery object through the Storage API');

reset role;
select * from finish();
rollback;
