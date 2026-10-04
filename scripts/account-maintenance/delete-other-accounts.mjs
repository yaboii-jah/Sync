import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, open } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eventInventorySelectSql, PROJECT_REF, quoteLiteral } from "../event-import/inventory.mjs";
import { digest } from "../event-import/rehearsal.mjs";
import { query } from "../event-import/operator.mjs";
import { directory as operationRoot, maintenanceCheck, withOperationLock } from "../event-import/run.mjs";

const evidenceRoot = resolve(operationRoot, "account-cleanup");
const KEEP_NAMES = ["Catherine Notado", "Jahmell Dorias"];
const LIVE_AUTH_FLOW_COUNT = "flow_state";

const qualified = (value) => {
  const [schema, name] = value.split(".");
  if (!schema || !name) throw new Error("Unexpected database relation name");
  return `"${schema.replaceAll('"', '""')}"."${name.replaceAll('"', '""')}"`;
};

function canonical(value) {
  return Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
}

function withoutLiveFlowCount(snapshot) {
  const copy = structuredClone(snapshot);
  if (copy.inventory?.auth_counts) delete copy.inventory.auth_counts[LIVE_AUTH_FLOW_COUNT];
  return copy;
}

function same(left, right) {
  return digest(canonical(left)) === digest(canonical(right));
}

function tableDataSql(schemas, excludedRelations = []) {
  const schemaList = schemas.map(quoteLiteral).join(",");
  const exclusion = excludedRelations.length
    ? `and (n.nspname||'.'||c.relname) not in (${excludedRelations.map(quoteLiteral).join(",")})` : "";
  return `(select coalesce(jsonb_agg(jsonb_build_object(
   'relation',n.nspname||'.'||c.relname,
   'rows',(xpath('/row/n/text()',query_to_xml(format('select count(*) as n from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text::bigint,
   'data_hash',(xpath('/row/h/text()',query_to_xml(format(
     'select md5(coalesce(string_agg(row_json,'','' order by row_json),'''')) as h from (select to_jsonb(t)::text as row_json from %I.%I t) q',
     n.nspname,c.relname),false,true,'')))[1]::text
  ) order by n.nspname,c.relname),'[]'::jsonb)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in (${schemaList}) and c.relkind in ('r','p') ${exclusion})`;
}

function accountReportSql() {
  return `select jsonb_build_object(
 'accounts',(select coalesce(jsonb_agg(jsonb_build_object(
   'id',u.id,'profile_name',to_jsonb(p)->>'name','has_profile',p.id is not null,
   'is_admin',exists(select 1 from public.admin_users a where a.user_id=u.id),
   'identity_count',(select count(*) from auth.identities i where i.user_id=u.id),
   'session_count',(select count(*) from auth.sessions s where s.user_id=u.id)
  ) order by u.id),'[]'::jsonb) from auth.users u left join public.profiles p on p.id=u.id),
 'orphan_profiles',(select count(*) from public.profiles p left join auth.users u on u.id=p.id where u.id is null),
 'orphan_admin_rows',(select count(*) from public.admin_users a left join auth.users u on u.id=a.user_id where u.id is null),
 'storage_objects',(select count(*) from storage.objects),
 'storage_by_owner',(select coalesce(jsonb_agg(jsonb_build_object('owner_id',owner_id::text,'objects',n) order by owner_id::text),'[]'::jsonb)
   from (select owner_id,count(*) n from storage.objects where owner_id is not null group by owner_id) owned),
 'public_data',${tableDataSql(["public"])},
 'auth_data',${tableDataSql(["auth"],["auth.flow_state"])},
 'private_data',${tableDataSql(["private"])},
 'storage_data',${tableDataSql(["storage"])},
 'foreign_keys',(select coalesce(jsonb_agg(jsonb_build_object(
   'child',child_ns.nspname||'.'||child.relname,
   'child_columns',(select jsonb_agg(ca.attname order by ck.ordinality) from unnest(fk.conkey) with ordinality ck(attnum,ordinality)
     join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=ck.attnum),
   'parent',parent_ns.nspname||'.'||parent.relname,
   'parent_columns',(select jsonb_agg(pa.attname order by pk.ordinality) from unnest(fk.confkey) with ordinality pk(attnum,ordinality)
     join pg_attribute pa on pa.attrelid=fk.confrelid and pa.attnum=pk.attnum),
   'on_delete',case fk.confdeltype when 'c' then 'cascade' when 'n' then 'set_null' when 'd' then 'set_default'
     when 'r' then 'restrict' else 'no_action' end,
   'validated',fk.convalidated
  ) order by child_ns.nspname,child.relname,fk.conname),'[]'::jsonb)
  from pg_constraint fk join pg_class child on child.oid=fk.conrelid join pg_namespace child_ns on child_ns.oid=child.relnamespace
  join pg_class parent on parent.oid=fk.confrelid join pg_namespace parent_ns on parent_ns.oid=parent.relnamespace
  where fk.contype='f' and child_ns.nspname not in ('pg_catalog','information_schema','pg_toast')
    and parent_ns.nspname not in ('pg_catalog','information_schema','pg_toast')),
 'lock_relations',(select coalesce(jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname),'[]'::jsonb)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private','auth','storage') and c.relkind in ('r','p')),
 'user_triggers',(select coalesce(jsonb_agg(jsonb_build_object(
   'relation',n.nspname||'.'||c.relname,'name',t.tgname,'type',t.tgtype,'definition',pg_get_triggerdef(t.oid)
  ) order by n.nspname,c.relname,t.tgname),'[]'::jsonb)
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where not t.tgisinternal and n.nspname in ('public','private','auth','storage'))
) as account_report`;
}

