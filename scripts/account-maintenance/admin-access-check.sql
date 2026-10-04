-- Rollback-only database tests. No real session or Google acceptance is fabricated.
-- Run after the access migration, or include its DDL in the same rehearsal transaction.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.admin_users in share row exclusive mode;

-- Redirect audit IDs to a transaction-local sequence, so testing never advances
-- the production sequence (ordinary nextval changes survive a rollback).
alter table public.admin_audit_log alter column id drop identity;
create temporary sequence admin_access_test_ids start with 900000000;
alter table public.admin_audit_log alter column id set default nextval('pg_temp.admin_access_test_ids');

set local session_replication_role = replica;
insert into auth.users(id,email) values
  ('11000000-0000-4000-8000-000000000001','access-admin-a@example.invalid'),
  ('11000000-0000-4000-8000-000000000002','access-admin-b@example.invalid'),
  ('11000000-0000-4000-8000-000000000003','access-attendee@example.invalid'),
  ('11000000-0000-4000-8000-000000000004','access-protected@example.invalid');
insert into public.profiles(id,name) values
  ('11000000-0000-4000-8000-000000000001','Access test admin A'),
  ('11000000-0000-4000-8000-000000000002','Access test admin B'),
  ('11000000-0000-4000-8000-000000000003','Access test attendee'),
  ('11000000-0000-4000-8000-000000000004','Access test protected');
-- Isolate membership fixtures only inside this rolled-back transaction.
delete from public.admin_users;
insert into public.admin_users(user_id,protected) values
  ('11000000-0000-4000-8000-000000000001',false),
  ('11000000-0000-4000-8000-000000000002',false),
  ('11000000-0000-4000-8000-000000000004',true);
set local session_replication_role = origin;

create temporary table admin_access_checks(label text);
create function pg_temp.access_check(condition boolean, label text) returns void
language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAILED: %',label; end if;
  insert into pg_temp.admin_access_checks values(label);
end;
$$;
create function pg_temp.access_error(statement text, expected text, label text) returns void
language plpgsql as $$
declare actual text;
begin
  begin
    execute statement;
  exception when others then actual := sqlerrm;
  end;
  perform pg_temp.access_check(actual = expected,label);
end;
$$;

do $tests$
declare
  actor_a uuid := '11000000-0000-4000-8000-000000000001';
  actor_b uuid := '11000000-0000-4000-8000-000000000002';
  attendee uuid := '11000000-0000-4000-8000-000000000003';
  protected_user uuid := '11000000-0000-4000-8000-000000000004';
  missing_user uuid := '11000000-0000-4000-8000-000000000099';
  request_a uuid := '22000000-0000-4000-8000-000000000001';
  request_b uuid := '22000000-0000-4000-8000-000000000002';
  state jsonb;
  audit_count bigint;
