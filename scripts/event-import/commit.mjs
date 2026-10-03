import { access, mkdir, open, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSouthSummityImport } from "../../lib/events/south-summity.ts";
import { PROJECT_REF } from "./inventory.mjs";
import { assertSnapshot, assertPreserved, assertPreparedSql, digest } from "./rehearsal.mjs";
import { committingBundle, assertCommittingSql, assertImportedState, contentVerificationSql } from "./commit-sql.mjs";
import { directory, save, load, capture, maintenanceCheck, withOperationLock } from "./run.mjs";
import { query } from "./operator.mjs";

const commitDirectory = resolve(directory, "commit");
const attemptPath = resolve(commitDirectory, "execution-attempt.json");

export function parseCommitArguments(args) {
  if (!["prepare", "validate", "execute"].includes(args[0]) || args[1] !== "--project-ref" || args[2] !== PROJECT_REF
    || (args[0] === "execute" ? args.length !== 5 || args[3] !== "--sql-sha256" || !/^[a-f0-9]{64}$/.test(args[4]) : args.length !== 3)) {
    throw new Error(`Use prepare|validate --project-ref ${PROJECT_REF}, or execute --project-ref ${PROJECT_REF} --sql-sha256 <reviewed hash>`);
  }
  return { command: args[0], projectRef: args[2], checksum: args[4] };
}

