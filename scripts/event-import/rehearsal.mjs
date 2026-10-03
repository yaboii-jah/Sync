import { createHash } from "node:crypto";
import { eventInventorySelectSql, PROJECT_REF, TABLES, GUARD_NAME, GUARD_FUNCTION, GUARD_BODY, JOB_NAMES, quoteLiteral } from "./inventory.mjs";

export const TARGETS = ["events", "sessions", "speakers_sponsors", "session_speakers"];
const PRESERVED = ["server_version", "counts", "relations", "columns", "constraints", "indexes", "policies",
  "functions", "triggers", "guards", "guard_function", "cron", "running_cron", "queued_requests",
  "active_dispatches", "storage_buckets", "storage_objects", "auth_counts", "retained_admins",
  "latest_auth_update", "latest_migration", "insert_hooks", "sequence_values"];
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
export const digest = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
export const preservedState = (snapshot) => Object.fromEntries(PRESERVED.map((key) => {
  if (snapshot[key] === undefined) throw new Error(`Incomplete inventory: ${key}`);
  return [key, snapshot[key]];
}));
const qualified = (name) => name.includes(".") ? name : `public.${name}`;
const targetRows = (payload) => [ ["events", [payload.event]], ["sessions", payload.sessions],
  ["speakers_sponsors", payload.speakers], ["session_speakers", payload.speakerLinks] ];

export function assertSnapshot(snapshot, payload) {
  preservedState(snapshot);
  if (snapshot.session_user !== "postgres" || !["none", "postgres"].includes(snapshot.active_role)) throw new Error("Direct postgres operator session required");
  const publicTables = snapshot.relations.filter((r) => r.name.startsWith("public.") && r.kind !== "S");
  if (digest(publicTables.map((r) => r.name).sort()) !== digest(TABLES.filter((name) => name.startsWith("public.")).sort())
    || publicTables.some((r) => r.kind !== "r" || !r.rls)) throw new Error("Unexpected legacy relations/RLS");
  const expectedCounts = new Map([["auth.users", 5], ["auth.identities", 10], ["public.profiles", 5], ["public.admin_users", 5]]);
  if (snapshot.counts.length !== TABLES.length || snapshot.counts.some((r) => !TABLES.includes(r.relation)
    || r.rows !== (expectedCounts.get(r.relation) ?? 0)) || new Set(snapshot.counts.map((r) => r.relation)).size !== TABLES.length) {
    throw new Error("Nonempty/conflicting content or retained-account counts changed");
  }
  if (snapshot.retained_admins.length !== 5 || snapshot.retained_admins.some((r) => !r.has_auth || !r.has_profile || r.identities !== 2)) throw new Error("Retained administrators changed");
  const fn = snapshot.guard_function;
  if (!fn || fn.source !== GUARD_BODY || fn.owner !== "postgres" || fn.definer || fn.return_type !== "trigger"
    || digest(fn.settings) !== digest(['search_path=""']) || fn.acl !== "{postgres=X/postgres}") throw new Error("Maintenance function altered");
  if (snapshot.guards.length !== 22 || new Set(snapshot.guards.map((g) => qualified(g.table))).size !== 22
    || snapshot.guards.some((g) => !TABLES.includes(qualified(g.table)) || g.enabled !== "O" || g.type !== 62
      || g.function !== `${GUARD_FUNCTION}()` || g.arguments !== "" || g.when !== null)) throw new Error("Maintenance guards missing/altered");
  if (digest(snapshot.cron.map((j) => j.name).sort()) !== digest([...JOB_NAMES].sort())
    || snapshot.cron.some((j) => j.active || j.username !== "postgres") || snapshot.running_cron !== 0
    || snapshot.queued_requests !== 0 || snapshot.active_dispatches !== 0) throw new Error("Writers are not paused/drained");
  if (snapshot.storage_buckets !== 0 || snapshot.storage_objects !== 0) throw new Error("Unexpected Storage content");
  assertInsertHooks(snapshot.insert_hooks);
  const targetConstraints = snapshot.constraints.filter((c) => TARGETS.includes(c.table.replace("public.", "")))
    .map((c) => ({ table: qualified(c.table), definition: c.definition }))
    .sort((a, b) => (a.table + a.definition).localeCompare(b.table + b.definition));
  // Reviewed live legacy constraints: built-in comparisons, length/trim, PKs, and FKs only.
  if (digest(targetConstraints) !== "3ec0df1550fa34dfdadd2be1ee47d76a0d9533bc09099a3d1df389e96f52b2cf") throw new Error("Target constraints changed; review before any insert");
  for (const [table, rows] of targetRows(payload)) {
    const columns = snapshot.columns.filter((c) => qualified(c.table) === `public.${table}`);
    if (!columns.length || rows.some((row) => digest(Object.keys(row).sort()) !== digest(columns.map((c) => c.name).sort()))
      || columns.some((c) => c.generated || c.identity || !["uuid", "text", "timestamp with time zone", "integer", "boolean"].includes(c.type))) throw new Error(`Payload does not match all live columns: ${table}`);
    for (const row of rows) for (const column of columns) {
      if (row[column.name] === null && !column.nullable) throw new Error(`Missing required column: ${table}.${column.name}`);
    }
  }
}

