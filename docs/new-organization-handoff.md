# New organization event: implementation plan and handoff

Last updated: 2026-10-02 (Asia/Manila). This document preserves the agreed operational plan and session state for another Codex account. Recheck the working tree and live services before continuing; recorded remote state is not a live guarantee.

## Start here

Read `AGENTS.md`, then the six context documents in its required order, followed by this document and `docs/app-guide.md`. Load the repository Supabase skill for Supabase work and the Postgres skill before writing SQL, changing database objects, or restoring data. Read the installed Next.js guides before changing framework code.

The active product documents describe the eventual multi-tenant platform. This temporary event operation deliberately uses the legacy routes with `MULTI_TENANT_PLATFORM_ENABLED=false`. It does not change the approved platform direction.

### Goal and agreed decisions

- Run a new organization's event using the existing pre-multi-tenant Sync experience and existing production Supabase project.
- Archive the old AWS event data, put the website in maintenance, clear approved old data, then populate the new event and reopen.
- No new hosted database or local Supabase/Docker setup is required for this temporary event workflow.
- Keep maintenance support on `main`. Create a separate organization event branch from the committed maintenance baseline for event-specific changes; point Vercel production at that branch during the event.
- Keep `feat/multi-tenant-foundation` separate. Do not switch to it, merge it, apply its migrations remotely, or reset its local database during this work.
- The user says that branch already has local Supabase/Docker and a copy of the pre-multi-tenant database. Its completeness and current progress have not been audited for this handoff.
- The old archive does not have to be restored into the running app. Preserve it for historical reference and recovery.
- After the organization's event, archive its data and return production to maintenance on `main`. A later multi-tenant launch is a separate reviewed cutover.

Branch isolation protects code history. It does not isolate databases: any branch using production credentials can affect the same production data. Preview deployments and local scripts must not write to production implicitly.

## Current state

### Repository and local work

- Workspace: `C:\Users\Jahmell Dorias\Desktop\Projects\sync`.
- Current branch before maintenance release: `main`, at `8507dc9` (`docs: add concise developer handoff guide`). The remote tip was freshly verified on 2026-10-02 and matches this revision.
- The user reported that `/home` and `/alerts` work after the earlier compatibility fix. Reverify them before reopening for the new event.
- Maintenance code is implemented locally, uncommitted and undeployed. No organization branch has been created for this plan.
- No production environment changes, deployment changes, or destructive database cleanup have been performed in this maintenance/handoff unit.
- Verified on 2026-10-02: Vercel project `jahmell-dorias-projects/sync` (`prj_zV0Aybl2b9KoHJ3BZPuU1BZIIOzV`), team `team_RaPLkKno5WawTO35tKiHBCr9`, production branch `main`, public domain `https://sync.aws-scd.cloud`. Vercel and Git identities are `yaboii-jah`.
- Pre-release deployment: `dpl_7w3CNzgciypp9yWwtTAtSRKnyJGj`, URL `https://sync-n7zx5vcmx-jahmell-dorias-projects.vercel.app`, source `8507dc92c1fd18f3b1e42a56d660e2bbe8f724cd`. Other aliases: `sync-orpin-nine.vercel.app`, `sync-jahmell-dorias-projects.vercel.app`, `sync-git-main-jahmell-dorias-projects.vercel.app`.
- Production Supabase hostname matches `mygybolhwoeckrgczclm.supabase.co`. Neither maintenance nor multi-tenant flag is configured yet; both default off. Signed-out baseline: `/` 200, `/home` and `/alerts` 307.

Maintenance files to preserve and commit with their documentation:

| File | Purpose |
| --- | --- |
| `.env.example` | Default `MAINTENANCE_MODE=false` |
| `proxy.ts` | Early maintenance gate, including API and auth paths |
| `lib/maintenance.ts` | Exact `true` flag parsing, HTTP 503 responses, no-cache headers |
| `lib/maintenance.test.ts` | Focused gate and matcher tests |
| `public/maintenance-assets/` | Existing Geist/Perandory font copies for standalone HTTP 503 HTML |
| `app/maintenance/page.tsx` | Neutral Sync maintenance page |
| `docs/app-guide.md` | Deployment instructions and database boundary |
| `docs/progress-tracker.md` | Implementation status |
| `docs/new-organization-handoff.md` | This full plan and transfer state |

