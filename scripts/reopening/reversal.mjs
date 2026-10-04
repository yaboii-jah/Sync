import { GUARD_BODY, GUARD_FUNCTION, GUARD_NAME, JOB_NAMES, PROJECT_REF, TABLES,
  eventInventorySelectSql, quoteLiteral, relation } from "../event-import/inventory.mjs";
import { digest, preservedState, contentChecksSql } from "../event-import/rehearsal.mjs";

const qualified = (name) => name.includes(".") ? name : `public.${name}`;

export function assertFrozen(snapshot) {
  preservedState(snapshot);
  if (snapshot.session_user !== "postgres" || !["none", "postgres"].includes(snapshot.active_role)) {
    throw new Error("Direct postgres operator required");
  }
  const fn = snapshot.guard_function;
  if (!fn || fn.source !== GUARD_BODY || fn.owner !== "postgres" || fn.definer
    || fn.return_type !== "trigger" || digest(fn.settings) !== digest(['search_path=""'])
    || fn.acl !== "{postgres=X/postgres}") throw new Error("Maintenance function changed");
  if (snapshot.guards.length !== TABLES.length
    || digest(snapshot.guards.map((g) => qualified(g.table)).sort()) !== digest([...TABLES].sort())
    || snapshot.guards.some((g) => g.enabled !== "O" || g.type !== 62
      || g.function !== `${GUARD_FUNCTION}()` || g.arguments !== "" || g.when !== null)) {
    throw new Error("Maintenance guards changed");
  }
  if (digest(snapshot.cron.map((j) => j.name).sort()) !== digest([...JOB_NAMES].sort())
    || snapshot.cron.some((j) => j.active || j.username !== "postgres")
    || snapshot.running_cron !== 0 || snapshot.queued_requests !== 0 || snapshot.active_dispatches !== 0) {
    throw new Error("Background writers are not paused/drained");
  }
}

/** The only permitted state change: remove guards and their four insert-hook entries. */
export function withoutGuards(snapshot) {
  return { ...snapshot, guards: [], guard_function: null,
    insert_hooks: { ...snapshot.insert_hooks,
      triggers: snapshot.insert_hooks.triggers.filter((hook) => hook.name !== GUARD_NAME) } };
}

function stateAssertion(snapshot) {
  return `do $state$ declare actual jsonb; expected jsonb := ${quoteLiteral(JSON.stringify(preservedState(snapshot)))}::jsonb; k text;
begin
 select inventory into actual from (${eventInventorySelectSql()}) live_state;
 for k in select jsonb_object_keys(expected) loop
  if actual->k is distinct from expected->k then raise exception 'Reopening inventory drift: %',k; end if;
 end loop;
end $state$;`;
}

export function reversalBundle(snapshot, payload) {
  assertFrozen(snapshot);
  const body = `-- Project ${PROJECT_REF}. Guard reversal only; jobs remain paused.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local idle_in_transaction_session_timeout = '30s';
set local standard_conforming_strings = on;
do $operator$ begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres') then raise exception 'Direct operator required'; end if;
 if not pg_try_advisory_xact_lock(741023,1) or not pg_try_advisory_xact_lock(1937337955,20261003) then raise exception 'Production operation lock busy'; end if;
end $operator$;
-- Acquire the DDL lock once, before assertions or changes.
lock table ${TABLES.map(relation).join(", ")} in access exclusive mode;
lock table cron.job in access share mode;
${stateAssertion(snapshot)}
${contentChecksSql(snapshot, payload)}
${TABLES.map((table) => `drop trigger ${GUARD_NAME} on ${relation(table)};`).join("\n")}
drop function ${GUARD_FUNCTION}();
-- Zero-row probes use actual database roles, with no fabricated JWT or user.
set local role authenticated;
update public.profiles set id=id where false;
reset role;
set local role service_role;
update public.profiles set id=id where false;
reset role;
${stateAssertion(withoutGuards(snapshot))}
${contentChecksSql(snapshot, payload)}
select jsonb_build_object('guards_removed',true,'content_verified',true,
 'unrelated_state_verified',true,'jobs_paused',true,'zero_row_role_probes',2) as reversal;
`;
  const candidate = `${body}commit;\n`;
  const validation = `${body}rollback;\n`;
  return { candidate, validation, candidate_sha256: digest(candidate), validation_sha256: digest(validation) };
}

export function assertPreparedBundle(bundle, review, snapshot, payload) {
  if (review.project_ref !== PROJECT_REF || review.payload_sha256 !== digest(payload)
    || review.inventory_sha256 !== digest(preservedState(snapshot))) throw new Error("Reopening review binding changed");
  const expected = reversalBundle(snapshot, payload);
  for (const key of ["candidate", "validation", "candidate_sha256", "validation_sha256"]) {
    if (bundle[key] !== expected[key]) throw new Error("Reopening SQL differs from exact reviewed generator output");
  }
  if (review.candidate_sha256 !== expected.candidate_sha256 || review.validation_sha256 !== expected.validation_sha256) {
    throw new Error("Reopening review checksum changed");
  }
}
