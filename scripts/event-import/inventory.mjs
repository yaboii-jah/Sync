// Read-only inventory ported from the reviewed production-maintenance operator tooling.
// Temporary legacy operation, deliberately separate from tenant migrations.
export const PROJECT_REF = "mygybolhwoeckrgczclm";
export const GUARD_NAME = "sync_maintenance_write_guard";
export const GUARD_FUNCTION = "private.sync_maintenance_reject_write";
export const TABLES = [
  "admin_audit_log", "admin_users", "alert_read_state", "app_feedback", "events",
  "my_flow_bookmarks", "networking_cards", "networking_scan_history",
  "notification_deliveries", "notification_dispatches", "notification_recipients",
  "notifications", "profiles", "push_subscriptions", "quick_links",
  "session_seat_claims", "session_speakers", "sessions", "social_profiles", "speakers_sponsors",
].map((name) => `public.${name}`).concat(["auth.users", "auth.identities"]);
export const JOB_NAMES = ["retry-push-dispatches", "sync-program-flow-statuses"];
export const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
export const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
export const relation = (name) => name.split(".").map(quoteIdentifier).join(".");
export const GUARD_BODY = `
begin
  if session_user = 'postgres'
     and pg_catalog.current_setting('role', true) in ('none', 'postgres') then
    return null;
  end if;
  raise exception using errcode = '42501', message = 'Sync maintenance: writes are temporarily disabled';
end;
`;
export function inventorySelectSql() {
  const counts = TABLES.map((table) => `select ${quoteLiteral(table)} as relation,
    count(*) as rows, md5(coalesce(string_agg(row_json, ',' order by row_json), '')) as data_hash
    from (select to_jsonb(t)::text as row_json from ${relation(table)} t) r`).join(" union all ");
  return `select jsonb_build_object(
 'server_version', current_setting('server_version'), 'session_user', session_user,
 'active_role', current_setting('role',true),
 'counts', (select jsonb_agg(to_jsonb(r) order by relation) from (${counts}) r),
 'relations', (select jsonb_agg(jsonb_build_object('name', n.nspname||'.'||c.relname,
   'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
   'force_rls',c.relforcerowsecurity,'acl',c.relacl::text) order by n.nspname,c.relname)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname in ('public','private') and c.relkind in ('r','p','v','m','S','f')),
 'columns', (select jsonb_agg(jsonb_build_object('table',a.attrelid::regclass::text,
   'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',not a.attnotnull,
   'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl::text,
   'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attrelid,a.attnum)
   from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
   left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where (n.nspname in ('public','private') or a.attrelid in ('auth.users'::regclass,'auth.identities'::regclass))
   and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped),
 'constraints', (select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,
   'name',c.conname,'type',c.contype,'definition',pg_get_constraintdef(c.oid)) order by c.oid)
   from pg_constraint c join pg_namespace n on n.oid=c.connamespace
   where n.nspname in ('public','private','auth')),
 'indexes', (select jsonb_agg(to_jsonb(r) order by schemaname,tablename,indexname) from
   (select schemaname,tablename,indexname,indexdef from pg_indexes
    where schemaname in ('public','private') or (schemaname='auth' and tablename in ('users','identities'))) r),
 'policies', (select jsonb_agg(to_jsonb(r) order by schemaname,tablename,policyname) from
   (select * from pg_policies where schemaname in ('public','private','storage','auth')) r),
 'functions', (select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
   'definition_hash',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),
   'definer',p.prosecdef,'settings',p.proconfig,'acl',p.proacl::text) order by p.oid)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private') and p.prokind='f'
   and p.oid <> coalesce(to_regprocedure('${GUARD_FUNCTION}()')::oid,0)),
 'triggers', (select jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,
   'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) order by t.oid)
   from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
   where not t.tgisinternal and t.tgname <> '${GUARD_NAME}' and n.nspname in ('public','private','auth')),
 'guards', (select coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,
   'enabled',t.tgenabled,'type',t.tgtype,'function',t.tgfoid::regprocedure::text,
   'arguments',encode(t.tgargs,'hex'),'when',pg_get_expr(t.tgqual,t.tgrelid)) order by t.tgrelid), '[]'::jsonb)
   from pg_trigger t where t.tgname='${GUARD_NAME}'),
 'guard_function', (select jsonb_build_object('source',p.prosrc,'owner',pg_get_userbyid(p.proowner),
   'definer',p.prosecdef,'settings',p.proconfig,'acl',p.proacl::text,'return_type',p.prorettype::regtype::text)
   from pg_proc p where p.oid=to_regprocedure('${GUARD_FUNCTION}()')),
 'cron', (select jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'schedule',schedule,
   'command_hash',md5(command),'active',active,'username',username,'database',database,
   'host',nodename,'port',nodeport) order by jobid) from cron.job),
 'running_cron', (select count(*) from cron.job_run_details where status in ('starting','running','connecting','sending')),
 'queued_requests', (select count(*) from net.http_request_queue),
 'active_dispatches', (select count(*) from public.notification_dispatches where status in ('pending','running')),
 'storage_buckets', (select count(*) from storage.buckets),
 'storage_objects', (select count(*) from storage.objects),
 'auth_counts', (select jsonb_object_agg(c.relname,
   (xpath('/row/n/text()',query_to_xml(format('select count(*) as n from auth.%I',c.relname),false,true,'')))[1]::text::bigint)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and c.relkind='r'),
 'retained_admins', (select jsonb_agg(jsonb_build_object('user_id',a.user_id,
   'has_auth',u.id is not null,'has_profile',p.id is not null,
   'identities',(select count(*) from auth.identities i where i.user_id=a.user_id)) order by a.user_id)
   from public.admin_users a left join auth.users u on u.id=a.user_id left join public.profiles p on p.id=a.user_id),
 'latest_auth_update', (select max(updated_at) from auth.users),
 'latest_migration', (select max(version) from supabase_migrations.schema_migrations)
) as inventory`;
}

export function inventorySql() {
  return `begin read only; set local statement_timeout = '30s';\n${eventInventorySelectSql()}; commit;`;
}

export function eventInventorySelectSql() {
  return `with state as (${inventorySelectSql()}), hooks as (
select jsonb_build_object(
 'triggers',(select coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,
   'name',t.tgname,'internal',t.tgisinternal,'type',t.tgtype,'enabled',t.tgenabled,
   'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text,
   'source',pg_get_functiondef(t.tgfoid)) order by t.oid),'[]'::jsonb)
   from pg_trigger t where t.tgrelid in ('public.events'::regclass,'public.sessions'::regclass,
   'public.speakers_sponsors'::regclass,'public.session_speakers'::regclass) and (t.tgtype & 4) <> 0),
 'rules',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from
   (select * from pg_rules where schemaname='public' and tablename in
   ('events','sessions','speakers_sponsors','session_speakers')) r)
) as insert_hooks
), sequences as (
 select coalesce(jsonb_agg(to_jsonb(s) order by sequencename),'[]'::jsonb) as sequence_values
 from (select schemaname,sequencename,sequenceowner,data_type::text,
   start_value::text,min_value::text,max_value::text,increment_by::text,
   cycle,cache_size::text,last_value::text,
   query_to_xml(format('select last_value,is_called from %I.%I',schemaname,sequencename),false,true,'')::text as state
   from pg_sequences where schemaname in ('public','private','auth')) s
)
select state.inventory || jsonb_build_object('insert_hooks',hooks.insert_hooks,
 'sequence_values',sequences.sequence_values) as inventory
from state cross join hooks cross join sequences`;
}
