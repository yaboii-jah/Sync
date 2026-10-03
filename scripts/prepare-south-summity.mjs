import { readFile, mkdir, writeFile } from "node:fs/promises";
import { prepareSouthSummityImport, SOUTH_SUMMITY_PROGRAM } from "../lib/events/south-summity.ts";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check")) {
  throw new Error("Usage: node --experimental-strip-types scripts/prepare-south-summity.mjs [--check]");
}

const payload = prepareSouthSummityImport();
const directory = new URL("../docs/event-import/", import.meta.url);
const rows = SOUTH_SUMMITY_PROGRAM.map((entry) => `| ${entry.start}–${entry.end} | ${entry.title} |`).join("\n");
const review = `# South Summity program import review

Source package for the event import. This generator does not read production or infer execution status; see \`docs/event-import/production-import-review.md\` and the progress tracker for the verified operation record. Regenerate the source review with:

\`node --experimental-strip-types scripts/prepare-south-summity.mjs\`

Use \`--check\` to verify that these review artifacts match the source without writing files. This command never reads credentials, opens a database connection, or executes SQL.

## Event

- Name: ${payload.event.name}
- Date: October 7, 2026
- Venue: ${payload.event.venue}
- Timezone: Asia/Manila (UTC+08:00), matching the existing app
- Hours: 09:30–17:30 PHT (${payload.event.starts_at}–${payload.event.ends_at})
- Theme/heading: event name provisionally; the owner authorized using the confirmed event name for this import; a later official tagline can replace it through a scoped update. A blank theme would violate the existing database constraint.

## Supplied program

| Time (PHT, October 7) | Activity |
| --- | --- |
${rows}

## Legacy import payload

\`south-summity.json\` contains one typed \`events\` insert, 15 typed \`sessions\` inserts, five \`speakers_sponsors\` placeholders, and five \`session_speakers\` links. \`review\` and \`sessionKeys\` are preparation metadata, not database columns. The stable session keys support later speaker assignments without relying on row order. IDs use a new event namespace; no historical IDs or seed fixtures are reused.

All sessions are intended for attendee publication, with initial upcoming/not-started status. Status must be recomputed from the execution time during the reviewed operator import. Descriptions, per-session rooms, capacities, and seat claims have not been supplied: descriptions/rooms/capacities remain null, seat counts zero, and override/actual-time fields empty. The approved placeholders identify the opening keynote, Talks #1/#2/#3, and unconfirmed panel lineup. They have no photo, organization, bio, or LinkedIn URL; the existing portrait fallback needs no new assets. The panel placeholder does not establish a headcount. No attendee, administrator, sponsor, quick-link, notification, or Auth rows are included. Sponsor Spotlight is an activity title, not an invented directory entry. The raffle is a program entry; it does not create a new raffle workflow.

## Before an operator import

- The provisional event-name heading and supplied transcription were authorized for this import. Replace the approved placeholder records with confirmed speaker content when available; the existing \`public/speakers\` portraits belong to the previous event and must not be reused by assumption.
- Review retained administrators, registration rules, enabled features, directory content, and links. Maintenance stays active; do not lift the freeze just to import.
- Recheck the actual linked production schema, empty event/program relations, existing triggers, retained-admin state, all 22 guards, and the two paused jobs using the event-import inventory checks; maintenance reversal tooling stays in the main checkout. Do not assume source types establish current live state.
- The separate \`scripts/event-import/run.mjs\` operator tool supports only \`prepare\` and \`rehearse\` with explicit \`--project-ref mygybolhwoeckrgczclm\`. It saves private inventory-bound SQL/evidence in the ignored, access-restricted \`.production-maintenance/event-import/\` directory. Rehearsal verifies all inserted content and untouched state, ends with ROLLBACK, and rechecks a fresh production inventory. Import the event before its linked sessions, with stable IDs; refuse conflicting/nonempty state instead of deleting or blindly upserting. Do not replay legacy seed migrations or tenant migrations. The completed old-data cleanup must not be rerun.
- After separately reviewed execution, verify one event, 15 sessions, five placeholder entries, five links, foreign keys, timezone display, and intended publication. Preserve admin/Auth rows, guards, and paused jobs. Deployment, fresh sign-in, client-write acceptance, and controlled reopening remain separate rollout steps.

Actual live rehearsal evidence and verification time are recorded in \`docs/progress-tracker.md\`; the generated content review does not certify any production commit. Operator commands require Node.js 22.6 or newer with type stripping.

The local content generator has no database execution path. The original operator runner remains rollback-only. The separate \`scripts/event-import/commit.mjs\` runner prepares and validates an exact committing candidate, then requires its explicit project and SHA-256 for one-use execution. It records an attempt before sending SQL and refuses repeats. The completed production import must not be rerun; source preparation metadata is not a live database status report.
`;

const artifacts = [
  { name: "south-summity.json", content: `${JSON.stringify(payload, null, 2)}\n` },
  { name: "south-summity-review.md", content: review },
];
if (!args.includes("--check")) await mkdir(directory, { recursive: true });
for (const artifact of artifacts) {
  const target = new URL(artifact.name, directory);
  if (args.includes("--check")) {
    if (await readFile(target, "utf8") !== artifact.content) {
      throw new Error(`Stale review artifact: ${artifact.name}`);
    }
  } else {
    await writeFile(target, artifact.content, "utf8");
  }
}
console.log(`${args.includes("--check") ? "Verified" : "Prepared"}: one event, ${payload.sessions.length} sessions, ${payload.speakers.length} placeholders, ${payload.speakerLinks.length} links. No database connection or import performed by this command.`);
