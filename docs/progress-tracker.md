# Progress Tracker

Update this file after every meaningful implementation change.

## Current objective

Immediate operation: keep production maintenance active on `main`, finish the remaining existing authenticated-session/installed-PWA checks, then prepare the read-only production inventory for the new organization's event reuse workflow in `docs/new-organization-handoff.md`. Production data cleanup remains a separate gated unit.

Convert Sync from the completed AWS Student Community Day Mega Manila 2026 companion into a secure, reusable multi-tenant event platform through a feature-flagged additive migration.

## Current phase

Phase 1 — tenant foundation, audited operations, tenant-scoped program data, event-context routes, and organizer foundation are locally verified; all four forward migrations remain unapplied remotely.

## Completed

### 2026-10-02 — Production maintenance published and activated

- Confirmed local/remote `main` and the newest Production build initially were at `8507dc9`; later domain-target inspection showed the public domain was pinned to the older September 11 revision `274aa8c`. Project `jahmell-dorias-projects/sync` uses Supabase project `mygybolhwoeckrgczclm` and production branch `main`.
- Production initially has neither `MAINTENANCE_MODE` nor `MULTI_TENANT_PLATFORM_ENABLED` configured. Signed-out baseline: `/` returns 200, `/home` and `/alerts` return 307.
- Expanded maintenance coverage for HEAD/cookie-bearing requests, auth/POST handling, disabled API/auth bypass, and actual matcher inclusion/static exclusions. Installed Next.js exports `unstable_doesMiddlewareMatch`; the bundled guide's `unstable_doesProxyMatch` name is unavailable.
- Production-mode local HTTP verification caught page rewrites resetting 503 to 200. Replaced the rewrite with standalone HTML returned directly by Proxy, with empty HEAD responses and existing Geist/Perandory font copies under `public/maintenance-assets/`. The normal `/maintenance` page shares the wording.
- Final local checks pass: 104 unit tests across 14 files (32 maintenance checks), lint with the same 9 existing warnings/no errors, production build, TypeScript, and diff check. The pre-existing `metadataBase` warning remains.
- Built-app HTTP checks pass for `/`, `/home`, `/alerts`, `/admin`, `/auth/callback`, and a harmless API probe: 503, maintenance HTML, and no-cache headers. HEAD is empty 503; harmless POST is plain-text 503. `/maintenance` and 22 required static/font assets return 200.
- Hidden headless Edge checks pass at 320/1280px with no overflow and both fonts loaded; screenshots were visually reviewed. Service-worker-controlled navigation shows maintenance. A synthetic cookie probe passes but does not substitute for an actual signed-in session or an existing installed-PWA check.
- Committed and pushed maintenance baseline `bafe7ed16531459295b267ee9488cf0d8d628b04`. Set Production `MAINTENANCE_MODE=true` and `MULTI_TENANT_PLATFORM_ENABLED=false`, preserving Preview/Development settings.
- Git produced Ready deployment `dpl_2dkXFUkChZn6caCsPDPvs5bPdBaF` (`sync-5lbrnwepu-jahmell-dorias-projects.vercel.app`). Because automatic domain assignment was disabled, explicitly promoted that reviewed deployment to `sync.aws-scd.cloud` and `sync-orpin-nine.vercel.app`; promotion re-enabled `autoAssignCustomDomains=true`.
- Both public domains pass the HTTP checks listed above, including 503/no-cache handling and 200 for the maintenance route/assets. Live hidden headless Edge verifies 320/1280px and service-worker-controlled navigation on the custom domain; screenshots were visually reviewed. Actual existing authenticated-session/installed-PWA verification is requested and pending; full acceptance is not yet claimed.
- No production database, Auth, Storage, migration, background-writer, or archive operations occurred. Unrelated untracked work and the separate tenant branch/local database are preserved.

### 2026-10-01 — New organization implementation handoff

- Added `docs/new-organization-handoff.md` with the agreed full event reuse plan, current branch/uncommitted maintenance status, archive verification record, rollout and event closure steps, recovery guidance, and remaining implementation gates for another Codex account.
- Recorded that the multi-tenant branch stays separate and that production cleanup requires a concrete database write safeguard and approval of the delete/retain inventory. No deployment, production configuration, or database data changed in this documentation unit.

### 2026-10-01 — Production maintenance gate

