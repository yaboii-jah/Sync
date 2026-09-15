begin;
select no_plan();

select ok(has_function_privilege('authenticated','public.create_event(text,text,text,text,text,timestamptz,timestamptz,uuid)','execute')
  and not has_function_privilege('anon','public.create_event(text,text,text,text,text,timestamptz,timestamptz,uuid)','execute'), 'creation RPC is authenticated only');
select ok(has_function_privilege('authenticated','public.update_event_basics(uuid,text,text,text,text,timestamptz,timestamptz,uuid)','execute')
  and not has_function_privilege('anon','public.update_event_basics(uuid,text,text,text,text,timestamptz,timestamptz,uuid)','execute'), 'basics RPC is authenticated only');
select ok(not has_function_privilege('authenticated','private.validate_event_basics(text,text,text,text,timestamptz,timestamptz)','execute'), 'validation helper is not exposed');
select is((select count(*)::integer from pg_proc join pg_namespace n on n.oid=pronamespace
  where n.nspname in ('public','private') and proname in ('create_event','update_event_basics','protect_event_audit_history')
  and prosecdef and proconfig && array['search_path=','search_path=""']), 3, 'new privileged functions have pinned search paths');

set local session_replication_role = replica;
insert into auth.users (id,email,email_confirmed_at) values
 ('44000000-0000-4000-8000-000000000001','organizer-one@example.com',now()),
 ('44000000-0000-4000-8000-000000000002','organizer-two@example.com',now()),
 ('44000000-0000-4000-8000-000000000003','organizer-admin@example.com',now()),
 ('44000000-0000-4000-8000-000000000004','organizer-attendee@example.com',now());
insert into public.profiles(id,name) values
 ('44000000-0000-4000-8000-000000000001','Organizer One'),
 ('44000000-0000-4000-8000-000000000002','Organizer Two'),
 ('44000000-0000-4000-8000-000000000003','Event Admin'),
 ('44000000-0000-4000-8000-000000000004','Event Attendee');
set local session_replication_role = origin;
insert into public.platform_quota_overrides(user_id,active_event_limit,reason,updated_by)
 values ('44000000-0000-4000-8000-000000000001',2,'Test organizer quota','44000000-0000-4000-8000-000000000001');
create temporary table organizer_fixture(key text primary key,id uuid);
grant select,insert on organizer_fixture to authenticated;

set local role authenticated;
set local request.jwt.claim.sub='44000000-0000-4000-8000-000000000001';
insert into organizer_fixture values ('one',public.create_event(' Event One ','organizer-event-one',' Description ',' Venue ','Asia/Manila','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000001'));
select is((select name from public.events where slug='organizer-event-one'),'Event One','creation trims event identity');
select is((select lifecycle from public.events where slug='organizer-event-one'),'draft','creation defaults to draft');
select ok((select not ever_published and published_at is null and theme_preset='daylight' and accent_color='#2563EB' and theme=name from public.events where slug='organizer-event-one'),'new event has neutral branding and no publication history');
select is((select count(*)::integer from public.event_memberships where event_id=(select id from organizer_fixture where key='one') and role='owner' and status='active'),1,'creation establishes exactly one active owner');
select is((select email_snapshot from public.event_memberships where event_id=(select id from organizer_fixture where key='one')),'organizer-one@example.com','owner identity snapshot comes from auth');
select is((select count(*)::integer from public.event_audit_log where event_id=(select id from organizer_fixture where key='one') and action='event.create'),1,'creation emits one audit');
select is(public.create_event('Event One','organizer-event-one','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000001'),(select id from organizer_fixture where key='one'),'same creation request returns the original event');
select is((select count(*)::integer from public.events where slug='organizer-event-one'),1,'replay does not duplicate events');
insert into organizer_fixture values ('two',public.create_event('Event Two','organizer-event-two','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000002'));
select throws_ok($$select public.create_event('Over Quota','organizer-over-quota','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000003')$$,'P0001','active owned event limit reached','owner quota enforced');
select lives_ok($$select public.archive_event((select id from organizer_fixture where key='two'),'Archived for quota test','45000000-0000-4000-8000-000000000004')$$,'owner can archive to release quota');
insert into organizer_fixture values ('delete',public.create_event('Delete Draft','organizer-delete-draft','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000005'));
select ok((select id is not null from organizer_fixture where key='delete'),'archived owned events do not count toward quota');

set local request.jwt.claim.sub='44000000-0000-4000-8000-000000000002';
select is_empty($$select id from public.events where slug='organizer-event-one'$$,'unrelated owner cannot read another draft');
select throws_ok($$select public.create_event('Other','organizer-other','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000001')$$,'P0001','request id was already used for another mutation','creation replay cannot cross actors');
select throws_ok($$select public.create_event('Duplicate','organizer-event-one','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000006')$$,'23505',null,'slugs are globally unique');
select throws_ok($$select public.create_event('Bad Slug','Bad Slug','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000007')$$,'P0001','valid event slug is required','malformed slug rejected in database');
select throws_ok($$select public.create_event('Bad Zone','organizer-bad-zone','','','Invalid/Zone','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000008')$$,'P0001','valid event timezone is required','invalid timezone rejected');
select throws_ok($$select public.create_event('Bad Dates','organizer-bad-dates','','','UTC','2026-10-11 01:00Z','2026-10-10 01:00Z','45000000-0000-4000-8000-000000000009')$$,'P0001','event end must be after start','invalid time range rejected');
select throws_ok($$select public.create_event('Infinite','organizer-infinite','','','UTC','2026-10-11 01:00Z','infinity','45000000-0000-4000-8000-000000000010')$$,'P0001','event end must be after start','infinite date rejected');
select throws_ok($$select public.create_event(repeat('N',161),'organizer-long-name','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000011')$$,'P0001','event name must be between 1 and 160 characters','long name rejected');
select throws_ok($$select public.create_event('Long Description','organizer-long-description',repeat('D',4001),'','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000012')$$,'P0001','event description or venue is too long','long description rejected');
insert into organizer_fixture values ('other',public.create_event('Other Tenant','organizer-other-tenant','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000013'));
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Cross Tenant','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000014')$$,'P0001','event staff access required','unrelated tenant update denied');

