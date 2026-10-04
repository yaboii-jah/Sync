import { mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSouthSummityImport } from "../../lib/events/south-summity.ts";
import { directory, load, save, maintenanceCheck, withOperationLock } from "../event-import/run.mjs";
import { inventorySql, PROJECT_REF } from "../event-import/inventory.mjs";
import { inventoryFromRows } from "../event-import/cli-response.mjs";
import { query } from "../event-import/operator.mjs";
import { assertPreserved, digest, preservedState } from "../event-import/rehearsal.mjs";
import { assertImportedState, contentVerificationSql } from "../event-import/commit-sql.mjs";
import { assertPreparedBundle, reversalBundle } from "./reversal.mjs";
import { assertFrozenBaseline, withCurrentFlowCount, reviewPrefix } from "./baseline.mjs";

export function parseArguments(args) {
  if (![3, 5].includes(args.length) || !["prepare", "rehearse"].includes(args[0])
    || args[1] !== "--project-ref" || args[2] !== PROJECT_REF
    || (args.length === 5 && args[3] !== "--review-id")) {
    throw new Error(`Use prepare|rehearse --project-ref ${PROJECT_REF} [--review-id <new ID>]; no execution or job-resumption command exists`);
  }
  reviewPrefix(args);
  return args[0];
}

async function assertAbsent(path) {
  try { await access(path); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("Reopening preparation already exists; preserve its review and evidence");
}

export async function main(args = process.argv.slice(2)) {
  const command = parseArguments(args);
  const prefix = reviewPrefix(args);
  return withOperationLock(async () => {
    const payload = prepareSouthSummityImport();
    const imported = JSON.parse(await load("commit/execution-evidence.json"));
    const importReview = JSON.parse(await load("commit/review.json"));
    const released = JSON.parse(await load("release/after-release.json"));
    if (!imported.committed || imported.project_ref !== PROJECT_REF || imported.payload_sha256 !== digest(payload)
      || imported.candidate_sha256 !== importReview.candidate_sha256 || released.project_ref !== PROJECT_REF
      || !released.preserved || released.guard_count !== 22) throw new Error("Verified import/release evidence required");
    const privateDirectory = resolve(directory, prefix);
    await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
    const capture = async () => inventoryFromRows(await query(inventorySql(), privateDirectory));
    const maintenance = await maintenanceCheck();
    const before = await capture();
    assertImportedState(withCurrentFlowCount(importReview.inventory, before), before, payload);
    assertFrozenBaseline(released.inventory, before);
    const verifyContent = async () => {
      const content = (await query(contentVerificationSql(importReview.inventory, payload), privateDirectory))[0]?.imported;
      if (!content?.content_verified) throw new Error("Exact imported content verification failed");
      return content;
    };
    const content = await verifyContent();
    if (command === "prepare") {
      await assertAbsent(resolve(privateDirectory, "review.json"));
      const bundle = reversalBundle(before, payload);
      await save(`${prefix}/candidate.sql`, bundle.candidate);
      await save(`${prefix}/validation.sql`, bundle.validation);
      await save(`${prefix}/review.json`, { project_ref: PROJECT_REF, prepared_at: new Date().toISOString(),
        payload_sha256: digest(payload), inventory_sha256: digest(preservedState(before)),
        candidate_sha256: bundle.candidate_sha256, validation_sha256: bundle.validation_sha256,
        import_candidate_sha256: imported.candidate_sha256, release_verified_at: released.verified_at,
        maintenance, content, inventory: before, jobs: before.cron,
        flow_state_count_at_release: released.inventory.auth_counts.flow_state,
        flow_state_count_at_review: before.auth_counts.flow_state,
        scope: "Remove 22 guards and their private function only; both jobs remain paused; no public launch" });
      console.log(JSON.stringify({ prepared: true, candidate_sha256: bundle.candidate_sha256,
        validation_sha256: bundle.validation_sha256, guarded_tables: 22, jobs_paused: 2,
        public_maintenance: true, committed: false }));
      return;
    }
    const review = JSON.parse(await load(`${prefix}/review.json`));
    const bundle = { candidate: await load(`${prefix}/candidate.sql`), validation: await load(`${prefix}/validation.sql`),
      candidate_sha256: review.candidate_sha256, validation_sha256: review.validation_sha256 };
    assertPreserved(review.inventory, before);
    assertPreparedBundle(bundle, review, before, payload);
    if (review.import_candidate_sha256 !== imported.candidate_sha256 || review.release_verified_at !== released.verified_at) {
      throw new Error("Preparation belongs to different import/release evidence");
    }
    await assertAbsent(resolve(privateDirectory, "attempt.json"));
    await save(`${prefix}/attempt.json`, { project_ref: PROJECT_REF, started_at: new Date().toISOString(),
      candidate_sha256: bundle.candidate_sha256, validation_sha256: bundle.validation_sha256, committed: false });
    let rows;
    let queryFailure;
    try { rows = await query(bundle.validation, privateDirectory); }
    catch (error) { queryFailure = error; }
    // Even a lost acknowledgement needs fresh independent state verification; never retry automatically.
    const after = await capture();
    await save(`${prefix}/post-rollback.json`, { captured_at: new Date().toISOString(), inventory: after });
    assertPreserved(before, after);
    await verifyContent();
    const finalMaintenance = await maintenanceCheck();
    if (queryFailure) throw queryFailure;
    const result = rows?.[0]?.reversal;
    if (rows.length !== 1 || !result?.guards_removed || !result.content_verified || !result.unrelated_state_verified
      || !result.jobs_paused || result.zero_row_role_probes !== 2) throw new Error("Rollback evidence incomplete");
    const evidence = { project_ref: PROJECT_REF, completed_at: new Date().toISOString(), committed: false,
      candidate_sha256: bundle.candidate_sha256, validation_sha256: bundle.validation_sha256,
      rollback_verified: true, preserved: true, result, maintenance: finalMaintenance, inventory: after };
    await save(`${prefix}/evidence.json`, evidence);
    console.log(JSON.stringify({ ...evidence, inventory: undefined }));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