begin
  perform pg_temp.access_check(not (select prosecdef from pg_proc where oid='public.admin_get_user_access(uuid)'::regprocedure), 'public read wrapper has no elevated privileges');
  perform pg_temp.access_check(not (select prosecdef from pg_proc where oid='public.admin_set_user_admin(uuid,boolean,uuid)'::regprocedure), 'public mutation wrapper has no elevated privileges');
  perform pg_temp.access_check((select prosecdef from pg_proc where oid='private.admin_set_user_admin(uuid,boolean,uuid)'::regprocedure), 'privileged worker lives in private schema');
  perform pg_temp.access_check(not has_function_privilege('anon','private.admin_set_user_admin(uuid,boolean,uuid)','execute'), 'anonymous private-worker execution denied');
  perform pg_temp.access_check(not has_function_privilege('anon','public.admin_get_user_access(uuid)','execute'), 'anonymous read denied');
  perform pg_temp.access_check(not has_function_privilege('anon','public.admin_set_user_admin(uuid,boolean,uuid)','execute'), 'anonymous mutation denied');
  perform pg_temp.access_check(has_function_privilege('authenticated','public.admin_set_user_admin(uuid,boolean,uuid)','execute'), 'authenticated RPC reaches guard');
  perform pg_temp.access_check(not has_table_privilege('authenticated','public.admin_users','insert,update,delete'), 'direct allowlist writes denied');
  perform pg_temp.access_check(not has_column_privilege('authenticated','public.admin_users','protected','update'), 'direct protection changes denied');
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('request.jwt.claim.sub','',true);
  perform pg_temp.access_error(format('select public.admin_get_user_access(%L)',attendee),'admin access required','signed-out read denied');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,%L)',attendee,request_a),'admin access required','signed-out mutation denied');
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  perform pg_temp.access_error(format('select public.admin_get_user_access(%L)',attendee),'admin access required','attendee read denied');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,%L)',attendee,request_a),'admin access required','attendee self-promotion denied');
  perform set_config('request.jwt.claim.sub',actor_a::text,true);
  state := public.admin_get_user_access(attendee);
  perform pg_temp.access_check((state->>'can_grant')::boolean and not (state->>'is_admin')::boolean,'existing attendee eligible');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,null)',attendee),'request id is required','request UUID required');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,null,%L)',attendee,request_a),'admin access choice is required','choice required');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,%L)',missing_user,request_a),'user not found','missing target denied');
  state := public.admin_set_user_admin(attendee,true,request_a);
  perform pg_temp.access_check((state->>'is_admin')::boolean and (state->>'can_revoke')::boolean,'promotion succeeds');
  perform pg_temp.access_check((select created_by=actor_a and not protected from public.admin_users where user_id=attendee),'new admin creator recorded and unprotected');
  perform pg_temp.access_check(exists(select 1 from public.admin_audit_log where request_id=request_a and actor_id=actor_a and entity_id=attendee and action='admin.grant' and details->>'before_admin'='false' and details->>'after_admin'='true'),'grant audit matches mutation');
  select count(*) into audit_count from public.admin_audit_log;
  perform public.admin_set_user_admin(attendee,true,request_a);
  perform pg_temp.access_check((select count(*)=audit_count from public.admin_audit_log),'exact retry creates no second audit');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,false,%L)',attendee,request_a),'request id was already used for another mutation','opposite action cannot reuse UUID');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,%L)',actor_b,request_a),'request id was already used for another mutation','other target cannot reuse UUID');
  perform set_config('request.jwt.claim.sub',actor_b::text,true);
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,%L)',attendee,request_a),'request id was already used for another mutation','other actor cannot reuse UUID');
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  perform pg_temp.access_check(public.current_user_is_admin(),'promoted user immediately passes database authorization');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,false,%L)',attendee,request_b),'you cannot remove your own admin access','self-demotion refused');
  state := public.admin_get_user_access(protected_user);
  perform pg_temp.access_check((state->>'is_protected')::boolean and not (state->>'can_revoke')::boolean,'protected account not removable');
  update public.profiles set name='Renamed protected admin' where id=protected_user;
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,false,%L)',protected_user,request_b),'protected admin access cannot be removed','protection survives profile name changes');
  perform set_config('request.jwt.claim.sub',actor_a::text,true);
  state := public.admin_set_user_admin(attendee,false,request_b);
  perform pg_temp.access_check(not (state->>'is_admin')::boolean and (state->>'can_grant')::boolean,'demotion succeeds');
  perform pg_temp.access_check(exists(select 1 from auth.users where id=attendee) and exists(select 1 from public.profiles where id=attendee),'demotion retains account and profile');
  state := public.admin_set_user_admin(attendee,true,request_a);
  perform pg_temp.access_check(not (state->>'is_admin')::boolean,'retry of reversed grant returns current state without regranting');
  perform set_config('request.jwt.claim.sub',attendee::text,true);
  perform pg_temp.access_check(not public.current_user_is_admin(),'demoted user loses authorization with same claims');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,true,%L)',actor_b,request_b),'admin access required','demoted actor cannot submit further changes');
  perform pg_temp.access_error(format('select public.admin_get_user_access(%L)',actor_b),'admin access required','demoted actor cannot read access');
  perform set_config('request.jwt.claim.sub',actor_a::text,true);
  state := public.admin_set_user_admin(attendee,false,'22000000-0000-4000-8000-000000000003');
  perform pg_temp.access_check(not (state->>'is_admin')::boolean,'already-demoted target remains non-admin');
  perform pg_temp.access_check(exists(select 1 from public.admin_audit_log where request_id='22000000-0000-4000-8000-000000000003' and details->>'changed'='false'),'no-op request explicitly audited');
  delete from public.admin_users where user_id<>actor_a;
  state := public.admin_get_user_access(actor_a);
  perform pg_temp.access_check(not (state->>'can_revoke')::boolean and (state->>'is_self')::boolean,'last-admin controls disabled');
  perform pg_temp.access_error(format('select public.admin_set_user_admin(%L,false,%L)',actor_a,'22000000-0000-4000-8000-000000000004'),'you cannot remove your own admin access','last remaining admin cannot demote self');
end;
$tests$;

select jsonb_build_object('passed',count(*),'checks',jsonb_agg(label),'rollback_only',true) as admin_access_verification
from pg_temp.admin_access_checks;
rollback;