reset role;
insert into public.event_memberships(event_id,user_id,role,status,display_name_snapshot)
select id,'44000000-0000-4000-8000-000000000003','admin','active','Event Admin' from organizer_fixture where key='one';
insert into public.event_memberships(event_id,user_id,role,status,display_name_snapshot)
select id,'44000000-0000-4000-8000-000000000004','attendee','active','Event Attendee' from organizer_fixture where key='one';
set local role authenticated;
set local request.jwt.claim.sub='44000000-0000-4000-8000-000000000003';
select lives_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Updated by Admin','Updated description','New venue','Asia/Manila','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000015')$$,'active event admin can edit basics');
select is((select name from public.events where id=(select id from organizer_fixture where key='one')),'Updated by Admin','edit changes name');
select is((select slug from public.events where id=(select id from organizer_fixture where key='one')),'organizer-event-one','edit preserves slug');
select is((select count(*)::integer from public.event_audit_log where request_id='45000000-0000-4000-8000-000000000015'),1,'basics edit audited once');
select lives_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Replay','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000015')$$,'edit replay is idempotent');
select is((select name from public.events where id=(select id from organizer_fixture where key='one')),'Updated by Admin','replay does not apply a changed payload');
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='other'),'Cross Tenant','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000016')$$,'P0001','event staff access required','admin powers do not cross tenants');
set local request.jwt.claim.sub='44000000-0000-4000-8000-000000000004';
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Attendee Edit','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000017')$$,'P0001','event staff access required','attendee edit denied');

reset role;
update public.event_memberships set status='removed',ended_at=now() where user_id='44000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claim.sub='44000000-0000-4000-8000-000000000003';
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Inactive Edit','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000018')$$,'P0001','event staff access required','inactive admin edit denied');
reset role;
update public.events set suspended_at=now(),suspension_reason='Organizer test suspension' where id=(select id from organizer_fixture where key='one');
set local role authenticated;
set local request.jwt.claim.sub='44000000-0000-4000-8000-000000000001';
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Suspended Edit','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000019')$$,'P0001','event administration is read-only','suspended edit denied');
select throws_ok($$select public.create_event('Suspended Quota','organizer-suspended-quota','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000020')$$,'P0001','active owned event limit reached','suspended events still consume quota');
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='two'),'Archived Edit','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000021')$$,'P0001','event administration is read-only','archived edit denied');

reset role;
update public.events set suspended_at=null,suspension_reason=null where id=(select id from organizer_fixture where key='one');
insert into public.sessions(event_id,title,start_time,end_time,published)
select id,'Existing Session','2026-10-10 02:00Z','2026-10-10 03:00Z',false from organizer_fixture where key='one';
set local role authenticated;
select throws_ok($$select public.update_event_basics((select id from organizer_fixture where key='one'),'Narrow Window','','','UTC','2026-10-10 04:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000022')$$,'P0001','event window must contain every existing session','basics cannot exclude existing sessions');
select lives_ok($$select public.update_event_basics((select id from organizer_fixture where key='delete'),'Delete Draft','Setup changed','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000023')$$,'owner can edit setup-only draft');
reset role;
select throws_ok($$delete from public.event_audit_log where event_id=(select id from organizer_fixture where key='delete')$$,'P0001','admin audit entries are immutable','setup audit cannot be deleted without a tombstone');
set local role authenticated;
select lives_ok($$select public.delete_untouched_draft_event((select id from organizer_fixture where key='delete'),'Delete setup-only draft','45000000-0000-4000-8000-000000000024')$$,'setup-only audits allow untouched draft deletion');
select is_empty($$select id from public.events where slug='organizer-delete-draft'$$,'deleted draft no longer exists');
select lives_ok($$select public.delete_untouched_draft_event((select id from organizer_fixture where key='delete'),'Delete setup-only draft','45000000-0000-4000-8000-000000000024')$$,'deletion replay returns original result');
select throws_ok($$select public.create_event('Delete Draft','organizer-delete-draft','','','UTC','2026-10-10 01:00Z','2026-10-11 01:00Z','45000000-0000-4000-8000-000000000005')$$,'P0001','created draft was deleted','creation replay cannot resurrect a deleted draft');
select throws_ok($$select public.delete_untouched_draft_event((select id from organizer_fixture where key='one'),'Cannot delete activity','45000000-0000-4000-8000-000000000025')$$,'P0001','draft has activity and must be archived','draft activity forces archival');
select lives_ok($$select public.publish_event((select id from organizer_fixture where key='one'),'45000000-0000-4000-8000-000000000026')$$,'owner can publish created event');
select throws_ok($$select public.delete_untouched_draft_event((select id from organizer_fixture where key='one'),'Cannot delete publication','45000000-0000-4000-8000-000000000027')$$,'P0001','only untouched drafts can be deleted','published event cannot be deleted');

reset role;
select ok((select details ->> 'creation_request_id'='45000000-0000-4000-8000-000000000005' and details ->> 'deleted_event_id'=(select id::text from organizer_fixture where key='delete') from public.platform_audit_log where request_id='45000000-0000-4000-8000-000000000024'),'persistent platform tombstone preserves deletion and creation request');
select * from finish();
rollback;