- Added a server-only `MAINTENANCE_MODE=true` switch, a public maintenance page, and HTTP 503 handling for Next.js page, API, auth, and Server Action requests. The switch is off by default; production configuration and deployment are unchanged.
- Documented that the gate does not disable direct Supabase Data API access, so database writes require a separate operational lock before destructive cleanup.

### 2026-09-13 — Multi-tenant direction approved

- Defined event as the v1 tenant boundary.
- Defined platform super admin and event owner/admin/attendee roles.
- Approved unlisted scoped event URLs, explicit joining, lifecycle/suspension behavior, invitations, ownership transfer, account anonymization, quotas, branding, PWA behavior, and phased delivery.
- Approved preserving the completed AWS event as an archived legacy tenant.

### 2026-09-13 — Active context rewritten

- Replaced AWS-specific active product, architecture, UI, standards, workflow, app, and networking-theme guidance with the approved platform model.
- Added `docs/multi-tenant-rollout.md` with feature flag, phases, acceptance, cutover, and rollback rules.
- Moved the old app guide, UI PRD, issue history, networking theme, and detailed tracker into `docs/archive/aws-student-community-day-2026/`.
- No runtime or database behavior changed in this documentation unit.

### 2026-09-13 — Tenant domain and rollout flag foundation

- Added the server-consumed `MULTI_TENANT_PLATFORM_ENABLED` flag with an exact, fail-closed `true` check and documented its disabled default in `.env.example`.
- Added shared lifecycle, role, membership-status, theme, event-context, and permission types under `lib/events/`.
- Added pure permission derivation that makes archived events read-only and denies inactive memberships and suspended events.
- Added unit coverage for owner/admin boundaries, archived behavior, membership status, suspension, and feature-flag parsing.

### 2026-09-13 — Additive database foundation drafted

- Added event tenant metadata, lifecycle, suspension, branding, membership, admin invitation, platform super-admin, quota override, support-session, and platform-audit schema in a forward migration.
- Added private role helpers with pinned search paths, RLS policies, explicit table/function grants, tenant indexes, composite invitation membership references, and a unique active-owner constraint.
- Added deterministic legacy AWS lifecycle/theme and identity backfill while preserving `admin_users` for current routes.
- Conditionally revoked client access to the untracked `merch_attendees`, `merch_scan_log`, and matching `merch_*` functions without deleting them.
- Added a 19-assertion pgTAP test covering grants, helper hardening, merchandise quarantine, two-tenant visibility, attendee isolation, super-admin visibility, and owner uniqueness.
- Added `docs/schema-inventory.md` mapping every legacy data domain to its tenant migration unit.

### 2026-09-13 — Local Supabase replay enabled

- Installed Docker was verified and the complete local Supabase service stack now starts successfully.
- Reproduced two pre-existing fresh-reset defects: the out-of-band social-profile migration pair collides with its canonical predecessor, and the official-program restore migration refuses to run after the event start date.
- Verified the remaining migration chain, including the new tenant foundation, in a disposable local replay that omitted only those three historical artifacts and restored every tracked file afterward.
- Updated pgTAP function-hardening assertions to accept PostgreSQL's equivalent `search_path=` and `search_path=""` catalog representations.

### 2026-09-13 — Audited event operations locally verified

- Added immutable, tenant-scoped event audit records and hardened idempotency helpers using caller-provided request UUIDs and transaction advisory locks.
- Added authenticated RPCs for attendee join/leave/moderation, admin invitation issue/resend/revoke/accept, admin removal, ownership transfer, publish/archive, and untouched-draft deletion.
- Added super-admin suspension and reason-gated support-session RPCs. Support sessions expire within 60 minutes, reveal event PII only for the supported tenant, permit attendee moderation, and never grant owner-level lifecycle authority.
- Removed blanket super-admin access to event membership and invitation PII; active event-specific support is now required.
- Enforced verified exact-email invitation acceptance, expiration/revocation state, owner admin quotas, valid publish time zones, suspension read-only behavior, and immutable audit history.
- Replayed the full viable local migration chain from scratch and regenerated `lib/supabase/database.types.ts` from the verified local schema.

### 2026-09-14 — Tenant-scoped event program locally verified