Preserve unrelated pre-existing untracked work: `docs/issues-suggestions-questions.md` and `supabase/snippets/`. Do not stage, delete, or overwrite it as part of maintenance delivery.

### Maintenance behavior and verification

- Only the exact server-side value `MAINTENANCE_MODE=true` enables the gate. A new deployment must consume the changed environment value.
- Matched GET requests receive standalone maintenance HTML directly with HTTP 503 and no-cache headers; HEAD receives an empty 503. Other matched methods receive plain-text 503 before the application handler runs. `/maintenance` shares the same wording but is a normal page response. The standalone document retains Sync's palette and Geist/Perandory using public font assets.
- The first production-mode local HTTP check exposed that page rewrites reset the proposed 503 to 200 in installed Next.js. The release fixes this by returning a direct Proxy response; unit response status alone was insufficient evidence.
- `/maintenance` itself remains accessible and returns the normal page response; static assets are excluded from the gate.
- The gate runs before Supabase session handling. With maintenance disabled, API/auth paths retain their previous bypass of navigation auth checks.
- **This is a website gate, not a database write lock. Existing tabs can call Supabase directly.** Auth, service-role jobs, scheduled tasks, Edge Functions, Realtime clients, and outside integrations need separate review before deletion.
- Previously completed checks: 4 focused maintenance tests; full suite of 76 tests across 14 files; lint with 9 existing warnings and no errors; production build; TypeScript check; `git diff --check`.
- Release preparation on 2026-10-02: all 104 unit tests across 14 files pass, including 32 maintenance checks. Actual matcher uses the installed `unstable_doesMiddlewareMatch` export because the guide's Proxy-named helper is unavailable. Lint has the same 9 existing warnings/no errors; build, TypeScript, and diff checks pass. The existing `metadataBase` warning remains.
- Built-app local HTTP checks pass: `/`, `/home`, `/alerts`, `/admin`, `/auth/callback`, and a harmless API probe return maintenance HTML with final HTTP 503 and no-cache headers; HEAD returns empty 503 and harmless POST plain-text 503. `/maintenance` and 22 required assets return 200.
- Hidden headless Edge verifies 320/1280px with no overflow, Geist/Perandory loading, and service-worker-controlled navigation; screenshots were visually reviewed. Synthetic cookie probes do not count as real signed-in verification. Existing installed-PWA and real authenticated-session checks remain pending.
- Live production rollout and HTTP smoke verification remain pending for this release.
- Stale generated `.next/dev` types from the other branch initially failed type/build checks. Only that verified local generated cache was removed, then checks passed. No tracked source or user data was removed.

### Archive confirmation

The user repeatedly confirmed that all archive files were saved to their personal Drive. Cloud file contents were not independently inspected. The successful local archive is:

```text
C:\Users\Jahmell Dorias\Documents\Sync Production Archive - 2026-10-01\
  sync-production-2026-10-01.dump.age
  manifest.txt
  sync-production-2026-10-01.dump.age.sha256
```

- Encrypted size: 2,977,197 bytes.
- SHA-256: `f5248ef34d4b9e9e227e0400940986d7606dfd15885fbb2a62a8223a409c2999`.
- Dump table-of-contents inspection included `auth.users` and `public.profiles` data. Encryption/decryption roundtrip matched the plaintext checksum; encrypted-file checksum matched its manifest and checksum file. A full restore into a disposable database was not performed.
- Temporary plaintext dumps were removed. An earlier `2026-09-30` archive folder came from a failed attempt; use the successful archive above.
- At archive time, `storage.objects` had zero rows. Database dumps do not contain Storage object bytes; check Storage again before cleanup if data has changed.
- Keep the decryption passphrase separately in secure storage. Do not put passwords, secret environment values, or the passphrase in this repository or a new chat.
- A previously pasted database password was exposed; the user confirmed it was rotated. Obtain any needed current credentials through a secure local input flow.

Production project reference: `mygybolhwoeckrgczclm`. The user supplied the session pooler host `aws-0-ap-southeast-1.pooler.supabase.com`, port `5432`, database `postgres`, user `postgres.mygybolhwoeckrgczclm`. These identifiers are not credentials. The direct database host was unreachable over IPv6 from this PC; the session pooler worked.

Historical counts at archive time, for comparison only:

| Domain | Rows |
| --- | ---: |
| `auth.users` / `public.profiles` | 296 each |
| `public.events` | 1 |
| `public.sessions` | 20 |
| `public.speakers_sponsors` | 12 |
| `public.notifications` | 8 |
| `public.notification_recipients` | 937 |
| `public.networking_cards` | 296 |
| `public.networking_scan_history` | 1,163 |
| `public.admin_users` | 5 |
| `storage.objects` | 0 |

## Full implementation plan

### 1. Publish and activate maintenance on main

1. Inspect branch, diff, remote status, and deployment configuration. Preserve existing uncommitted work; avoid a blind pull into the dirty tree.
2. Review and commit only the maintenance implementation and its documentation on `main`. Preserve the commit ID as the branch baseline.
3. Verify the target Vercel project uses the intended production Supabase project. Set Production `MAINTENANCE_MODE=true`; retain `MULTI_TENANT_PLATFORM_ENABLED=false`.
4. Push the reviewed `main` commit and verify a new production deployment consumed the flag. Confirm the deployment SHA and domain; a successful Git push alone is insufficient.
5. Check `/`, `/home`, `/alerts`, and `/admin` as signed-out and signed-in users: maintenance content, HTTP 503, and no-cache headers. Check an applicable app POST/API request returns 503 without a database mutation; `/maintenance` and required static assets remain usable.

Acceptance: the public production domain is in maintenance. Do not start cleanup solely because local tests passed.

### 2. Freeze writes and prepare the cleanup review

1. Perform a read-only inventory of the actual production schema, tables, foreign keys, triggers, RPCs, grants/policies, Auth identities, Storage, background jobs, and external writers. Compare with `docs/schema-inventory.md`; production can differ from local migration history.
2. Prepare a reversible database write safeguard covering browser Data API access and callable mutation RPCs, including functions that bypass RLS. Pause reviewed background writers. Record original permissions/settings and the exact reversal procedure.
3. Choose the concrete safeguard only after inspecting those paths. It is not implemented or selected yet. A UI flag, hiding buttons, or ending sessions alone does not satisfy this gate.
4. Verify attempted writes from an already-authenticated client are denied and privileged/background writers are paused. Maintain a narrowly controlled operator path for the approved cleanup/import.
5. Compare current data with the archive. If there are later records, make and verify a final encrypted archive after writes stop, before deletion. Update the archive manifest and this handoff.
6. Prepare an explicit delete/retain inventory with table counts, dependencies, Auth deletion handling, Storage handling, expected effects, and recovery steps. Review it with the user before executing destructive work.

Acceptance: writes are demonstrably controlled, archive coverage is current, and the user has approved the concrete cleanup inventory. If any gate fails, keep maintenance active and stop destructive work.

### 3. Clear approved old event data

- Target old AWS event records and approved associated accounts, sessions, speakers/sponsors, notifications and recipients, read state, preferences, push subscriptions, networking cards/scans, bookmarks, seat reservations, feedback, raffle state, and any other discovered event data.
- Treat that list as requested domains, not an executable table list. Actual table names, relationships, and deletion order must come from the live inventory.
- Retain schema, migrations, policies, functions, and configuration needed by the legacy app. Do not drop/rebuild production or replay the multi-tenant migration chain.
- Retain or provision a confirmed operator/admin access path. Do not blindly delete every Auth account or assume application-table deletion removes Supabase Auth identities.
- Do not delete, integrate, or change undocumented remote `merch_*` objects without a separate reviewed decision.
- Use a reviewed bounded cleanup procedure with transaction/rollback where supported. Auth/API/Storage operations may not share a SQL transaction; record partial completion and make retries safe.
- Verify expected remaining counts, foreign-key integrity, no old personal/event content in active views, and operator access before proceeding.

Acceptance: only approved old data has been removed; schema remains compatible and new event setup can proceed. There is no approved executable cleanup SQL yet.

### 4. Prepare the organization branch and event

1. Create `event/new-organization` from the committed maintenance baseline on `main`. Use this default branch name unless the user supplies the organization name before creation.
2. Collect the organization/event name, description, dates and timezone, venue, schedule/tracks, speakers, sponsors, logos/assets, organizer accounts, attendee registration policy, enabled features, and operational contacts. These details are not provided yet; do not invent event content.
3. Replace event-specific AWS branding and content throughout legacy pages, metadata/social images, assets, seed fixtures, links, and enabled event workflows. Preserve the fixed Sync theme and neutral maintenance page.
4. Keep the multi-tenant feature flag off. Make only compatibility fixes required for this legacy event; do not merge tenant development.
5. Review the event data import before writing to production. Use the controlled operator path during maintenance. Ensure fixture scripts cannot reset production or reinsert the AWS program accidentally.
6. Configure Vercel's production branch to the event branch after it is ready; retain maintenance while importing/testing. Keep preview branches from implicitly writing to production.