function captureSql() {
  return `begin read only;
set local statement_timeout='60s';
with state as (${eventInventorySelectSql()}), details as (${accountReportSql()})
select state.inventory,details.account_report from state cross join details;
commit;`;
}

async function capture(reviewDir) {
  const rows = await query(captureSql(), reviewDir);
  if (rows.length !== 1 || !rows[0].inventory || !rows[0].account_report) throw new Error("Fresh production account inventory was incomplete");
  return { inventory: rows[0].inventory, account_report: rows[0].account_report };
}

function parseArgs(args) {
  if (!args.length || !["prepare", "rehearse", "finalize-rehearsal", "execute"].includes(args[0])) {
    throw new Error("Use prepare|rehearse|finalize-rehearsal|execute --project-ref mygybolhwoeckrgczclm --review-id <lowercase-id> [--sql-sha256 <hash>]");
  }
  const command = args[0];
  const options = {};
  for (let index = 1; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!value || !["--project-ref", "--review-id", "--sql-sha256"].includes(key) || options[key]) throw new Error("Invalid or repeated account-cleanup option");
    options[key] = value;
  }
  if (options["--project-ref"] !== PROJECT_REF || !/^[a-z][a-z0-9-]{2,47}$/.test(options["--review-id"] ?? "")) {
    throw new Error(`Use the explicit project and a lowercase review ID: --project-ref ${PROJECT_REF} --review-id <id>`);
  }
  if ((command === "execute") !== Boolean(options["--sql-sha256"]) || (options["--sql-sha256"] && !/^[a-f0-9]{64}$/.test(options["--sql-sha256"]))) {
    throw new Error("Only execute accepts --sql-sha256, and it must be a SHA-256 digest");
  }
  return { command, projectRef: options["--project-ref"], reviewId: options["--review-id"], sqlSha256: options["--sql-sha256"] };
}