- Added required `event_id` ownership to speakers, session-speaker links, and bookmarks, with composite foreign keys that reject cross-event relationships at the database boundary.
- Replaced schedule, speaker, session-link, bookmark, and workshop-seat mutation paths with membership-aware, tenant-scoped authorization; administrative program mutations emit immutable audit records.
- Added explicit speaker publication, enforced sessions within the event time window, retained free-text room labels, and kept normalized tracks and venues deferred.
- Added a narrow anonymous `get_public_event_program` RPC that returns only published content for published, non-suspended events; program tables remain unavailable directly to anonymous clients.
- Added owner/admin/support speaker and link RPCs, session quotas, idempotency, suspension behavior, archived attendee reads, and Realtime publication for speaker/link changes.
- Replayed the viable migration chain from scratch, regenerated `lib/supabase/database.types.ts`, and added 38 tenant-program pgTAP assertions.

### 2026-09-14 — Event-context routing and attendee vertical slice

- Added a feature-flagged `/events` member index, unlisted public `/e/[slug]` program page with explicit joining, and authenticated `/e/[slug]/home` attendee route.
- Replaced implicit first-event application reads with explicit event IDs, including sessions, bookmarks, seat claims, and legacy route selection.
- Bound bookmark and seat mutations to a validated event/session pair before invoking database RPCs, preventing route-context confusion across tenants.
- Added tenant-filtered Realtime subscriptions for event program tables; seat count changes continue through the scoped sessions subscription.
- Added reusable event access/public-program queries, deterministic event selection, slug/path helpers, event-time-zone display helpers, and four routing tests.
- Added a generic Sync landing experience and metadata behind the server-only flag while preserving the archived AWS presentation when the flag is disabled.
- Added scoped Cobalt design tokens and Hallmark design memory for the new platform surfaces; the legacy tenant theme remains unchanged.

### 2026-09-14 — Live route smoke-test follow-up

- Narrowed anonymous event access to exactly `/e/[slug]`; protected descendants now enter the authentication bounce with their complete pathname preserved.
- Added regression coverage for always-public routes, feature-flagged public event pages, and protected event descendants.
- Replaced inherited AWS social metadata assets with generated event-neutral Sync images and archived the original AWS image files alongside the legacy documentation.
- Verified locally that the generic landing and a temporary published event return `200`, invalid and unknown event slugs return `404`, protected event home returns `307` with its encoded `next` path, and both social-image endpoints return PNG responses.
- Removed the temporary local event fixture after verification; no remote data or migration state changed.

### 2026-09-15 — Organizer foundation locally verified

- Added audited, idempotent event creation and basics updates with immutable slugs, five-active-event default quotas, per-owner concurrency locking, timezone validation, and session-window protection.
- Added `/events/new`, `/manage/[slug]`, and `/manage/[slug]/basics` with independent owner/admin authorization at every data and action leaf. Archived and suspended management is read-only.
- Added owner-only publication, reason-gated archival, and reason/name-gated untouched-draft deletion. Creation/basics audit entries do not count as meaningful activity; persistent platform tombstones prevent deleted creation requests from resurrecting drafts.
- Split the member hub into attending/managing groups and added management entry points. Retired legacy global-admin reads at both layout and query boundaries when the rollout flag is enabled; stale legacy actions remain blocked and flag-off behavior is preserved.
- Preserved readable `legacy_aws` branding in event parsing. Organizer forms reuse the existing Cobalt/Geist tokens and include a non-production eight-state component preview.
- Fixed React action-form resets interacting with React Aria controlled inputs: successful saves now preserve edited values and visible feedback.
- Separated the browser-safe attendee alert-read RPC from the server-only legacy-admin query module, so global-query cutover guards cannot enter client bundles or intercept attendee alert reads.
- Routed legacy attendee search/detail/raffle client reads through independently authorized server actions; no client runtime imports the global-admin query module. Existing flag-off functionality retains its pagination and database operations.
- Added 48 organizer pgTAP assertions and a repeatable local-only Edge acceptance probe. Verified actual browser creation, suggested slugs, basics saving, publication/public visibility, archival/read-only transition, typed draft deletion, and parallel owner-quota enforcement. Removed only the probe's temporary users/events/audit rows.
- Executed the new forward migration against the existing local database, recorded version `20260915130258` as applied in local migration history, and regenerated types; did not reset local user data, alter historical migrations, or apply remote migrations.