The workflow `.github/workflows/vercel-deploy-nudge.yml` currently triggers only for `main`. Verify production builds on the event branch with the connected Git author's deployment permissions; do not assume this workflow will nudge event-branch deployments.

Acceptance: production has the approved new event and correct admin access; event branch deployment succeeds with maintenance still enabled.

### 5. Verify and reopen

- Run relevant unit tests, lint, TypeScript, and production build. Verify empty states before import and the populated schedule afterward.
- Exercise sign-in/out, auth callbacks, `/home`, `/alerts`, `/admin`, program/speakers, and every feature enabled for this event. Verify administrator denial for attendees and test with a fresh account.
- Check dates/timezone, mobile navigation, event metadata/assets, notification targeting, old subscriptions/recipients, networking visibility, and installed-PWA behavior. Ensure no AWS data or branding leaks into the new event.
- Review database integrity and imported counts. Restore only approved permissions/jobs; prevent any old-event scheduled notification jobs from restarting.
- Set Production `MAINTENANCE_MODE=false` and deploy the approved event branch revision. Recheck routes and real authorized writes, then record the deployment SHA, branch, configuration changes, and launch evidence.
- If validation fails, keep or reenable maintenance and fix the issue. Rolling back code cannot recover deleted data.

Acceptance: the production domain serves the new organization event correctly, authorized features work, and the tenant branch/local database remain untouched.

### 6. End the event and prepare for the future platform

1. Activate maintenance on the current production event branch and verify it before shutdown/archive work.
2. Freeze writers, archive and verify the organization's database data and any Storage bytes, and confirm secure retention with the user.
3. Return Vercel production to the maintenance baseline on `main` with `MAINTENANCE_MODE=true`; verify the real domain again. Do not let stale main configuration reopen the AWS experience.
4. Clearing the organization's data is a separate approved cleanup with the same inventory/archive gates. It does not happen merely by deleting its branch.
5. Retain the event branch until the archive, shutdown, and useful generic fixes have been reviewed. Then delete it if the user wants; retain any needed shared fixes through reviewed integration.
6. Before eventually merging/releasing `feat/multi-tenant-foundation`, reconcile the cleaned/reused production database with its migration assumptions and legacy backfills. Never assume its local AWS snapshot represents current production or that merging code synchronizes data.
7. Verify the platform migrations against a representative safe environment, then use `docs/multi-tenant-rollout.md` for the separate platform launch. Production may remain in maintenance until that acceptance gate passes.

## Recovery and next-account checklist

- For a code/deployment failure: keep maintenance active and redeploy a known maintenance-capable revision. Preserve the production branch/flag settings in the rollout record.
- For a failed database cleanup/import: stop writers and preserve evidence of completed operations. Assess transaction rollback or controlled archive recovery; do not restore a full Supabase dump blindly into live production.
- Archive restoration is an emergency option, not part of the normal new-event workflow. Load the database skills and review Auth/platform-owned schemas and compatibility before any restore.
- A new Codex account may need its own Git/Vercel/Supabase authentication. Do not expose credentials in tool output. Use hidden/non-GUI execution for routine commands; the user dislikes multiple visible CMD windows.
- Maintain this document and the progress tracker after each phase. Record actual commits, deployments, lock/reversal procedure, reviewed cleanup inventory, data-import evidence, and remaining gates.

**Immediate next unit:** review and publish the existing maintenance changes on `main`, activate the Production flag, and verify the public domain. Do not start deleting data. The next unit after that is the read-only production inventory and concrete write-safeguard/cleanup review.

### Details still needed before their dependent phases

- Verified Vercel project/team, production domain and branch, active environment flags, and deployment author permissions.
- Concrete reversible database write safeguard, external writer inventory, and its validation/reversal evidence.
- Exact delete/retain inventory, operator account retention/provisioning, and explicit user approval for production deletion.
- New organization event details/assets, administrators, enabled features, registration rules, and launch date.
- Future multi-tenant migration reconciliation after production reuse; local snapshot completeness is currently only user-reported.
