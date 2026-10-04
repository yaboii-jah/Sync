import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSouthSummityImport } from "../../lib/events/south-summity.ts";
import { directory, load, save, maintenanceCheck, withOperationLock } from "../event-import/run.mjs";
import { inventorySql, PROJECT_REF } from "../event-import/inventory.mjs";
import { inventoryFromRows } from "../event-import/cli-response.mjs";
import { query } from "../event-import/operator.mjs";
import { assertPreserved, digest } from "../event-import/rehearsal.mjs";
import { assertImportedState, contentVerificationSql } from "../event-import/commit-sql.mjs";
import { recordAttempt } from "../event-import/commit.mjs";
import { assertPreparedBundle, withoutGuards } from "./reversal.mjs";
import { assertFrozenBaseline, withCurrentFlowCount, reviewPrefix } from "./baseline.mjs";

export function parseArguments(args) {
  if (![5, 7].includes(args.length) || args[0] !== "execute" || args[1] !== "--project-ref" || args[2] !== PROJECT_REF
    || args[3] !== "--sql-sha256" || !/^[a-f0-9]{64}$/.test(args[4])
    || (args.length === 7 && args[5] !== "--review-id")) {
    throw new Error(`Use execute --project-ref ${PROJECT_REF} --sql-sha256 <reviewed hash> [--review-id <ID>]`);
  }
  reviewPrefix(args);
  return args[4];
}

export function assertRehearsal(review, evidence, checksum) {
  if (checksum !== review.candidate_sha256 || evidence.project_ref !== PROJECT_REF || evidence.committed !== false
    || evidence.candidate_sha256 !== checksum || evidence.validation_sha256 !== review.validation_sha256
    || !evidence.rollback_verified || !evidence.preserved || !evidence.result?.guards_removed
    || !evidence.result.content_verified || !evidence.result.unrelated_state_verified
    || !evidence.result.jobs_paused || evidence.result.zero_row_role_probes !== 2) {
    throw new Error("Reviewed candidate lacks successful exact-body rollback evidence");
  }
  assertPreserved(review.inventory, evidence.inventory);
}

async function refuseAttempt(path) {
  try { await access(path); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Guard reversal already attempted; inspect live state and private evidence. No repeat permitted.");
}

export async function main(args = process.argv.slice(2)) {
  const checksum = parseArguments(args);
  const prefix = reviewPrefix(args);
  return withOperationLock(async () => {
    const privateDirectory = resolve(directory, `${prefix}/execution`);
    await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
    const attemptPath = resolve(privateDirectory, "attempt.json");
    await refuseAttempt(attemptPath);
    const payload = prepareSouthSummityImport();
    const review = JSON.parse(await load(`${prefix}/review.json`));
    const rehearsed = JSON.parse(await load(`${prefix}/evidence.json`));
    const imported = JSON.parse(await load("commit/execution-evidence.json"));
    const importReview = JSON.parse(await load("commit/review.json"));
    const released = JSON.parse(await load("release/after-release.json"));
    const bundle = { candidate: await load(`${prefix}/candidate.sql`), validation: await load(`${prefix}/validation.sql`),
      candidate_sha256: review.candidate_sha256, validation_sha256: review.validation_sha256 };
    assertPreparedBundle(bundle, review, review.inventory, payload);
    assertRehearsal(review, rehearsed, checksum);
    if (!imported.committed || imported.project_ref !== PROJECT_REF || imported.payload_sha256 !== digest(payload)
      || imported.candidate_sha256 !== importReview.candidate_sha256
      || review.import_candidate_sha256 !== imported.candidate_sha256
      || released.project_ref !== PROJECT_REF || !released.preserved || released.guard_count !== 22
      || review.release_verified_at !== released.verified_at) throw new Error("Verified import/release binding changed");
    const capture = async () => inventoryFromRows(await query(inventorySql(), privateDirectory));
    const contentCheck = async () => {
      const content = (await query(contentVerificationSql(importReview.inventory, payload), privateDirectory))[0]?.imported;
      if (!content?.content_verified || content.events !== 1 || content.sessions !== 15 || content.speakers !== 5
        || content.links !== 5 || content.published_sessions !== 15 || content.event_date_pht !== "2026-10-07"
        || content.starts_pht !== "09:30" || content.ends_pht !== "17:30") throw new Error("Imported content verification failed");
      return content;
    };
    const maintenance = await maintenanceCheck();
    const before = await capture();
    await save(`${prefix}/execution/preflight.json`, { project_ref: PROJECT_REF, captured_at: new Date().toISOString(),
      candidate_sha256: checksum, maintenance, inventory: before });
    assertImportedState(withCurrentFlowCount(importReview.inventory, before), before, payload);
    assertPreserved(review.inventory, before);
    assertFrozenBaseline(released.inventory, before);
    await contentCheck();
    await recordAttempt(attemptPath, { project_ref: PROJECT_REF, started_at: new Date().toISOString(),
      candidate_sha256: checksum, retry_permitted: false,
      authorization: "Owner requested Google login recovery following controlled reopening preparation; guard reversal only, with public maintenance enabled and jobs paused" });
    let acknowledgement;
    let queryFailure;
    try { acknowledgement = await query(bundle.candidate, privateDirectory); }
    catch (error) { queryFailure = error.message; }
    await save(`${prefix}/execution/acknowledgement.json`, { received_at: new Date().toISOString(),
      rows: acknowledgement ?? null, failure: queryFailure ?? null });
    try {
      // Fresh state is authoritative after a lost acknowledgement. Never resend the candidate.
      const after = await capture();
      await save(`${prefix}/execution/post-unfreeze.json`, { captured_at: new Date().toISOString(), inventory: after });
      assertPreserved(withoutGuards(before), after);
      const content = await contentCheck();
      const finalMaintenance = await maintenanceCheck();
      const evidence = { project_ref: PROJECT_REF, verified_at: new Date().toISOString(), committed: true,
        candidate_sha256: checksum, payload_sha256: digest(payload), guarded_tables: after.guards.length,
        guard_function_absent: after.guard_function === null, jobs_paused: after.cron.length,
        unrelated_state_preserved: true, content, maintenance: finalMaintenance,
        acknowledgement_received: !queryFailure, acknowledgement_failure: queryFailure ?? null, retry_permitted: false };
      await save(`${prefix}/execution/evidence.json`, evidence);
      console.log(JSON.stringify(evidence));
    } catch (error) {
      await save(`${prefix}/execution/verification-error.json`, { recorded_at: new Date().toISOString(),
        error: error.message, query_failure: queryFailure ?? null, retry_permitted: false });
      throw new Error("Guard reversal was attempted; inspect fresh live state and private evidence. No automatic retry, re-freeze, or data restoration is permitted.");
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