async function refuseAttemptedImport() {
  try { await access(attemptPath); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("An import execution was already attempted. No repeat is permitted; inspect live state and private evidence.");
}

/** Written exclusively before the first execution; never removed automatically. */
export async function recordAttempt(file, value) {
  const handle = await open(file, "wx", 0o600);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try { await handle.writeFile(content); await handle.sync(); }
  finally { await handle.close(); }
  await writeFile(`${file}.sha256`, `${digest(content)}\n`, { mode: 0o600, flag: "wx" });
}

export async function main(args = process.argv.slice(2)) {
  const { command, projectRef, checksum } = parseCommitArguments(args);
  return withOperationLock(async () => {
    await refuseAttemptedImport();
    await mkdir(commitDirectory, { recursive: true, mode: 0o700 });
    const maintenance = await maintenanceCheck();
    const payload = prepareSouthSummityImport();
    const snapshot = await capture();
    assertSnapshot(snapshot, payload);
    if (command === "prepare") {
      const prior = JSON.parse(await load("prepared.json"));
      const evidence = JSON.parse(await load("evidence.json"));
      const rehearsal = await load("rehearsal.sql");
      if (prior.project_ref !== PROJECT_REF || prior.payload_sha256 !== digest(payload) || !evidence.success
        || !evidence.rollback_preserved || evidence.committed !== false || evidence.sql_sha256 !== digest(rehearsal)
        || evidence.payload_sha256 !== digest(payload)) throw new Error("Current payload lacks successful checksum-bound rehearsal evidence");
      assertPreparedSql(rehearsal, prior.sql_sha256, prior.inventory, payload, projectRef);
      assertPreserved(prior.inventory, snapshot);
      const bundle = committingBundle(snapshot, payload);
      await save("commit/candidate.sql", bundle.candidate);
      await save("commit/validation.sql", bundle.validation);
      await save("commit/review.json", { project_ref: PROJECT_REF, captured_at: new Date().toISOString(), maintenance,
        payload_sha256: digest(payload), candidate_sha256: bundle.candidate_sha256,
        validation_sha256: bundle.validation_sha256, inventory: snapshot,
        scope: { events: 1, sessions: 15, placeholders: 5, links: 5 },
        authorization: "Owner requested implementation of the production event import after the successful rollback rehearsal" });
      console.log(`Committing candidate prepared, not executed. SQL SHA-256: ${bundle.candidate_sha256}. Scope: 1 event, 15 sessions, 5 placeholders, 5 links.`);
      return;
    }
    const review = JSON.parse(await load("commit/review.json"));
    const candidate = await load("commit/candidate.sql");
    const validation = await load("commit/validation.sql");
    if (review.project_ref !== projectRef || review.payload_sha256 !== digest(payload)) throw new Error("Candidate project/content changed");
    assertCommittingSql(candidate, review.candidate_sha256, review.inventory, payload, projectRef);
    const bundle = committingBundle(review.inventory, payload);
    if (validation !== bundle.validation || digest(validation) !== review.validation_sha256) throw new Error("Validation differs from the candidate body ending with rollback");
    assertPreserved(review.inventory, snapshot);
    if (command === "validate") {
      await save("commit/validation-preflight.json", { maintenance, inventory: snapshot });
      let result;
      let failure;
      try { result = (await query(validation, directory))?.[0]?.rehearsal; }
      catch (error) { failure = error.message; }
      const after = await capture();
      await save("commit/validation-post-rollback.json", { captured_at: new Date().toISOString(), inventory: after });
      assertPreserved(snapshot, after);
      if (!failure && (!result?.content_verified || !result?.unrelated_state_verified || result.events !== 1
        || result.sessions !== 15 || result.speakers !== 5 || result.links !== 5)) failure = "Validation result did not verify the exact content";
      await save("commit/validation-evidence.json", { project_ref: PROJECT_REF, verified_at: new Date().toISOString(),
        candidate_sha256: digest(candidate), validation_sha256: digest(validation), payload_sha256: digest(payload),
        result: result ?? null, rollback_preserved: true, success: !failure, failure: failure ?? null });
      if (failure) throw new Error(`${failure}; rollback preservation verified. No execution attempted.`);
      console.log(`Exact committing candidate validated with final rollback. Production baseline preserved. SQL SHA-256: ${digest(candidate)}`);
      return;
    }
    if (checksum !== review.candidate_sha256) throw new Error("Explicit reviewed SQL checksum does not match the candidate");
    const validated = JSON.parse(await load("commit/validation-evidence.json"));
    if (validated.project_ref !== projectRef || !validated.success || !validated.rollback_preserved
      || validated.candidate_sha256 !== digest(candidate) || validated.validation_sha256 !== digest(validation)
      || validated.payload_sha256 !== digest(payload)) throw new Error("Candidate lacks successful exact-body rollback validation");
    await save("commit/execution-preflight.json", { project_ref: PROJECT_REF, captured_at: new Date().toISOString(), maintenance, inventory: snapshot });
    await recordAttempt(attemptPath, { project_ref: PROJECT_REF, started_at: new Date().toISOString(),
      candidate_sha256: digest(candidate), payload_sha256: digest(payload), retry_permitted: false, authorization: review.authorization });
    let acknowledgement;
    let queryFailure;
    try { acknowledgement = await query(candidate, directory); }
    catch (error) { queryFailure = error.message; }
    await save("commit/acknowledgement.json", { received_at: new Date().toISOString(), rows: acknowledgement ?? null, failure: queryFailure ?? null });
    try {
      const after = await capture();
      await save("commit/post-import.json", { captured_at: new Date().toISOString(), inventory: after });
      assertImportedState(snapshot, after, payload);
      const result = (await query(contentVerificationSql(review.inventory, payload), directory))?.[0]?.imported;
      if (!result?.content_verified || result.events !== 1 || result.sessions !== 15 || result.speakers !== 5
        || result.links !== 5 || result.published_sessions !== 15 || result.event_date_pht !== "2026-10-07"
        || result.starts_pht !== "09:30" || result.ends_pht !== "17:30") throw new Error("Persisted import content/timezone verification failed");
      const finalMaintenance = await maintenanceCheck();
      await save("commit/execution-evidence.json", { project_ref: PROJECT_REF, verified_at: new Date().toISOString(),
        committed: true, candidate_sha256: digest(candidate), payload_sha256: digest(payload),
        result, unrelated_state_preserved: true, maintenance: finalMaintenance, acknowledgement_received: !queryFailure,
        acknowledgement_failure: queryFailure ?? null, retry_permitted: false });
      console.log(`Production import committed and freshly verified: 1 event, 15 published sessions, 5 placeholders, 5 links. Admins/guards/jobs/schema/sequences preserved; maintenance active. SQL SHA-256: ${digest(candidate)}`);
    } catch (error) {
      await save("commit/execution-verification-error.json", { recorded_at: new Date().toISOString(), error: error.message,
        query_failure: queryFailure ?? null, retry_permitted: false });
      throw new Error("Execution was attempted; verification requires review of live state and private evidence. No automatic retry or reversal is permitted.");
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