export function assertInsertHooks(hooks) {
  if (!hooks || hooks.rules.length !== 0 || hooks.triggers.length !== 8) throw new Error("Insert hooks/rules require review");
  const expectedFKs = new Map([["public.sessions", 2], ["public.session_speakers", 2]]);
  const seenFKs = new Map();
  const seenGuards = new Set();
  for (const hook of hooks.triggers) {
    const table = qualified(hook.table);
    if (!TARGETS.some((name) => `public.${name}` === table) || hook.enabled !== "O") throw new Error("Unexpected insert trigger state");
    if (hook.internal) {
      if (hook.type !== 5 || hook.function !== '"RI_FKey_check_ins"()'
        || !hook.source.includes('LANGUAGE internal') || !hook.source.includes('RI_FKey_check_ins$function$')) throw new Error("Unknown internal insert hook");
      seenFKs.set(table, (seenFKs.get(table) ?? 0) + 1);
    } else {
      if (hook.name !== GUARD_NAME || hook.function !== `${GUARD_FUNCTION}()` || hook.type !== 62
        || !hook.source.includes(GUARD_BODY)) throw new Error("External/custom insert hook requires review");
      seenGuards.add(table);
    }
  }
  if (digest([...seenFKs].sort()) !== digest([...expectedFKs].sort()) || seenGuards.size !== 4) throw new Error("Expected FK/guard hooks missing");
}

export function assertPreserved(before, after) {
  if (digest(preservedState(before)) !== digest(preservedState(after))) throw new Error("Post-rollback production state differs; keep maintenance active and review private evidence");
}

const statusExpression = (table) => table === "events"
  ? "case when now() < src.starts_at then 'upcoming' when now() >= src.ends_at then 'ended' else 'started' end"
  : "case when now() < src.start_time then 'not_started' when now() >= src.end_time then 'finished' else 'ongoing' end";

function rowSelect(table, rows, snapshot) {
  const columns = snapshot.columns.filter((c) => qualified(c.table) === `public.${table}`).map((c) => c.name);
  const names = columns.map((name) => `"${name}"`).join(", ");
  const expressions = columns.map((name) => name === "status" && ["events", "sessions"].includes(table)
    ? `${statusExpression(table)} as "status"` : `src."${name}"`).join(", ");
  return { names, select: `select ${expressions} from jsonb_populate_recordset(null::public.${table}, ${quoteLiteral(JSON.stringify(rows))}::jsonb) src` };
}

function stateAssertion(expected) {
  return `do $state$ declare actual jsonb; expected jsonb := ${quoteLiteral(JSON.stringify(expected))}::jsonb; k text;
begin
 select inventory into actual from (${eventInventorySelectSql()}) current_state;
 for k in select jsonb_object_keys(expected) loop
  if actual->k is distinct from expected->k then raise exception 'Inventory drift: %',k; end if;
 end loop;
end $state$;`;
}

function rowCheck(table, spec) {
  return `do $rows$ begin
 if exists ((select ${spec.names} from public.${table} except all (${spec.select}))
  union all ((${spec.select}) except all select ${spec.names} from public.${table}))
 then raise exception 'Inserted content mismatch: ${table}'; end if;
end $rows$;`;
}

export function contentChecksSql(snapshot, payload) {
  return targetRows(payload).map(([table, rows]) => rowCheck(table, rowSelect(table, rows, snapshot))).join("\n");
}

export function rehearsalSql(snapshot, payload) {
  assertSnapshot(snapshot, payload);
  const preserved = preservedState(snapshot);
  const untouched = { ...preserved };
  delete untouched.counts;
  const baselineCounts = snapshot.counts.filter((r) => !TARGETS.includes(r.relation.replace("public.", "")));
  const batches = targetRows(payload).map(([table, rows]) => {
    const spec = rowSelect(table, rows, snapshot);
    return `insert into public.${table} (${spec.names}) ${spec.select};\n${rowCheck(table, spec)}`;
  }).join("\n");
  return `-- Approved project: ${PROJECT_REF}. Rollback-only import rehearsal; no committing mode.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local idle_in_transaction_session_timeout = '30s';
set local standard_conforming_strings = on;
do $operator$ begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres') then raise exception 'Direct operator required'; end if;
 if not pg_try_advisory_xact_lock(741023,1) or not pg_try_advisory_xact_lock(1937337955,20261003) then raise exception 'Production operation lock busy'; end if;
end $operator$;
lock table ${TABLES.join(", ")} in share row exclusive mode;
-- Managed cron allows SELECT but not the stronger lock modes. Guards and both
-- operation advisory locks protect writers; job state is checked before/after.
lock table cron.job in access share mode;
${stateAssertion(preserved)}
${batches}
${stateAssertion(untouched)}
do $untouched$ declare actual jsonb; begin
 select inventory->'counts' into actual from (${eventInventorySelectSql()}) s;
 select coalesce(jsonb_agg(r order by r->>'relation'),'[]'::jsonb) into actual from jsonb_array_elements(actual) r
 where r->>'relation' not in (${TARGETS.map((name) => quoteLiteral(`public.${name}`)).join(",")});
 if actual is distinct from ${quoteLiteral(JSON.stringify(baselineCounts))}::jsonb then raise exception 'Unrelated data changed'; end if;
end $untouched$;
select jsonb_build_object('events',(select count(*) from public.events),'sessions',(select count(*) from public.sessions),
 'speakers',(select count(*) from public.speakers_sponsors),'links',(select count(*) from public.session_speakers),
 'content_verified',true,'unrelated_state_verified',true) as rehearsal;
rollback;
`;
}

export function assertPreparedSql(sql, checksum, snapshot, payload, projectRef) {
  if (projectRef !== PROJECT_REF) throw new Error("Explicit approved production project reference required");
  if (digest(sql) !== checksum || sql !== rehearsalSql(snapshot, payload)) throw new Error("SQL altered or not the exact rollback generator output");
}