function validateInitialSnapshot(snapshot) {
  const { inventory, account_report: report } = snapshot;
  if (inventory.session_user !== "postgres" || !["none", "postgres"].includes(inventory.active_role)) throw new Error("Direct postgres operator session is required");
  if (inventory.guards.length !== 0) throw new Error("Unexpected maintenance guards; retain maintenance and review the live database");
  if (inventory.cron.some((job) => job.active) || inventory.running_cron !== 0 || inventory.queued_requests !== 0 || inventory.active_dispatches !== 0) {
    throw new Error("Background writers are not paused and drained");
  }
  if (inventory.storage_buckets !== 0 || inventory.storage_objects !== 0 || report.storage_objects !== 0) throw new Error("Storage is not empty; account-owned objects require separate review");
  for (const field of ["public_data", "auth_data", "private_data", "storage_data"]) {
    if (!Array.isArray(report[field]) || report[field].some((table) => !Number.isInteger(table.rows) || typeof table.data_hash !== "string")) {
      throw new Error("Complete table row counts and hashes are required before account deletion");
    }
  }
  if (report.orphan_profiles !== 0 || report.orphan_admin_rows !== 0) throw new Error("Orphan profile/admin data requires review before account deletion");
  const accounts = report.accounts;
  const keep = KEEP_NAMES.map((name) => accounts.filter((account) => account.profile_name === name));
  if (keep.some((matches) => matches.length !== 1 || !matches[0].has_profile || !matches[0].is_admin)) {
    throw new Error("Could not uniquely identify both protected administrator accounts by profile name");
  }
  if (accounts.length < KEEP_NAMES.length) throw new Error("The live Auth account inventory is incomplete");
  const keepIds = keep.map((matches) => matches[0].id).sort();
  const targetAccounts = accounts.filter((account) => !keepIds.includes(account.id));
  const targetIds = targetAccounts.map((account) => account.id).sort();
  if (targetIds.length === 0) throw new Error("The live Auth project already contains only the two protected accounts; no deletion is needed");
  if (targetIds.length + keepIds.length !== accounts.length || targetIds.some((id) => keepIds.includes(id))) throw new Error("Protected and deletion account sets overlap");
  const storageOwners = report.storage_by_owner ?? [];
  if (storageOwners.some((owner) => targetIds.includes(owner.owner_id) && owner.objects > 0)) throw new Error("A deletion account owns Storage objects; no account was removed");

  const relationNames = new Set(report.lock_relations);
  if (!relationNames.has("auth.users") || !relationNames.has("auth.identities")
    || !relationNames.has("public.profiles") || !relationNames.has("public.admin_users") || !relationNames.has("storage.objects")) {
    throw new Error("Required account or Storage relations are missing");
  }
  const relationSet = new Set(inventory.relations.filter((relation) => relation.name.startsWith("public.") && relation.kind !== "S").map((relation) => relation.name));
  if (!relationSet.has("public.profiles") || !relationSet.has("public.admin_users")) throw new Error("Expected profile/admin tables are missing");
  const unprotectedMutationTables = [...cascadeEffects(report)].filter((relation) => !relationNames.has(relation)
    || !["public.", "private.", "auth.", "storage."].some((prefix) => relation.startsWith(prefix)));
  if (unprotectedMutationTables.length) throw new Error("An account dependency exists outside the locked and hashed application tables; no deletion was prepared");
  const idSet = new Set(accounts.map((account) => account.id));
  if (idSet.size !== accounts.length || targetAccounts.some((account) => !account.id || account.profile_name === undefined)) throw new Error("Auth accounts could not be mapped to profiles safely");
  return { keepIds, targetIds, targetCount: targetIds.length, keepAccounts: keep.map((matches) => matches[0]).sort((a, b) => a.id.localeCompare(b.id)) };
}

function cascadeEffects(report) {
  const deletedRelations = new Set(["auth.users"]);
  const changedRelations = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const foreignKey of report.foreign_keys) {
      if (!deletedRelations.has(foreignKey.parent)) continue;
      if (foreignKey.on_delete === "cascade") {
        changedRelations.add(foreignKey.child);
        if (!deletedRelations.has(foreignKey.child)) { deletedRelations.add(foreignKey.child); changed = true; }
      } else if (foreignKey.on_delete === "set_null" || foreignKey.on_delete === "set_default") {
        changedRelations.add(foreignKey.child);
      }
    }
  }
  return changedRelations;
}

function validateDeletionTriggers(snapshot) {
  const changed = cascadeEffects(snapshot.account_report);
  const relationNames = new Set([...changed, "auth.users"]);
  const deletionTriggers = snapshot.account_report.user_triggers.filter((trigger) => relationNames.has(trigger.relation) && (Number(trigger.type) & 8) !== 0);
  if (deletionTriggers.length) throw new Error("A custom DELETE trigger can run for account removal; inspect the private report before continuing");
  return [...changed].sort();
}

