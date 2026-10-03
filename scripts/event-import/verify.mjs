import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSouthSummityImport } from "../../lib/events/south-summity.ts";
import { directory, load, save, withOperationLock, maintenanceCheck } from "./run.mjs";
import { inventorySql, PROJECT_REF } from "./inventory.mjs";
import { inventoryFromRows } from "./cli-response.mjs";
import { query } from "./operator.mjs";
import { assertPreserved, digest } from "./rehearsal.mjs";
import { assertImportedState, contentVerificationSql } from "./commit-sql.mjs";

export function parseArguments(args) {
  if (args.length !== 4 || args[0] !== "--project-ref" || args[1] !== PROJECT_REF
    || args[2] !== "--label" || !["before-release", "after-release"].includes(args[3])) {
    throw new Error(`Use --project-ref ${PROJECT_REF} --label before-release|after-release`);
  }
  return args[3];
}

export async function main(args = process.argv.slice(2)) {
  const label = parseArguments(args);
  return withOperationLock(async () => {
    const payload = prepareSouthSummityImport();
    const evidence = JSON.parse(await load("commit/execution-evidence.json"));
    const review = JSON.parse(await load("commit/review.json"));
    const previous = JSON.parse(await load("commit/post-import.json"));
    if (!evidence.committed || evidence.project_ref !== PROJECT_REF || evidence.payload_sha256 !== digest(payload)
      || evidence.candidate_sha256 !== review.candidate_sha256) throw new Error("Verified import evidence does not match this release");
    const privateDirectory = resolve(directory, "release");
    await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
    const maintenance = await maintenanceCheck();
    const inventory = inventoryFromRows(await query(inventorySql(), privateDirectory));
    assertImportedState(review.inventory, inventory, payload);
    assertPreserved(previous.inventory, inventory);
    if (label === "after-release") {
      const before = JSON.parse(await load("release/before-release.json"));
      assertPreserved(before.inventory, inventory);
    }
    const content = (await query(contentVerificationSql(review.inventory, payload), privateDirectory))?.[0]?.imported;
    if (!content?.content_verified || content.events !== 1 || content.sessions !== 15 || content.published_sessions !== 15
      || content.speakers !== 5 || content.links !== 5 || content.event_date_pht !== "2026-10-07"
      || content.starts_pht !== "09:30" || content.ends_pht !== "17:30") throw new Error("Imported content verification failed");
    const result = { label, project_ref: PROJECT_REF, verified_at: new Date().toISOString(), content,
      preserved: true, guard_count: inventory.guards.length, maintenance };
    await save(`release/${label}.json`, { ...result, inventory });
    console.log(JSON.stringify(result, null, 2));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
