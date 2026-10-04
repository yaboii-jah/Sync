-- Rollback-only verification for the legacy event project, not the tenant database.
-- Include the candidate migration after BEGIN when rehearsing it. These are SQL
-- authorization/behavior probes, not Google login or real attendee acceptance.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '40s';

-- nextval survives rollback: audit fixtures must use a transaction-local sequence.
alter table public.admin_audit_log alter column id drop identity;
create temporary sequence manual_session_test_ids start with 910000000;
alter table public.admin_audit_log alter column id set default nextval('pg_temp.manual_session_test_ids');
-- Exercise notification creation without sending a webhook or advancing net IDs.
alter table public.notifications disable trigger notifications_push_webhook;

set local session_replication_role = replica;
insert into auth.users(id,email) values
  ('13000000-0000-4000-8000-000000000001','manual-session-admin@example.invalid'),
  ('13000000-0000-4000-8000-000000000002','manual-session-attendee@example.invalid'),
  ('13000000-0000-4000-8000-000000000003','manual-session-other@example.invalid');
insert into public.profiles(id,name) values
  ('13000000-0000-4000-8000-000000000001','Manual session test admin'),
  ('13000000-0000-4000-8000-000000000002','Manual session test attendee'),
  ('13000000-0000-4000-8000-000000000003','Manual session other attendee');