function stateAssertion(expected, name) {
  const inventoryJson = quoteLiteral(JSON.stringify(expected.inventory));
  const reportJson = quoteLiteral(JSON.stringify(expected.account_report));
  return `do $${name}$ declare actual_inventory jsonb; expected_inventory jsonb := ${inventoryJson}::jsonb;
 actual_report jsonb; expected_report jsonb := ${reportJson}::jsonb;
begin
 select inventory into actual_inventory from (${eventInventorySelectSql()}) state;
 actual_inventory := jsonb_set(actual_inventory,'{auth_counts,${LIVE_AUTH_FLOW_COUNT}}','null'::jsonb,true);
 expected_inventory := jsonb_set(expected_inventory,'{auth_counts,${LIVE_AUTH_FLOW_COUNT}}','null'::jsonb,true);
 if actual_inventory is distinct from expected_inventory then raise exception 'Account cleanup inventory assertion failed'; end if;
 select account_report into actual_report from (${accountReportSql()}) detail;
 if actual_report is distinct from expected_report then raise exception 'Account cleanup account assertion failed'; end if;
end $${name}$;`;
}

function preservedNamesAssertion(keepAccounts) {
  const expected = quoteLiteral(JSON.stringify(keepAccounts));
  return `do $keepers$ declare detail jsonb; expected jsonb := ${expected}::jsonb;
begin
 select account_report into detail from (${accountReportSql()}) report;
 if detail->'accounts' is distinct from expected then raise exception 'Protected account assertion failed'; end if;
 if (detail->>'orphan_profiles')::bigint <> 0 or (detail->>'orphan_admin_rows')::bigint <> 0 then raise exception 'Orphan account data detected'; end if;
 if (detail->>'storage_objects')::bigint <> 0 then raise exception 'Storage objects detected'; end if;
end $keepers$;`;
}

function makeTransaction(prepared, finish, expectedAfter = null) {
  const protectedRelations = new Set([...prepared.mutable_relations, "auth.users", "storage.objects"]);
  const lockRelations = prepared.snapshot.account_report.lock_relations.filter((name) => name.startsWith("public.")
    || name.startsWith("private.") || protectedRelations.has(name));
  const lockList = lockRelations.map(qualified).join(", ");
  if (!lockList) throw new Error("No database relations available to lock");
  const targetIds = prepared.target_ids.map(quoteLiteral).join(", ");
  const keep = prepared.keep_accounts;
  const expectedState = expectedAfter ? stateAssertion(expectedAfter, "poststate") : "";
  return `-- One-use account removal for Supabase project ${PROJECT_REF}; ${finish === "rollback" ? "rollback rehearsal only" : "reviewed commit candidate"}.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
set local idle_in_transaction_session_timeout='90s';
set local standard_conforming_strings=on;
do $operator$ begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres') then raise exception 'Direct postgres operator required'; end if;
 if not pg_try_advisory_xact_lock(741023,1) or not pg_try_advisory_xact_lock(1937337955,20261003) then raise exception 'Production operation lock busy'; end if;
end $operator$;
lock table ${lockList} in share row exclusive mode;
lock table cron.job in access share mode;
${stateAssertion(prepared.snapshot, "prestate")}
do $delete$ declare removed bigint; begin
 delete from auth.users where id in (${targetIds});
 get diagnostics removed = row_count;
 if removed <> ${prepared.target_count} then raise exception 'Account deletion row count differed from the reviewed target'; end if;
end $delete$;
${preservedNamesAssertion(keep)}
${expectedState}
select jsonb_build_object('inventory',(select inventory from (${eventInventorySelectSql()}) state),
 'account_report',(select account_report from (${accountReportSql()}) detail)) as account_cleanup;
${finish};
`;
}

function changedTableRelations(before, after) {
  const fields = ["public_data", "auth_data", "private_data", "storage_data"];
  const changed = [];
  for (const field of fields) {
    const oldRows = new Map(before.account_report[field].map((row) => [row.relation, row]));
    if (oldRows.size !== after.account_report[field].length) throw new Error("A database relation appeared or disappeared during rehearsal");
    for (const row of after.account_report[field]) if (!same(row, oldRows.get(row.relation))) changed.push({
      relation: row.relation,
      before_rows: oldRows.get(row.relation)?.rows ?? null,
      after_rows: row.rows,
    });
  }
  return changed;
}

