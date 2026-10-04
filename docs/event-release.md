# South Summity production release

## October 4 unannounced production testing

The owner approved deploying the reviewed local event changes and disabling website maintenance for normal Google sign-in, with both existing background jobs restored. Production testing is open to anyone who finds the link; the owner will share it privately and defer marketing until testing and revisions are complete. This supersedes the maintenance-only release contract below for this new operation.

Release source includes app appearance, Sue Photo Booth and its More entry, active venue mapping, confirmed speaker assets/directory, and existing-user admin access. The database is already unfrozen and the three admin-access migrations are applied. Do not repeat cleanup, import, card repair, guard reversal, or migration application. The two retained accounts are protected; another tester must sign in before an existing admin can promote them.

Run tests, lint, TypeScript, build, and clean source/upload checks. Capture a fresh database inventory; local client use may legitimately refresh Auth tokens, read state and push subscriptions, so use this fresh checkpoint rather than the old frozen inventory. Confirm preserved schema/security, program, protected accounts and existing cron definitions. Temporarily disable automatic production-domain assignment before publishing `org-event`. Set Production `MAINTENANCE_MODE=false`, preserving the legacy flag, Supabase project and site origin. Export the exact reviewed commit and stage it with `--prod --skip-domain`; verify before explicit promotion. Restore the prior domain-assignment setting after outstanding deployments finish.

`node scripts/release-testing-smoke.mjs --url <origin> [--vercel]` checks the signed-out landing, login/callback redirects, protected route redirects and byte identity of the new assets. It performs no attendee/admin mutation. Keep the separate maintenance verifier for recovery. Generated deployment URLs retain Vercel protection and do not need a new OAuth callback; verify real Google sessions on the existing production origin after promotion.

Restore only the two verified jobs with `cron.alter_job(active := true)` after production health checks pass; preserve commands and minute schedules, require an empty retry backlog, and observe two successful cycles. Do not send test announcements automatically. Record real admin/attendee and physical-device acceptance as pending until tested.

Recovery target is `dpl_8wbFx1tA5p7oUa36KTjhjaPoejdy`, the current maintenance build. Before promotion, retain current routing on failure. After promotion, use `vercel rollback` to that target, restore Production `MAINTENANCE_MODE=true`, pause/drain jobs and reverify maintenance. Preserve new tester data. Execution evidence belongs in the protected ignored `testing-release-20261004` directory; update this record and the progress tracker after acceptance.

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
3. Preserve Production `MAINTENANCE_MODE=true` and `MULTI_TENANT_PLATFORM_ENABLED=false`. Confirm the production Supabase hostname. Add `NEXT_PUBLIC_SITE_URL=https://sync.aws-scd.cloud`, absent before this release. A not-yet-published branch cannot receive branch-specific Preview variables: temporarily pause automatic Preview deployments, publish the branch, set its Preview maintenance/legacy flags, and restore the prior Preview setting. Do not copy production secrets to Preview.
4. Push `org-event`, export the exact committed source into an isolated temporary directory, and inspect the upload file list. Deploy that source to the existing project with Production configuration, explicit source metadata, and `--prod --skip-domain`. Never upload the working tree's local environment or private maintenance directory.
5. Verify the staged Ready deployment with `node scripts/release-maintenance-smoke.mjs --url <deployment-origin> --vercel`. Vercel protects generated deployment URLs; this transport uses the authenticated CLI without disabling protection or writing credentials into the report. Review narrow/desktop maintenance and service-worker navigation. For public-domain verification, omit `--vercel` to test actual public access.
6. Vercel refuses a Production branch while it has branch-specific Preview variables. Temporarily pause automatic Preview deployments again, remove only the two temporary `org-event` Preview flags, change the Production branch to `org-event`, and restore the previous Preview setting. Production flags now govern that branch. Promote the verified deployment, verify both public domains and actual routing, and confirm automatic domain assignment is enabled.
7. Run the same read-only import verification with `--label after-release`; record source/deployment IDs, timestamps, settings, HTTP and database evidence here and in the progress tracker.

