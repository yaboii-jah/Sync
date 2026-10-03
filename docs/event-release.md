# South Summity production release

## Release contract

The owner approved committing and publishing `org-event`, deploying it to the existing Vercel `jahmell-dorias-projects/sync` project, and moving the production domains after staged verification. This release retains website maintenance, the independent database/Auth freeze, and paused jobs. It does not repeat the completed import or cleanup, apply migrations, or reopen the app.

The branch starts at legacy `274aa8c`, with the committed maintenance contract from `bafe7ed` ported and verified separately. Do not merge the tenant implementation from `main`. The existing `main` deployment-nudge workflow is retained; this release uses an explicit CLI Production deployment and does not depend on that workflow.

## Recorded pre-release target

- Vercel project: `prj_zV0Aybl2b9KoHJ3BZPuU1BZIIOzV`, team `team_RaPLkKno5WawTO35tKiHBCr9`.
- Production branch: `main`; Node.js: `24.x`; automatic custom-domain assignment: enabled.
- Previous deployment: `dpl_J9UwjXbAKnBQCUD3tbj79PBM55mu`, `https://sync-qxzq3xm9f-jahmell-dorias-projects.vercel.app`.
- Previous source: `b315ed56c6d17dc06eebd90f541db48e38f51289`.
- Public domains: `https://sync.aws-scd.cloud` and `https://sync-orpin-nine.vercel.app`, both freshly verified as no-store maintenance HTTP 503 during release planning.

These identifiers are the reviewed starting point. Refresh routing and configuration before changing production; a different live target requires reconciliation first.

## Configuration and procedure

1. Run tests, lint, TypeScript, build, deterministic source-package and diff checks. Commit only the reviewed release files. Keep credentials, private archive/import records, caches, and unrelated changes excluded.
2. Refresh imported content and preservation through `node --experimental-strip-types scripts/event-import/verify.mjs --project-ref mygybolhwoeckrgczclm --label before-release`. This command only queries the database and stores protected evidence; it has no committing import, unfreeze, or job path.
3. Preserve Production `MAINTENANCE_MODE=true` and `MULTI_TENANT_PLATFORM_ENABLED=false`. Confirm the production Supabase hostname. Add `NEXT_PUBLIC_SITE_URL=https://sync.aws-scd.cloud`, absent before this release. Set Preview `MAINTENANCE_MODE=true` specifically for `org-event` before publishing it. Do not copy production secrets to Preview.
4. Push `org-event`, export the exact committed source into an isolated temporary directory, and inspect the upload file list. Deploy that source to the existing project with Production configuration, explicit source metadata, and `--prod --skip-domain`. Never upload the working tree's local environment or private maintenance directory.
5. Verify the staged Ready deployment with `node scripts/release-maintenance-smoke.mjs --url <deployment-origin> --vercel`. Vercel protects generated deployment URLs; this transport uses the authenticated CLI without disabling protection or writing credentials into the report. Review narrow/desktop maintenance and service-worker navigation. For public-domain verification, omit `--vercel` to test actual public access.
6. Change Vercel's production branch to `org-event`, promote the verified deployment, and verify both public domains and actual routing. Confirm automatic domain assignment is enabled again.
7. Run the same read-only import verification with `--label after-release`; record source/deployment IDs, timestamps, settings, HTTP and database evidence here and in the progress tracker.

The HTTP command checks GET/HEAD maintenance, an inert POST probe, the normal maintenance page, and byte identity of required fonts, logo, icons, frames, manifest, and service worker. Text assets normalize CRLF/LF for comparison. It reports sanitized results and fails on redirects, other statuses, cacheable responses, missing content, or changed assets. No attendee/admin write is used for release testing.

## Recovery

Before promotion, leave public routing on the recorded maintenance target if any check fails. After promotion, if acceptance fails, restore the recorded deployment with `vercel promote dpl_J9UwjXbAKnBQCUD3tbj79PBM55mu --scope jahmell-dorias-projects`, restore production branch `main`, retain `MAINTENANCE_MODE=true`, and recheck both domains. Restore automatic domain assignment if staging changed it. Retain private failure evidence; do not reverse database content or replay the import.

## Execution status

Release preparation is in progress. Source commit, staged build, production-branch change, promotion, and post-release acceptance have not yet been recorded.

Private database checks remain under `.production-maintenance/event-import/release/`. The [completed import record](event-import/production-import-review.md) remains authoritative for the one-use import. Fresh Google sign-in, attendee/admin writes, approved job restoration, and disabling website maintenance belong to a separate controlled reopening unit.