function verifyExpectedEffects(before, after, prepared) {
  if (after.account_report.accounts.length !== prepared.keep_accounts.length
    || !same(after.account_report.accounts, prepared.keep_accounts)) throw new Error("Rollback did not leave exactly the two protected Auth accounts");
  const changed = changedTableRelations(before, after);
  const allowed = new Set(prepared.mutable_relations);
  if (changed.some((item) => !allowed.has(item.relation))) throw new Error("Rollback changed unrelated public data; inspect private evidence");
  if (!same(before.account_report.foreign_keys, after.account_report.foreign_keys)
    || !same(before.account_report.lock_relations, after.account_report.lock_relations)
    || !same(before.account_report.user_triggers, after.account_report.user_triggers)
    || before.account_report.orphan_profiles !== after.account_report.orphan_profiles
    || before.account_report.orphan_admin_rows !== after.account_report.orphan_admin_rows
    || before.account_report.storage_objects !== after.account_report.storage_objects
    || !same(before.account_report.storage_by_owner, after.account_report.storage_by_owner)) {
    throw new Error("Schema, trigger, orphan, or Storage state changed during rollback rehearsal");
  }
  const beforeCounts = new Map(before.inventory.counts.map((row) => [row.relation, row]));
  for (const row of after.inventory.counts) {
    const old = beforeCounts.get(row.relation);
    if (!old) throw new Error("A new inventoried table appeared during rehearsal");
    if (!same(row, old) && !allowed.has(row.relation)) throw new Error("Rollback changed an unrelated inventoried table");
  }
  if (after.inventory.counts.length !== before.inventory.counts.length) throw new Error("An inventoried table disappeared during rehearsal");
  const beforeAuthCounts = before.inventory.auth_counts;
  for (const [table, count] of Object.entries(after.inventory.auth_counts)) {
    if (table === LIVE_AUTH_FLOW_COUNT) continue;
    if (count !== beforeAuthCounts[table] && !allowed.has(`auth.${table}`)) throw new Error("Rollback changed an unrelated Auth table");
  }
  const normalizeExpected = (snapshot) => {
    const value = withoutLiveFlowCount(snapshot);
    const mutableNames = new Set(prepared.mutable_relations);
    for (const count of value.inventory.counts) if (mutableNames.has(count.relation)) {
      count.rows = "<account-cascade>";
      count.data_hash = "<account-cascade>";
    }
    for (const relation of mutableNames) {
      const authTable = relation.startsWith("auth.") ? relation.slice("auth.".length) : null;
      if (authTable && Object.hasOwn(value.inventory.auth_counts, authTable)) delete value.inventory.auth_counts[authTable];
    }
    delete value.inventory.latest_auth_update;
    delete value.inventory.retained_admins;
    for (const field of ["public_data", "auth_data", "private_data", "storage_data"]) for (const row of value.account_report[field]) {
      if (mutableNames.has(row.relation)) {
        row.rows = "<account-cascade>";
        row.data_hash = "<account-cascade>";
      }
    }
    delete value.account_report.accounts;
    return value;
  };
  if (!same(normalizeExpected(before), normalizeExpected(after))) throw new Error("Rehearsal changed state outside the Auth account dependency graph");
  return changed;
}

