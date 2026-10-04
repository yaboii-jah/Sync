import { describe, expect, it } from "vitest";
import { prepareSouthSummityImport } from "./south-summity";
import { assertFrozen, assertPreparedBundle, reversalBundle, withoutGuards } from "../../scripts/reopening/reversal.mjs";
import { parseArguments } from "../../scripts/reopening/run.mjs";
import { parseArguments as parseExecutionArguments, assertRehearsal } from "../../scripts/reopening/execute.mjs";
import { assertFrozenBaseline, withCurrentFlowCount, reviewPrefix } from "../../scripts/reopening/baseline.mjs";
import { assertPreserved, digest, preservedState } from "../../scripts/event-import/rehearsal.mjs";
import { GUARD_BODY, GUARD_FUNCTION, GUARD_NAME, JOB_NAMES, PROJECT_REF, TABLES } from "../../scripts/event-import/inventory.mjs";

const payload = prepareSouthSummityImport();
function fixture() {
  const targets = [["events", payload.event], ["sessions", payload.sessions[0]],
    ["speakers_sponsors", payload.speakers[0]], ["session_speakers", payload.speakerLinks[0]]] as const;
  return {
    session_user: "postgres", active_role: "none", server_version: "17",
    counts: [{ relation: "public.events", rows: 1, data_hash: "synthetic" }],
    relations: [], columns: targets.flatMap(([table, row]) => Object.keys(row).map((name) => ({ table, name }))),
    constraints: [], indexes: [], policies: [], functions: [], triggers: [], auth_counts: {},
    retained_admins: [], latest_auth_update: null, latest_migration: "synthetic",
    sequence_values: [{ last_value: "9223372036854775807", state: "unchanged" }],
    storage_buckets: 0, storage_objects: 0, running_cron: 0, queued_requests: 0, active_dispatches: 0,
    guards: TABLES.map((table) => ({ table, enabled: "O", type: 62, function: `${GUARD_FUNCTION}()`, arguments: "", when: null })),
    guard_function: { source: GUARD_BODY, owner: "postgres", definer: false, return_type: "trigger", settings: ['search_path=""'], acl: "{postgres=X/postgres}" },
    cron: JOB_NAMES.map((name, index) => ({ id: index + 1, name, active: false, username: "postgres", command_hash: "synthetic" })),
    insert_hooks: { rules: [], triggers: [
      ...targets.map(([table]) => ({ table, name: GUARD_NAME })),
      { table: "sessions", name: "synthetic-fk" },
    ] },
  };
}

