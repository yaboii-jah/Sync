# South Summity production import

The owner requested implementation of the actual production event import after the successful rollback rehearsal. Target: `mygybolhwoeckrgczclm`. **The import is committed and freshly verified. Do not execute it again.**

## Reviewed content

- One event: AWS Student Community Day South Summity 2026, October 7, 2026, 09:30–17:30 Asia/Manila at Biñan People’s Center Auditorium. The event name is the provisional theme heading.
- All 15 supplied activities, with their exact titles and time slots; intended publication for all sessions.
- Five clearly labeled “To be announced” placeholders: opening keynote, Talks #1/#2/#3, and the unconfirmed panel lineup. Four speaker roles and one panelist role; five session links. No panel headcount or personal details invented.
- Missing descriptions, individual rooms, capacities, portraits, biographies, organizations, and LinkedIn URLs remain empty. Seat counts remain zero. No sponsors or quick links are created.

Source content: [prepared payload](south-summity.json) and [program review](south-summity-review.md). Preparation metadata in that payload is not a live database status report.

## Candidate and preservation

Candidate SQL SHA-256: `ec45006869e186f483632013e3c16bd98426592705e0497997364a6c2f6d2cf5`.

The candidate and its validation use the same transaction body; only the terminal COMMIT/ROLLBACK differs. The original rehearsal body checksum is preserved. Inserts explicitly supply every live target column, with event/session statuses calculated at execution time. Inside bounded locks, the transaction verifies the empty baseline, exact inserted rows in both directions, and preservation of all unrelated inventory fields/counts before completion.

Five existing admins/accounts/profiles and ten identities are retained. All 22 guards, both paused jobs, schema/grants/policies/functions/triggers, Storage state, and all three sequence states are preserved. No deletion, cleanup replay, seed/tenant migration, notification, deployment, unfreeze, job resumption, or Git commit/push is included.

## Execution contract

The separate committing runner supports preparation and rollback validation. Execution requires the explicit project plus this exact SQL checksum and a successful checksum-bound validation of the candidate body. A durable exclusive attempt marker is created before sending SQL; any further attempt is refused. After execution, fresh read-only checks verify the imported columns, relationships, 15 published sessions, PHT date/hours, and unrelated state. Missing acknowledgments are investigated through reads, without retrying the import.

Private candidate/validation SQL, reviews, attempts, acknowledgments, and evidence remain under the ignored, access-restricted `.production-maintenance/event-import/commit/` directory. See the [progress tracker](../progress-tracker.md) for the ongoing rollout state.

## Verified execution

- Exact committing-body rollback validation passed at **2026-10-03 06:50:58 UTC / 14:50:58 Asia/Manila**, with production baseline preservation.
- The one-use committing execution was acknowledged at **06:52:14 UTC / 14:52:14 Asia/Manila**. Fresh verification passed at **06:52:22 UTC / 14:52:22 Asia/Manila**; the candidate SHA-256 above is unchanged.
- Persisted rows: one event, 15 published sessions, five placeholders, five links. Every supplied target column and relationship matched the source. PHT date/hours verified as October 7, 09:30–17:30.
- Retained counts: five Auth users, ten identities, five profiles, five admin memberships. All unrelated hashes/counts, schema/security, 22 guards, two paused/drained jobs, Storage state, and three exact sequence states matched the preflight.
- Both production domains still returned no-store HTTP 503 after execution. No deployment, unfreeze, job resumption, migration/seed replay, Git commit/push, or fresh-client Auth acceptance occurred. Login remains blocked by the independent freeze.

The execution-attempt marker remains in place and refuses any repeat. Subsequent speaker replacements require a separately scoped operator update; do not rerun this insert or the completed old-data cleanup. At the time of the original import, event-branch rollout and reopening were the next separate units.

The separately scoped confirmed-speaker update was completed on 2026-10-03. See [South Summity speaker roster](south-summity-speaker-roster.md) for the confirmed lineup, checksummed operator execution, and current live state. The import candidate and its one-use marker remain unchanged.