async function checksumText(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function saveNew(reviewDir, name, content) {
  const value = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  await writeFile(resolve(reviewDir, name), value, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await writeFile(resolve(reviewDir, `${name}.sha256`), `${await checksumText(value)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return value;
}

async function loadChecked(reviewDir, name) {
  const content = await readFile(resolve(reviewDir, name), "utf8");
  const expected = (await readFile(resolve(reviewDir, `${name}.sha256`), "utf8")).trim();
  if ((await checksumText(content)) !== expected) throw new Error(`Private review artifact checksum mismatch: ${name}`);
  return content;
}

async function createAttempt(reviewDir, name, data) {
  const file = await open(resolve(reviewDir, name), "wx", 0o600);
  try {
    await file.writeFile(`${JSON.stringify(data, null, 2)}\n`);
    await file.sync();
  } finally {
    await file.close();
  }
}

async function freshMaintenance() {
  const result = await maintenanceCheck();
  if (result.status !== 503 || result.domains.length !== 2) throw new Error("Production website maintenance is not verified");
  return result;
}

function assertBaselineStillMatches(prepared, current) {
  if (!same(withoutLiveFlowCount(prepared.snapshot), withoutLiveFlowCount(current))) {
    throw new Error("Live account or production state drifted since preparation; no deletion was attempted");
  }
}

async function prepare(reviewDir, reviewId, maintenance) {
  await mkdir(evidenceRoot, { recursive: true, mode: 0o700 });
  await mkdir(reviewDir, { recursive: false, mode: 0o700 });
  const snapshot = await capture(reviewDir);
  await saveNew(reviewDir, "inspection.json", {
    project_ref: PROJECT_REF,
    review_id: reviewId,
    captured_at: new Date().toISOString(),
    maintenance,
    snapshot,
  });
  const { keepIds, targetIds, targetCount, keepAccounts } = validateInitialSnapshot(snapshot);
  const mutable = new Set([...cascadeEffects(snapshot.account_report), "auth.users"]);
  validateDeletionTriggers(snapshot);
  const mutableRelations = [...mutable].sort();
  const prepared = {
    project_ref: PROJECT_REF,
    review_id: reviewId,
    prepared_at: new Date().toISOString(),
    maintenance,
    snapshot,
    keep_ids: keepIds,
    keep_accounts: keepAccounts,
    target_ids: targetIds,
    target_count: targetCount,
    mutable_relations: mutableRelations,
  };
  const rollbackSql = makeTransaction(prepared, "rollback");
  await saveNew(reviewDir, "prepared.json", prepared);
  await saveNew(reviewDir, "rehearsal.sql", rollbackSql);
  console.log(`Prepared one rollback-only rehearsal for ${snapshot.account_report.accounts.length} Auth accounts: ${targetCount} scheduled for deletion, 2 protected admins verified. No account was removed.`);
}

async function rehearse(reviewDir, reviewId) {
  const prepared = JSON.parse(await loadChecked(reviewDir, "prepared.json"));
  const rollbackSql = await loadChecked(reviewDir, "rehearsal.sql");
  if (prepared.project_ref !== PROJECT_REF || prepared.review_id !== reviewId || rollbackSql !== makeTransaction(prepared, "rollback")) {
    throw new Error("Prepared account candidate differs from its checksummed review");
  }
  const before = await capture(reviewDir);
  assertBaselineStillMatches(prepared, before);
  validateInitialSnapshot(before);
  validateDeletionTriggers(before);
  await createAttempt(reviewDir, "rehearsal-attempt.json", { started_at: new Date().toISOString(), sql_sha256: await checksumText(rollbackSql), committed: false });
  let response;
  let failure;
  try {
    const rows = await query(rollbackSql, reviewDir);
    if (rows.length !== 1 || !rows[0].account_cleanup) throw new Error("Rollback rehearsal returned no verified result");
    response = rows[0].account_cleanup;
  } catch (error) {
    failure = error.message;
  }
  const after = await capture(reviewDir);
  await saveNew(reviewDir, "rehearsal-observation.json", {
    project_ref: PROJECT_REF,
    review_id: reviewId,
    observed_at: new Date().toISOString(),
    query_result: response ?? null,
    fresh_after_rollback: after,
  });
  if (!same(withoutLiveFlowCount(before), withoutLiveFlowCount(after))) failure ??= "Fresh post-rollback account inventory did not match the preflight";
  const postRollbackMaintenance = await freshMaintenance();
  if (!failure) {
    const expected = { inventory: response.inventory, account_report: response.account_report };
    const changed = verifyExpectedEffects(prepared.snapshot, expected, prepared);
    if (expected.account_report.accounts.length !== prepared.keep_accounts.length
      || !same(expected.account_report.accounts, prepared.keep_accounts)) throw new Error("Rollback result did not retain exactly the protected accounts");
    const candidate = makeTransaction(prepared, "commit", expected);
    const candidateHash = await checksumText(candidate);
    await saveNew(reviewDir, "candidate.sql", candidate);
    await saveNew(reviewDir, "rehearsal.json", {
      project_ref: PROJECT_REF,
      review_id: reviewId,
      verified_at: new Date().toISOString(),
      maintenance: postRollbackMaintenance,
      rehearsal_sql_sha256: await checksumText(rollbackSql),
      candidate_sql_sha256: candidateHash,
      rollback_verified: true,
      committed: false,
      before_account_count: prepared.snapshot.account_report.accounts.length,
      deleted_account_count: prepared.target_count,
      remaining_account_count: expected.account_report.accounts.length,
      changed_account_relations: changed,
      expected_after: expected,
    });
    console.log(`Rollback rehearsal passed: exactly ${prepared.target_count} other accounts were removed inside the rolled-back transaction, both protected admins remained, and only account-linked rows changed. Candidate SHA-256: ${candidateHash}. Nothing was committed.`);
    return;
  }
  await saveNew(reviewDir, "rehearsal-failure.json", {
    project_ref: PROJECT_REF,
    review_id: reviewId,
    failed_at: new Date().toISOString(),
    failure,
    rollback_preserved: same(withoutLiveFlowCount(before), withoutLiveFlowCount(after)),
    post_rollback_maintenance: postRollbackMaintenance,
  });
  throw new Error(`${failure}; one-use rehearsal attempt is retained. Review private evidence before taking another action.`);
}

async function finalizeSavedRehearsal(reviewDir, reviewId) {
  const prepared = JSON.parse(await loadChecked(reviewDir, "prepared.json"));
  const rollbackSql = await loadChecked(reviewDir, "rehearsal.sql");
  const observation = JSON.parse(await loadChecked(reviewDir, "rehearsal-observation.json"));
  const attempt = JSON.parse(await readFile(resolve(reviewDir, "rehearsal-attempt.json"), "utf8"));
  if (prepared.project_ref !== PROJECT_REF || prepared.review_id !== reviewId || observation.project_ref !== PROJECT_REF
    || observation.review_id !== reviewId || rollbackSql !== makeTransaction(prepared, "rollback")
    || attempt.sql_sha256 !== await checksumText(rollbackSql) || attempt.committed !== false || !observation.query_result) {
    throw new Error("Saved rollback evidence is incomplete or does not match the exact prepared transaction");
  }
  assertBaselineStillMatches(prepared, observation.fresh_after_rollback);
  const current = await capture(reviewDir);
  assertBaselineStillMatches(prepared, current);
  validateInitialSnapshot(current);
  validateDeletionTriggers(current);
  const maintenance = await freshMaintenance();
  const expected = observation.query_result;
  const changed = verifyExpectedEffects(prepared.snapshot, expected, prepared);
  if (expected.account_report.accounts.length !== prepared.keep_accounts.length
    || !same(expected.account_report.accounts, prepared.keep_accounts)) throw new Error("Saved transaction result did not retain exactly the protected accounts");
  const candidate = makeTransaction(prepared, "commit", expected);
  const candidateHash = await checksumText(candidate);
  await saveNew(reviewDir, "candidate.sql", candidate);
  await saveNew(reviewDir, "rehearsal.json", {
    project_ref: PROJECT_REF,
    review_id: reviewId,
    verified_at: new Date().toISOString(),
    maintenance,
    rehearsal_sql_sha256: await checksumText(rollbackSql),
    candidate_sql_sha256: candidateHash,
    rollback_verified: true,
    committed: false,
    finalized_from_saved_rollback: true,
    before_account_count: prepared.snapshot.account_report.accounts.length,
    deleted_account_count: prepared.target_count,
    remaining_account_count: expected.account_report.accounts.length,
    changed_account_relations: changed,
    expected_after: expected,
  });
  console.log(`Saved rollback verified without rerunning SQL: ${prepared.target_count} candidate accounts were removed only inside the earlier rolled-back transaction; both protected admins remain. Candidate SHA-256: ${candidateHash}. Nothing was committed.`);
}

async function execute(reviewDir, reviewId, sqlSha256) {
  const prepared = JSON.parse(await loadChecked(reviewDir, "prepared.json"));
  const rehearsal = JSON.parse(await loadChecked(reviewDir, "rehearsal.json"));
  const candidate = await loadChecked(reviewDir, "candidate.sql");
  const expectedCandidate = makeTransaction(prepared, "commit", rehearsal.expected_after);
  const candidateHash = await checksumText(candidate);
  if (prepared.project_ref !== PROJECT_REF || rehearsal.project_ref !== PROJECT_REF || prepared.review_id !== reviewId
    || rehearsal.review_id !== reviewId || rehearsal.rollback_verified !== true || rehearsal.committed !== false
    || candidate !== expectedCandidate || candidateHash !== rehearsal.candidate_sql_sha256 || candidateHash !== sqlSha256) {
    throw new Error("Execution requires the exact reviewed account candidate and successful rollback rehearsal hash");
  }
  const before = await capture(reviewDir);
  assertBaselineStillMatches(prepared, before);
  validateInitialSnapshot(before);
  validateDeletionTriggers(before);
  const executionMaintenance = await freshMaintenance();
  await createAttempt(reviewDir, "execution-attempt.json", {
    started_at: new Date().toISOString(),
    project_ref: PROJECT_REF,
    sql_sha256: candidateHash,
    target_account_count: prepared.target_count,
    maintenance: executionMaintenance,
    one_use: true,
  });
  let response;
  let failure;
  try {
    const rows = await query(candidate, reviewDir);
    if (rows.length !== 1 || !rows[0].account_cleanup) throw new Error("Commit query returned no verified result");
    response = rows[0].account_cleanup;
  } catch (error) {
    failure = error.message;
  }
  const after = await capture(reviewDir);
  const postCommitMaintenance = await freshMaintenance();
  const expected = rehearsal.expected_after;
  const acknowledgementLost = Boolean(failure);
  if (response && (!same(withoutLiveFlowCount(response), withoutLiveFlowCount(expected)))) {
    failure = "Commit response did not match the rehearsed result";
  }
  const actualMatches = same(withoutLiveFlowCount(after), withoutLiveFlowCount(expected))
    && same(after.account_report.accounts, prepared.keep_accounts)
    && after.account_report.accounts.length === 2
    && after.account_report.accounts.every((account) => account.is_admin);
  if (!actualMatches) failure = failure ?? "Fresh committed account inventory does not match the rehearsed result";
  else failure = null;
  const evidence = {
    project_ref: PROJECT_REF,
    review_id: reviewId,
    verified_at: new Date().toISOString(),
    sql_sha256: candidateHash,
    deleted_account_count: prepared.target_count,
    remaining_account_count: after.account_report.accounts.length,
    remaining_admins_verified: actualMatches,
    post_commit_maintenance: postCommitMaintenance,
    expected_after_matches: actualMatches,
    committed: actualMatches,
    acknowledgement_received: !acknowledgementLost,
    failure: failure ?? null,
  };
  await saveNew(reviewDir, "execution-evidence.json", evidence);
  if (failure) throw new Error(`${failure}; the one-use execution marker is retained. Do not retry; reconcile fresh live state and private evidence.`);
  console.log(`Verified production account cleanup: ${prepared.target_count} accounts removed; only Catherine Notado and Jahmell Dorias remain as Auth accounts and admins. Website maintenance remains active, both jobs remain paused, and unrelated public data matches the rollback rehearsal${acknowledgementLost ? " (the CLI acknowledgement was lost, but fresh state confirms the commit)" : ""}.`);
}

export async function main(args = process.argv.slice(2)) {
  const { command, reviewId, sqlSha256 } = parseArgs(args);
  const reviewDir = resolve(evidenceRoot, reviewId);
  return withOperationLock(async () => {
    const maintenance = await freshMaintenance();
    if (command === "prepare") {
      await prepare(reviewDir, reviewId, maintenance);
      return;
    }
    if (command === "rehearse") {
      await rehearse(reviewDir, reviewId);
      return;
    }
    if (command === "finalize-rehearsal") {
      await finalizeSavedRehearsal(reviewDir, reviewId);
      return;
    }
    await execute(reviewDir, reviewId, sqlSha256);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