describe("controlled reopening preparation", () => {
  it("allows only OAuth flow-state counts to change when preparing a fresh review", () => {
    const before = { ...fixture(), auth_counts: { flow_state: 8, sessions: 0, users: 5 } };
    const after = structuredClone(before); after.auth_counts.flow_state = 9;
    expect(() => assertFrozenBaseline(before, after)).not.toThrow();
    expect(withCurrentFlowCount(before, after).auth_counts.flow_state).toBe(9);
    expect(before.auth_counts.flow_state).toBe(8);
    expect(() => assertPreserved(before, after)).toThrow();
    const session = structuredClone(after); session.auth_counts.sessions = 1;
    expect(() => assertFrozenBaseline(before, session)).toThrow();
    const account = structuredClone(after); account.counts[0].data_hash = "changed";
    expect(() => assertFrozenBaseline(before, account)).toThrow();
    expect(() => withCurrentFlowCount(before, fixture())).toThrow("flow-state");
  });
  it("keeps refreshed reviews in separate directories and rejects path traversal", () => {
    const args = ["prepare", "--project-ref", PROJECT_REF, "--review-id", "login-recovery-20261003"];
    expect(parseArguments(args)).toBe("prepare");
    expect(reviewPrefix(args)).toBe("reopening/login-recovery-20261003");
    expect(reviewPrefix([])).toBe("reopening");
    for (const id of ["..", "../other", "A", "a/b", "", "a".repeat(41)]) {
      expect(() => parseArguments([...args.slice(0, 4), id])).toThrow();
    }
    expect(parseExecutionArguments(["execute", "--project-ref", PROJECT_REF, "--sql-sha256", "a".repeat(64),
      "--review-id", "login-recovery-20261003"])).toBe("a".repeat(64));
  });
  it("requires an explicit reviewed checksum and project for execution", () => {
    const checksum = "a".repeat(64);
    expect(parseExecutionArguments(["execute", "--project-ref", PROJECT_REF, "--sql-sha256", checksum])).toBe(checksum);
    for (const args of [["execute", "--project-ref", PROJECT_REF],
      ["execute", "--project-ref", "other", "--sql-sha256", checksum],
      ["execute", "--project-ref", PROJECT_REF, "--sql-sha256", "invalid"],
      ["execute", "--project-ref", PROJECT_REF, "--sql-sha256", checksum, "--resume-jobs"]]) {
      expect(() => parseExecutionArguments(args)).toThrow();
    }
  });
  it("requires preserved successful rehearsal evidence for the exact committing candidate", () => {
    const inventory = fixture(); const bundle = reversalBundle(inventory, payload);
    const review = { inventory, candidate_sha256: bundle.candidate_sha256, validation_sha256: bundle.validation_sha256 };
    const evidence = { ...review, project_ref: PROJECT_REF, committed: false, rollback_verified: true, preserved: true,
      result: { guards_removed: true, content_verified: true, unrelated_state_verified: true, jobs_paused: true, zero_row_role_probes: 2 } };
    expect(() => assertRehearsal(review, evidence, bundle.candidate_sha256)).not.toThrow();
    for (const mutation of [{ committed: true }, { rollback_verified: false }, { candidate_sha256: "other" },
      { result: { ...evidence.result, jobs_paused: false } }, { result: { ...evidence.result, zero_row_role_probes: 0 } }]) {
      expect(() => assertRehearsal(review, { ...evidence, ...mutation }, bundle.candidate_sha256)).toThrow();
    }
    const drift = structuredClone(evidence); drift.inventory.counts[0].data_hash = "changed";
    expect(() => assertRehearsal(review, drift, bundle.candidate_sha256)).toThrow();
    expect(() => assertRehearsal(review, evidence, "b".repeat(64))).toThrow();
  });
  it("accepts only explicit-project preparation and rollback rehearsal", () => {
    expect(parseArguments(["prepare", "--project-ref", PROJECT_REF])).toBe("prepare");
    expect(parseArguments(["rehearse", "--project-ref", PROJECT_REF])).toBe("rehearse");
    for (const args of [[], ["execute", "--project-ref", PROJECT_REF], ["rehearse", "--project-ref", "other"],
      ["rehearse", "--project-ref", PROJECT_REF, "--resume-jobs"]]) expect(() => parseArguments(args)).toThrow();
  });
  it("rejects an altered or partially removed freeze", () => {
    expect(() => assertFrozen(fixture())).not.toThrow();
    const missing = fixture(); missing.guards.pop();
    expect(() => assertFrozen(missing)).toThrow("guards");
    const altered = fixture(); altered.guard_function.definer = true;
    expect(() => assertFrozen(altered)).toThrow("function");
    const duplicate = fixture(); duplicate.guards[0] = duplicate.guards[1];
    expect(() => assertFrozen(duplicate)).toThrow("guards");
  });
  it("rejects an active, renamed, queued, or running background writer", () => {
    const active = fixture(); active.cron[0].active = true;
    expect(() => assertFrozen(active)).toThrow("paused/drained");
    const renamed = fixture(); renamed.cron[0].name = "other";
    expect(() => assertFrozen(renamed)).toThrow("paused/drained");
    for (const field of ["running_cron", "queued_requests", "active_dispatches"] as const) {
      const changed = fixture(); changed[field] = 1;
      expect(() => assertFrozen(changed)).toThrow("paused/drained");
    }
  });
  it("requires an unimpersonated direct operator", () => {
    for (const [field, value] of [["session_user", "authenticator"], ["active_role", "service_role"]] as const) {
      const changed = fixture(); changed[field] = value;
      expect(() => assertFrozen(changed)).toThrow("operator");
    }
  });
  it("removes only freeze metadata while preserving hooks, jobs, Auth, and exact sequences", () => {
    const before = fixture(); const after = withoutGuards(before);
    expect(after.guards).toEqual([]); expect(after.guard_function).toBeNull();
    expect(after.insert_hooks.triggers).toEqual([{ table: "sessions", name: "synthetic-fk" }]);
    expect(before.guards).toHaveLength(22);
    for (const key of ["counts", "cron", "auth_counts", "sequence_values", "policies"] as const) expect(after[key]).toEqual(before[key]);
    const drifted = structuredClone(after); drifted.counts[0].data_hash = "changed";
    expect(() => assertPreserved(after, drifted)).toThrow();
    const resumed = structuredClone(after); resumed.cron[0].active = true;
    expect(() => assertPreserved(after, resumed)).toThrow();
  });
  it("rehearses the identical committing body with a final rollback", () => {
    const bundle = reversalBundle(fixture(), payload);
    expect(bundle.validation).toBe(bundle.candidate.replace(/commit;\n$/, "rollback;\n"));
    expect(bundle.validation.match(/drop trigger sync_maintenance_write_guard on/g)).toHaveLength(22);
    expect(bundle.validation).toContain("drop function private.sync_maintenance_reject_write();");
    expect(bundle.validation).not.toMatch(/cascade|cron\.alter_job|truncate|insert into|delete from/i);
    expect(bundle.validation).toContain("access exclusive mode");
    expect(bundle.validation).toContain("pg_try_advisory_xact_lock(741023,1)");
    expect(bundle.validation).toContain("set local role authenticated;");
    expect(bundle.validation).toContain("set local role service_role;");
    expect(bundle.validation.match(/where false;/g)).toHaveLength(2);
  });
  it("binds exact SQL to project, payload, inventory, and both hashes", () => {
    const before = fixture(); const bundle = reversalBundle(before, payload);
    const review = { project_ref: PROJECT_REF, payload_sha256: digest(payload),
      inventory_sha256: digest(preservedState(before)), candidate_sha256: bundle.candidate_sha256,
      validation_sha256: bundle.validation_sha256 };
    expect(() => assertPreparedBundle(bundle, review, before, payload)).not.toThrow();
    const tampered = { ...bundle, validation: bundle.candidate, validation_sha256: bundle.candidate_sha256 };
    expect(() => assertPreparedBundle(tampered, { ...review, validation_sha256: tampered.validation_sha256 }, before, payload)).toThrow("generator");
    for (const field of ["project_ref", "payload_sha256", "inventory_sha256", "candidate_sha256", "validation_sha256"] as const) {
      expect(() => assertPreparedBundle(bundle, { ...review, [field]: "changed" }, before, payload)).toThrow();
    }
  });
});