insert into public.admin_users(user_id) values ('13000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;

create temporary table manual_session_checks(label text);
create function pg_temp.session_check(condition boolean, label text) returns void
language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAILED: %',label; end if;
  insert into pg_temp.manual_session_checks values(label);
end;
$$;
create function pg_temp.session_error(statement text, expected text, label text) returns void
language plpgsql as $$
declare actual text;
begin
  begin execute statement; exception when others then actual := sqlerrm; end;
  if actual is distinct from expected then
    raise exception 'FAILED: % (expected %, received %)', label, expected, actual;
  end if;
  insert into pg_temp.manual_session_checks values(label);
end;
$$;

do $tests$
declare
  actor uuid := '13000000-0000-4000-8000-000000000001';
  attendee uuid := '13000000-0000-4000-8000-000000000002';
  other_attendee uuid := '13000000-0000-4000-8000-000000000003';
  event_id uuid := '14000000-0000-4000-8000-000000000001';
  waiting uuid;
  live uuid;
  next_session uuid;
  draft uuid;
  start_request uuid := gen_random_uuid();
  end_request uuid := gen_random_uuid();
  create_request uuid := gen_random_uuid();
  result jsonb;
  audit_count bigint;
  notification_count bigint;
  initial_notifications bigint;
  signature text;
begin
  foreach signature in array array[
    'admin_create_session(uuid,text,text,text,timestamp with time zone,timestamp with time zone,boolean,uuid)',
    'admin_update_session(uuid,text,text,text,timestamp with time zone,timestamp with time zone,uuid)',
    'admin_set_session_status(uuid,text,boolean,uuid)',
    'toggle_my_flow_bookmark(uuid)', 'claim_session_seat(uuid)'
  ] loop
    perform pg_temp.session_check(not (select prosecdef from pg_proc where oid=('public.'||signature)::regprocedure), signature||': invoker API');
    perform pg_temp.session_check((select prosecdef and (proconfig @> array['search_path='] or proconfig @> array['search_path=""']) from pg_proc where oid=('private.'||signature)::regprocedure), signature||': private pinned worker');
    perform pg_temp.session_check(not has_function_privilege('anon','public.'||signature,'execute') and not has_function_privilege('anon','private.'||signature,'execute'), signature||': anonymous execution denied');
    perform pg_temp.session_check(has_function_privilege('authenticated','public.'||signature,'execute') and has_function_privilege('authenticated','private.'||signature,'execute'), signature||': authenticated execution available');
  end loop;
  perform pg_temp.session_check(not has_function_privilege('authenticated','public.sync_program_flow_statuses()','execute'),'scheduler is system-only');
  perform pg_temp.session_check(to_regprocedure('public.admin_bulk_resume_session_auto(uuid,uuid[],uuid[])') is null,'historical bulk auto RPC remains absent');
  perform pg_temp.session_check((select relrowsecurity from pg_class where oid='public.sessions'::regclass) and not exists(select 1 from pg_policy where polrelid='public.sessions'::regclass and polcmd<>'r'),'session RLS permits only reads');

  insert into public.events(id,name,theme,starts_at,ends_at,status)
  values(event_id,'Manual session verification','Rollback only',now()-interval '1 day',now()+interval '1 day','upcoming');
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('request.jwt.claim.sub','',true);
  perform pg_temp.session_error(format('select public.admin_create_session(%L,%L,null,null,now()-interval ''3 hours'',now()-interval ''2 hours'',true,%L)',event_id,'Fixture',create_request),'admin access required','signed-out create denied');
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  perform pg_temp.session_error(format('select public.admin_create_session(%L,%L,null,null,now()-interval ''3 hours'',now()-interval ''2 hours'',true,%L)',event_id,'Fixture',create_request),'admin access required','attendee create denied');
  perform set_config('request.jwt.claim.sub',actor::text,true);
  execute 'set local role authenticated';
  waiting := public.admin_create_session(event_id,'Waiting',null,'Test room',now()-interval '3 hours',now()-interval '2 hours',true,create_request);
  live := public.admin_create_session(event_id,'Live',null,'Test room',now()-interval '150 minutes',now()-interval '90 minutes',true,gen_random_uuid());
  next_session := public.admin_create_session(event_id,'Next',null,'Test room',now()+interval '1 hour',now()+interval '2 hours',true,gen_random_uuid());
  draft := public.admin_create_session(event_id,'Draft',null,null,now()-interval '3 hours',now()-interval '2 hours',false,gen_random_uuid());
  execute 'reset role';
  perform pg_temp.session_check((select count(*)=4 from public.sessions where id in(waiting,live,next_session,draft) and status='not_started' and status_override is null),'past/future/draft creation starts Not Started');
  select count(*) into audit_count from public.admin_audit_log;
  perform pg_temp.session_check(public.admin_create_session(event_id,'Changed retry input',null,null,now(),now()+interval '1 hour',true,create_request)=waiting,'create retry returns original session');
  perform pg_temp.session_check((select count(*)=audit_count from public.admin_audit_log),'create retry has one audit');

  select count(*) into initial_notifications from public.notifications;
  perform public.sync_program_flow_statuses();
  perform public.sync_program_flow_statuses();
  perform pg_temp.session_check((select count(*)=4 from public.sessions where id in(waiting,live,next_session,draft) and status='not_started'),'scheduler never starts/finishes waiting sessions');
  perform pg_temp.session_check((select status='started' from public.events where id=event_id),'scheduler retains event timing');
  perform pg_temp.session_check((select count(*)=initial_notifications from public.notifications),'scheduler creates no notifications');

  execute 'set local role authenticated';
  perform public.admin_update_session(waiting,'Waiting edited',null,'Test room',now()-interval '4 hours',now()-interval '2 hours',gen_random_uuid());
  perform public.admin_set_session_published(draft,true,gen_random_uuid());
  execute 'reset role';
  perform pg_temp.session_check((select status='not_started' from public.sessions where id=waiting),'schedule edit preserves waiting status');
  perform pg_temp.session_check((select status='not_started' and published from public.sessions where id=draft),'publishing preserves waiting status');

  perform set_config('request.jwt.claim.sub',attendee::text,true);
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''start'',false,%L)',live,start_request),'admin access required','attendee start denied');
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''start'',false,null)',live),'request id is required','start requires retry UUID');
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''resume_auto'',false,%L)',waiting,gen_random_uuid()),'invalid session action: use manual start or end','legacy auto action denied before mutation');
  execute 'set local role authenticated';
  perform public.admin_set_session_status(live,'start',false,start_request);
  execute 'reset role';
  perform pg_temp.session_check((select status='ongoing' and status_override='ongoing' and actual_started_at is not null and actual_ended_at is null and status_override_by=actor from public.sessions where id=live),'manual start after scheduled end records actual start and actor');
  perform pg_temp.session_check((select count(*)=initial_notifications from public.notifications),'start notification defaults to absent');
  select count(*) into audit_count from public.admin_audit_log;
  perform public.admin_set_session_status(live,'start',false,start_request);
  perform pg_temp.session_check((select count(*)=audit_count from public.admin_audit_log),'start retry does not duplicate audit');
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''end'',false,%L)',live,start_request),'request id was already used for another mutation','opposite action cannot reuse UUID');
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''start'',false,%L)',live,gen_random_uuid()),'session is already ongoing','new duplicate start rejected');

  perform public.admin_update_session(live,'Live edited',null,'Test room',now()-interval '1 day',now()-interval '23 hours',gen_random_uuid());
  perform public.sync_program_flow_statuses();
  perform pg_temp.session_check((select status='ongoing' and actual_started_at is not null from public.sessions where id=live),'edit and scheduler preserve ongoing session after end time');
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''resume_auto'',true,%L)',live,gen_random_uuid()),'invalid session action: use manual start or end','auto action cannot clear a live manual state');

  update public.sessions set capacity=1 where id=waiting;
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  execute 'set local role authenticated';
  result := public.toggle_my_flow_bookmark(waiting);
  execute 'reset role';
  perform pg_temp.session_check((result->>'bookmarked')::boolean,'overdue waiting session remains bookmarkable');
  execute 'set local role authenticated';
  result := public.claim_session_seat(waiting);
  execute 'reset role';
  perform pg_temp.session_check((result->>'held')::boolean and (result->>'taken')::integer=1,'overdue waiting session remains claimable');
  perform public.claim_session_seat(waiting);
  perform pg_temp.session_check((select claimed_seats=1 from public.sessions where id=waiting),'seat retry does not overclaim');
  perform set_config('request.jwt.claim.sub',other_attendee::text,true);
  perform pg_temp.session_error(format('select public.claim_session_seat(%L)',waiting),'no seats left','last seat is protected');
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  -- Move live back into an overlapping published slot while keeping it live.
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform public.admin_update_session(live,'Live edited',null,'Test room',now()-interval '150 minutes',now()-interval '90 minutes',gen_random_uuid());
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  result := public.toggle_my_flow_bookmark(live);
  perform pg_temp.session_check((result->>'bookmarked')::boolean and jsonb_array_length(result->'conflicts')=1,'overdue ongoing bookmarks retain scheduled overlap warnings');
  perform public.sync_program_flow_statuses();
  perform pg_temp.session_check((select count(*)=2 from public.my_flow_bookmarks where user_id=attendee and session_id in(waiting,live)),'bookmarks survive past scheduled end until manual completion');

  perform set_config('request.jwt.claim.sub',actor::text,true);
  execute 'set local role authenticated';
  perform public.admin_set_session_status(live,'end',true,end_request);
  execute 'reset role';
  perform pg_temp.session_check((select status='finished' and actual_ended_at is not null and actual_started_at is not null from public.sessions where id=live),'manual end records actual end');
  perform pg_temp.session_check(not exists(select 1 from public.my_flow_bookmarks where session_id=live),'manual end removes bookmarks');
  perform pg_temp.session_check((select status='not_started' from public.sessions where id=next_session),'ending one session never starts the next');
  perform pg_temp.session_check((select count(*)=1 from public.notifications where dedupe_key='manual:'||end_request),'opted-in end creates one notification');
  perform pg_temp.session_check(exists(select 1 from public.notification_recipients r join public.notifications n on n.id=r.notification_id where n.dedupe_key='manual:'||end_request and r.user_id=attendee),'manual notification snapshots attendee recipients');
  select count(*) into notification_count from public.notifications;
  select count(*) into audit_count from public.admin_audit_log;
  perform public.admin_set_session_status(live,'end',true,end_request);
  perform pg_temp.session_check((select count(*)=notification_count from public.notifications) and (select count(*)=audit_count from public.admin_audit_log),'end retry duplicates neither notification nor audit');
  perform pg_temp.session_check(exists(select 1 from public.admin_audit_log where request_id=end_request and actor_id=actor and entity_id=live and action='session.end' and details->>'after_status'='finished'),'end audit matches actor action target and outcome');
  perform pg_temp.session_error(format('select * from public.admin_set_session_status(%L,''start'',false,%L)',live,gen_random_uuid()),'finished sessions cannot be restarted','finished session cannot restart');
  perform public.admin_update_session(live,'Finished edited',null,null,now()+interval '1 day',now()+interval '2 days',gen_random_uuid());
  perform pg_temp.session_check((select status='finished' from public.sessions where id=live),'moving a finished session into future does not reopen it');
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  perform pg_temp.session_error(format('select public.toggle_my_flow_bookmark(%L)',live),'finished sessions cannot be added to My Flow','finished bookmark denied regardless of schedule');
  update public.sessions set capacity=2 where id=live;
  perform pg_temp.session_error(format('select public.claim_session_seat(%L)',live),'finished sessions cannot be claimed','finished seat denied regardless of schedule');

  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform public.admin_set_session_status(next_session,'start',true,gen_random_uuid());
  perform pg_temp.session_check((select status='ongoing' from public.sessions where id=next_session),'manual early start works');
  perform public.admin_set_session_status(draft,'end',false,gen_random_uuid());
  perform pg_temp.session_check((select status='finished' and actual_started_at is null and actual_ended_at is not null from public.sessions where id=draft),'admin can end an unstarted session without inventing a start');
  -- Exercise independent cleanup for an already-finished row, then roll back.
  insert into public.my_flow_bookmarks(user_id,session_id) values(attendee,live);
  perform public.sync_program_flow_statuses();
  perform pg_temp.session_check(not exists(select 1 from public.my_flow_bookmarks where session_id=live),'scheduler retains independent finished-bookmark cleanup');
  perform pg_temp.session_check((select status='ongoing' from public.sessions where id=next_session),'scheduler preserves early manual start');
end;
$tests$;

select jsonb_build_object('passed',count(*),'checks',jsonb_agg(label)) as manual_session_verification
from pg_temp.manual_session_checks;
rollback;