The HTTP command checks GET/HEAD maintenance, an inert POST probe, the normal maintenance page, and byte identity of required fonts, logo, icons, frames, manifest, and service worker. Text assets normalize CRLF/LF for comparison. It reports sanitized results and fails on redirects, other statuses, cacheable responses, missing content, or changed assets. No attendee/admin write is used for release testing.

## Recovery

Before promotion, leave public routing on the recorded maintenance target if any check fails. After promotion, if acceptance fails, restore the recorded deployment with `vercel promote dpl_J9UwjXbAKnBQCUD3tbj79PBM55mu --scope jahmell-dorias-projects`, restore production branch `main`, retain `MAINTENANCE_MODE=true`, and recheck both domains. Restore automatic domain assignment if staging changed it. Retain private failure evidence; do not reverse database content or replay the import.

## Execution status

The approved release is deployed and accepted under maintenance.

- Runtime source: `1d359c23b62e257e8643e32aceadfdd3ce40ab3b`, committed and published on `org-event`. The main checkout and tenant branch were not changed.
- Clean Git export SHA-256: `66c2e1e6be9664d3bd72b2daf22147bff995d59ca83ea5a05fc186ef6fda1373`. Upload inspection confirmed no local environment, private maintenance/archive evidence, or credentials in the source upload.
- Ready deployment: `dpl_8wbFx1tA5p7oUa36KTjhjaPoejdy`, `https://sync-nbpe9v8y1-jahmell-dorias-projects.vercel.app`. Source metadata was checked before explicit promotion.
- Final Production branch is `org-event`, automatic custom-domain assignment is enabled, and the original Preview setting (`null`, enabled) is restored. The temporary branch-specific Preview variables are removed. Both Production flags retain their prior exact values; the production database hostname was verified. `NEXT_PUBLIC_SITE_URL` is the existing public custom-domain origin.
- Staged authenticated HTTP acceptance passed all **32** checks at **07:36:13 UTC / 15:36:13 Asia/Manila**. Staged browser checks passed at 320/1280 widths for both maintenance presentations, loaded fonts, neutral light styling, no overflow, and an active service worker returning actual maintenance 503. Screenshots were visually reviewed; no runtime exceptions or Supabase requests occurred.
- Both actual public domains resolve to this deployment, independently checked through domain inspection and project routing at **07:45:44 UTC / 15:45:44 Asia/Manila**. Public HTTP/asset acceptance passed **32 checks per domain** at **07:44:50–52 UTC / 15:44:50–52 Asia/Manila**. Public browser checks passed the same mobile/desktop and service-worker acceptance with no exceptions or Supabase requests.
- Read-only database comparisons passed before release at **07:10:48 UTC** and after release at **07:44:59 UTC / 15:44:59 Asia/Manila**. The exact event/program/placeholders/links, five admins/profiles/accounts, ten identities, schema/security/Auth metadata, all 22 guards, both paused/drained jobs, empty Storage, and three exact sequence states are preserved.
- Verification passed: **119 tests**, lint without warnings, TypeScript, production build, deterministic prepared-package check, upload review, and diff checks. No cleanup/import replay, migration, unfreeze, job resumption, Edge Function deployment, or fresh attendee/admin write occurred.

The deployed/published runtime remains the source commit above. This final handoff and current-state documentation update is local and has not been pushed as an additional automatic production build.

Private database checks, HTTP/browser reports, final project routing, and checksummed release evidence remain under `.production-maintenance/event-import/release/`. The [completed import record](event-import/production-import-review.md) remains authoritative for the one-use import. [Controlled guard reversal](event-reopening.md) subsequently committed and was independently verified at 08:33:28 UTC on October 3. The database freeze is removed for local Google/admin/attendee acceptance; public website maintenance and both paused jobs remain. These older release inventories/verifier expect the frozen state and must not be used as the current reopening verification. Approved job restoration and public launch remain later units.