## Verification evidence

- `npm test`: 69 tests passed.
- `npm run lint`: passed with 9 pre-existing warnings in legacy networking-card files and no errors.
- `npm run build`: passed on Next.js 16.3.2.
- `npx tsc --noEmit`: passed after the organizer implementation.
- `npx supabase db push --linked --dry-run`: recognized the foundation, audited-operations, and tenant-program migrations in order and did not mutate the linked project.
- `npx supabase db lint --local --level warning`: no schema errors or warnings.
- `git diff --check`: passed.
- `npx supabase test db`: all 233 pgTAP assertions passed, including 48 organizer, 38 tenant-program, 64 audited-operation, and 19 tenant-foundation checks.
- `node scripts/smoke-organizer.mjs`: local two-tenant route and browser acceptance passed, including 320/375/414/768px overflow checks and measured text/control contrast. A captured basics-screen screenshot was visually reviewed.

## In progress

- Temporary event operation: maintenance is live and automatically verified; existing authenticated-session/installed-PWA acceptance remains pending. Read-only production inventory and the concrete write-safeguard/cleanup review are next. No deletion is approved by this release.

- No organizer-foundation implementation work remains. Preview/staging migration application and rollout remain pending explicit deployment approval.

## Original Sync theme restoration verification — September 15, 2026

Original Sync UI restoration completed: removed light platform overrides, restored shared dark teal/gold/green controls and Perandory identity, and aligned social previews and active context docs. Event logo/cover branding remains supported; stored theme fields are compatibility-only. Authentication and database behavior are unchanged.

- `npm test`: all 72 tests passed, including fixed-theme and social-palette regression checks.
- `npm run build`: passed, including TypeScript and both generated social images. Existing `metadataBase` configuration warning remains.
- `npm run lint`: no errors; 9 pre-existing networking-card warnings remain.
- Local browser smoke against the existing server on port 3000 passed: two-tenant access isolation, anonymous redirects, organizer basics save, draft creation, publish/archive, gated deletion, and concurrent creation quotas.
- Identical computed theme values verified across two event owners, an event admin, and an attendee. Stored presets are not read by the shared shells or overview presentation.
- Basics overflow checks passed at 320/375/414/768px; landing checks passed at 320/375/414/768/1280/1920px. Phone and laptop landing screenshots, organizer controls, and social preview were visually reviewed.
- Shared text, helper, error, success, primary button, input boundary, and focus contrast passed. Error text uses a lighter derivative of the original red for readable contrast on dark surfaces.
- Both social-image endpoints returned PNG successfully, with explicitly registered Geist body text and the restored Perandory wordmark.
- Only smoke-run fixture data was removed. No schema migrations, production changes, auth-provider changes, commits, or pushes were performed.

## Next implementation unit

For the temporary organization event operation, complete the remaining existing authenticated-session/installed-PWA checks, then perform read-only production inventory and prepare the concrete reversible write safeguard and cleanup review. Follow `docs/new-organization-handoff.md`; keep maintenance active and do not delete production data or apply tenant migrations during maintenance delivery.

The separate multi-tenant development track remains:

1. Plan the tenant-scoped schedule/speaker management editor using the existing audited program RPCs; branding and team controls remain separate units.
2. Apply all four verified forward migrations to preview/staging only with explicit approval, then repeat acceptance before production cutover.
3. Continue the deferred tenant migration domains and platform-super-admin workspace documented in the rollout and schema inventory.

## Known migration risks

- The historical migration chain contains a duplicate social-profile table creation around `20260902120000_social_profiles.sql`; do not edit applied migrations.
- Remote `merch_*` objects are not represented in the intended product model and must not be deleted or adopted without an explicit follow-up decision.
- Supabase migration squashing omits some DML, cron, Storage bucket, and secret configuration; a future baseline requires a fresh reset test and manual review.
- Current production behavior remains single-event while `MULTI_TENANT_PLATFORM_ENABLED` is disabled; the new routes are locally implemented but not yet enabled.

## Core acceptance gate

- Two unrelated events coexist without cross-tenant reads or writes.
- Owner, admin, active attendee, left, removed, blocked, anonymous, archived, suspended, and support-session behavior is verified.
- Existing AWS identities and history are preserved.
- Legacy routes redirect safely.
- `npm run build` and the relevant authorization tests pass.
