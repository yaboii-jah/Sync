import { describe, expect, it } from "vitest";
import { prepareSouthSummityImport } from "./south-summity";
import { assertSnapshot, assertPreserved, assertPreparedSql, digest, rehearsalSql } from "../../scripts/event-import/rehearsal.mjs";
import { parseArguments } from "../../scripts/event-import/run.mjs";
import { parseQueryRows } from "../../scripts/event-import/cli-response.mjs";
import { GUARD_BODY, GUARD_FUNCTION, GUARD_NAME, JOB_NAMES, PROJECT_REF, TABLES, inventorySql } from "../../scripts/event-import/inventory.mjs";
import { committingBundle, assertCommittingSql, assertImportedState, contentVerificationSql } from "../../scripts/event-import/commit-sql.mjs";
import { parseCommitArguments, recordAttempt } from "../../scripts/event-import/commit.mjs";
import { mkdtemp, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const payload = prepareSouthSummityImport();
const constraintDefinitions = {
  events: [
    "CHECK ((status = ANY (ARRAY['upcoming'::text, 'started'::text, 'ended'::text])))",
    "CHECK ((ends_at > starts_at))", "PRIMARY KEY (id)", "CHECK ((length(TRIM(BOTH FROM theme)) > 0))",
  ],
  sessions: [
    "CHECK ((status = ANY (ARRAY['not_started'::text, 'ongoing'::text, 'finished'::text])))",
    "CHECK ((end_time > start_time))", "PRIMARY KEY (id)", "FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE",
    "CHECK ((status_override = ANY (ARRAY['ongoing'::text, 'finished'::text])))",
    "FOREIGN KEY (status_override_by) REFERENCES auth.users(id) ON DELETE SET NULL",
    "CHECK (((capacity IS NULL) OR (capacity > 0)))", "CHECK ((reserved_seats >= 0))", "CHECK ((claimed_seats >= 0))",
    "CHECK (((capacity IS NULL) OR ((reserved_seats + claimed_seats) <= capacity)))",
  ],
  speakers_sponsors: ["PRIMARY KEY (id)", "CHECK ((role = ANY (ARRAY['speaker'::text, 'host'::text, 'panelist'::text, 'sponsor'::text, 'facilitator'::text])))"],
  session_speakers: ["PRIMARY KEY (session_id, speaker_id)", "FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE", "FOREIGN KEY (speaker_id) REFERENCES speakers_sponsors(id) ON DELETE CASCADE"],
};

/** Synthetic inventory has no real account IDs, hashes, credentials, or remote dependency. */
function fixture() {
  const rows = [ ["events", payload.event], ["sessions", payload.sessions[0]],
    ["speakers_sponsors", payload.speakers[0]], ["session_speakers", payload.speakerLinks[0]] ] as const;
  return {
    session_user: "postgres", active_role: "none", server_version: "17",
    relations: TABLES.filter((name) => name.startsWith("public.")).map((name) => ({ name, kind: "r", rls: true })),
    counts: TABLES.map((relation) => ({ relation, rows: relation === "auth.identities" ? 10
      : ["auth.users", "public.profiles", "public.admin_users"].includes(relation) ? 5 : 0, data_hash: "fixture" })),
    retained_admins: Array.from({ length: 5 }, () => ({ has_auth: true, has_profile: true, identities: 2 })),
    guard_function: { source: GUARD_BODY, owner: "postgres", definer: false, return_type: "trigger", settings: ['search_path=""'], acl: "{postgres=X/postgres}" },
    guards: TABLES.map((table) => ({ table, enabled: "O", type: 62, function: `${GUARD_FUNCTION}()`, arguments: "", when: null })),
    cron: JOB_NAMES.map((name) => ({ name, active: false, username: "postgres" })),
    running_cron: 0, queued_requests: 0, active_dispatches: 0, storage_buckets: 0, storage_objects: 0,
    columns: rows.flatMap(([table, row]) => Object.keys(row).map((name) => ({ table, name, generated: "", identity: "", nullable: true, type: "text" }))),
    constraints: Object.entries(constraintDefinitions).flatMap(([table, definitions]) => definitions.map((definition) => ({ table, definition }))),
    indexes: [], policies: [], functions: [], triggers: [], auth_counts: {}, latest_auth_update: null, latest_migration: "fixture", sequence_values: [] as unknown[],
    insert_hooks: { rules: [] as unknown[], triggers: [
      ...rows.map(([table]) => ({ table, internal: false, name: GUARD_NAME, function: `${GUARD_FUNCTION}()`, type: 62, enabled: "O", source: GUARD_BODY })),
      ...["sessions", "sessions", "session_speakers", "session_speakers"].map((table) => ({ table, internal: true, name: "fixture-fk", function: '"RI_FKey_check_ins"()', type: 5, enabled: "O", source: 'LANGUAGE internal RI_FKey_check_ins$function$' })),
    ] },
  };
}

describe("rollback import safeguards", () => {
  it("preserves 64-bit sequence metadata as strings instead of rounded JSON numbers", () => {
    expect(inventorySql()).toContain("max_value::text");
    expect(inventorySql()).toContain("last_value::text");
    expect(inventorySql()).toContain("schemaname in ('public','private','auth')");
    expect(inventorySql()).toContain("select last_value,is_called");
    const before = fixture();
    before.sequence_values = [{ max_value: "9223372036854775807", last_value: "212" }];
    expect(() => assertPreserved(before, structuredClone(before))).not.toThrow();
    const after = structuredClone(before);
    after.sequence_values = [{ max_value: "9223372036854775807", last_value: "213" }];
    expect(() => assertPreserved(before, after)).toThrow("Post-rollback");
  });
  it("accepts only explicit-project prepare/rehearse commands", () => {
    expect(parseArguments(["prepare", "--project-ref", PROJECT_REF])).toBe("prepare");
    expect(parseArguments(["rehearse", "--project-ref", PROJECT_REF])).toBe("rehearse");
    for (const args of [["commit", "--project-ref", PROJECT_REF], ["rehearse"], ["rehearse", "--project-ref", "other"],
      ["rehearse", "--project-ref", PROJECT_REF, "--apply"]]) expect(() => parseArguments(args)).toThrow();
  });

  it("emits insert-only SQL, explicit statuses, both operation locks, and a final rollback", () => {
    const sql = rehearsalSql(fixture(), payload);
    expect(sql.trim().endsWith("rollback;")).toBe(true);
    expect(sql).not.toMatch(/^\s*(commit|update|delete|truncate|alter|drop)\b/im);
    expect(sql.match(/insert into public\./g)).toHaveLength(4);
    expect(sql).toContain("pg_try_advisory_xact_lock(741023,1)");
    expect(sql).toContain("pg_try_advisory_xact_lock(1937337955,20261003)");
    expect(sql).toContain("now() < src.starts_at");
    expect(sql).toContain("now() >= src.end_time");
    expect(sql).toContain("lock table cron.job in access share mode");
    expect(sql).toContain("except all");
  });

  it("rejects SQL changes even when a new checksum is supplied", () => {
    const snapshot = fixture();
    const sql = rehearsalSql(snapshot, payload);
    expect(() => assertPreparedSql(sql, digest(sql), snapshot, payload, PROJECT_REF)).not.toThrow();
    const changed = sql.replace(/rollback;\n$/, "commit;\n");
    expect(() => assertPreparedSql(changed, digest(changed), snapshot, payload, PROJECT_REF)).toThrow("exact rollback");
    expect(() => assertPreparedSql(sql, "wrong", snapshot, payload, PROJECT_REF)).toThrow();
    expect(() => assertPreparedSql(sql, digest(sql), snapshot, payload, "other")).toThrow("project");
  });

  it.each(["public.events", "public.sessions", "public.speakers_sponsors", "public.session_speakers"])("refuses nonempty %s", (table) => {
    const snapshot = fixture();
    snapshot.counts.find((row) => row.relation === table)!.rows = 1;
    expect(() => assertSnapshot(snapshot, payload)).toThrow("Nonempty/conflicting");
  });

  it("refuses missing guards, altered function, active jobs, and unknown insert hooks", () => {
    const missing = fixture(); missing.guards.pop();
    expect(() => assertSnapshot(missing, payload)).toThrow("guards");
    const altered = fixture(); altered.guard_function.source += "changed";
    expect(() => assertSnapshot(altered, payload)).toThrow("function altered");
    const jobs = fixture(); jobs.cron[0].active = true;
    expect(() => assertSnapshot(jobs, payload)).toThrow("paused/drained");
    const hook = fixture(); hook.insert_hooks.triggers[0].function = "send_external_request()";
    expect(() => assertSnapshot(hook, payload)).toThrow("insert hook");
  });

  it("refuses schema/default execution surprises", () => {
    const columns = fixture(); columns.columns[0].type = "custom_domain";
    expect(() => assertSnapshot(columns, payload)).toThrow("live columns");
    const constraints = fixture(); constraints.constraints[0].definition = "CHECK (send_external_request())";
    expect(() => assertSnapshot(constraints, payload)).toThrow("constraints changed");
  });

  it("checks rollback preservation of data, guards, schema, jobs, and sequences", () => {
    const baseline = fixture();
    expect(() => assertPreserved(baseline, structuredClone(baseline))).not.toThrow();
    for (const mutate of [
      (s: ReturnType<typeof fixture>) => { s.counts[0].data_hash = "different"; },
      (s: ReturnType<typeof fixture>) => { s.guards[0].enabled = "D"; },
      (s: ReturnType<typeof fixture>) => { s.columns[0].nullable = false; },
      (s: ReturnType<typeof fixture>) => { s.cron[0].active = true; },
      (s: ReturnType<typeof fixture>) => { s.sequence_values = ["different"]; },
    ]) {
      const after = fixture(); mutate(after);
      expect(() => assertPreserved(baseline, after)).toThrow("Post-rollback");
    }
  });

  it("parses both CLI row shapes and rejects malformed results", () => {
    expect(parseQueryRows('notice\n[{"rehearsal":{"sessions":15}}]')).toHaveLength(1);
    expect(parseQueryRows('{"rows":[{"rehearsal":{"sessions":15}}]}')).toHaveLength(1);
    for (const text of ["no results", "[{", '{"rows":null}', "[null]"]) expect(() => parseQueryRows(text)).toThrow();
  });
});

describe("reviewed committing import", () => {
  it("keeps the committing candidate and rollback validation identical except their final statement", () => {
    const bundle = committingBundle(fixture(), payload);
    expect(bundle.candidate).toBe(bundle.validation.replace(/\nrollback;\n$/, "\ncommit;\n"));
    expect(bundle.candidate.match(/^commit;$/gm)).toHaveLength(1);
    expect(bundle.validation).not.toMatch(/^commit;$/m);
    expect(bundle.candidate).not.toMatch(/^\s*(update|delete|truncate|alter|drop)\b/im);
    expect(bundle.candidate.match(/insert into public\./g)).toHaveLength(4);
  });

  it("requires the explicit project and candidate checksum for execution", () => {
    const checksum = committingBundle(fixture(), payload).candidate_sha256;
    expect(parseCommitArguments(["execute", "--project-ref", PROJECT_REF, "--sql-sha256", checksum]).checksum).toBe(checksum);
    for (const args of [ ["execute", "--project-ref", PROJECT_REF], ["execute", "--project-ref", "other", "--sql-sha256", checksum],
      ["execute", "--project-ref", PROJECT_REF, "--sql-sha256", "bad"], ["prepare", "--project-ref", PROJECT_REF, "--apply"] ]) {
      expect(() => parseCommitArguments(args)).toThrow();
    }
  });

  it("rejects changed candidate SQL despite recomputed checksums", () => {
    const snapshot = fixture();
    const bundle = committingBundle(snapshot, payload);
    expect(() => assertCommittingSql(bundle.candidate, bundle.candidate_sha256, snapshot, payload, PROJECT_REF)).not.toThrow();
    const changed = bundle.candidate.replace("lock_timeout = '5s'", "lock_timeout = '60s'");
    expect(() => assertCommittingSql(changed, digest(changed), snapshot, payload, PROJECT_REF)).toThrow("exact reviewed");
    expect(() => assertCommittingSql(bundle.candidate, bundle.candidate_sha256, snapshot, payload, "other")).toThrow("project");
  });

  it("permits only the four intended count changes while preserving all unrelated hashes", () => {
    const before = fixture();
    const after = structuredClone(before);
    for (const row of after.counts) {
      const expected: Record<string, number> = { "public.events": 1, "public.sessions": 15, "public.speakers_sponsors": 5, "public.session_speakers": 5 };
      if (row.relation in expected) { row.rows = expected[row.relation]; row.data_hash = "imported fixture"; }
    }
    expect(() => assertImportedState(before, after, payload)).not.toThrow();
    after.counts.find((row) => row.relation === "auth.users")!.data_hash = "changed";
    expect(() => assertImportedState(before, after, payload)).toThrow("production state differs");
    const wrong = structuredClone(after); wrong.counts.find((row) => row.relation === "public.sessions")!.rows = 14;
    expect(() => assertImportedState(before, wrong, payload)).toThrow("row count");
  });

  it("checks persisted content with a read-only transaction and no insert path", () => {
    const sql = contentVerificationSql(fixture(), payload);
    expect(sql.startsWith("begin read only;")).toBe(true);
    expect(sql.match(/do \$rows\$/g)).toHaveLength(4);
    expect(sql).not.toMatch(/^\s*(insert|update|delete|truncate|alter|drop)\b/im);
    expect(sql).toContain("event_date_pht");
    expect(sql).toContain("published_sessions");
  });

  it("writes the execution marker once and refuses another attempt", async () => {
    const folder = await mkdtemp(join(tmpdir(), "sync-import-attempt-test-"));
    const path = join(folder, "attempt.json");
    try {
      await recordAttempt(path, { candidate_sha256: "fixture", retry_permitted: false });
      await expect(recordAttempt(path, { candidate_sha256: "other" })).rejects.toMatchObject({ code: "EEXIST" });
      expect(JSON.parse(await readFile(path, "utf8")).candidate_sha256).toBe("fixture");
    } finally {
      await unlink(path);
      await unlink(`${path}.sha256`);
      await rmdir(folder);
    }
  });
});
