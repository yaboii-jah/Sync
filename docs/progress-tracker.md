# Progress Tracker

Update this file after every meaningful implementation change.

## Current objective

Convert Sync from the completed AWS Student Community Day Mega Manila 2026 companion into a secure, reusable multi-tenant event platform through a feature-flagged additive migration.

## Current phase

Phase 3 — tenant-scoped alerts, push preferences, workshop seats, and networking are implemented locally on top of the core multi-tenant routes. All seventeen multi-tenant forward migrations remain unapplied remotely.

## Completed

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

### 2026-09-16 — Tenant-scoped schedule and speaker management

- Added `/manage/[slug]/schedule` and `/manage/[slug]/speakers` to the owner/admin workspace, with archived events read-only and suspended event content unavailable.
- Added validated session and speaker create/edit, publish/unpublish, and safe deletion flows. Session times are interpreted in the event time zone and constrained to the event window.
- Added event-scoped speaker assignment with both route/action entity checks and the existing database-enforced composite tenant boundary. Seats, live-session controls, and notification dispatch remain outside this editor unit.
- Reused the existing audited, idempotent program RPCs; no database migration, grant, policy, or generated-type change was required.
- Added focused validation tests and expanded the local organizer smoke probe to exercise two-tenant route access, speaker creation, session creation, and speaker assignment.

### 2026-09-20 — Tenant-scoped event branding

- Added `/manage/[slug]/branding` for owner/admin logo and cover management, with archived and suspended events remaining read-only.
- Added private, user-scoped staging and public, immutable delivery buckets. Storage RLS validates the event, actor, asset kind, and UUID path; an audited/idempotent RPC alone activates event paths.
- Added server-side Sharp decoding and normalization: JPEG/PNG/WebP inputs up to 10 MB become versioned WebP assets, with 512 × 512 contained logos, covers within 1600 × 900, and a 2 MB delivery limit.
- Added logo/cover presentation to unlisted public and attendee event headers without changing the fixed Sync theme.
- Added 26 branding pgTAP assertions, four image/path unit tests, browser upload acceptance, public/attendee display checks, and exact-object smoke cleanup.
- Made the raffle-export pgTAP fixture hermetic so restored local attendee rows no longer change its expected result.

### 2026-09-20 — Tenant-scoped team controls

- Added `/manage/[slug]/team` with owner-only invitation, reissue, revoke, admin removal, and explicit ownership-transfer flows; admins retain a read-only roster view.
- Added fragment-based `/invite#token` acceptance so raw tokens stay out of request URLs. Only the exact verified invited account can preview and explicitly accept an invitation.
- Added private invitation-email delivery reservations, 10-per-event and 80-platform-per-UTC-day guards, server-only Resend delivery, and copy-link fallback when delivery is unavailable or capped.
- Added 16 focused pgTAP assertions, invitation helper tests, and regenerated database types after the forward migrations. Manual invitation checks are now in `docs/multi-tenant-acceptance-plan.md`.

### 2026-09-21 — Platform super-admin workspace

- Added the feature-flagged `/super-admin/*` operations workspace for health metrics, event and user oversight, quotas, feedback, audit history, suspension, and temporary attendee support.
- Added narrow super-admin DTO RPCs instead of broad table access. Tenant attendee identity remains unavailable until a reason-gated event-specific support session is active.
- Enforced one live support tenant per operator; starting another session atomically closes the prior one. Support remains capped at 60 minutes and cannot acquire organizer or owner powers.
- Added audited, idempotent owner quota management and made the branding source-upload override effective through client validation, server validation, and Storage RLS up to the configured 50 MiB ceiling.
- Added 19 focused pgTAP assertions, platform-route authorization unit coverage, and regenerated database types. Manual super-admin acceptance checks are now in `docs/multi-tenant-acceptance-plan.md`.
- Added the shared confirmation-based sign-out control to the platform-operations header while keeping “Leave operations” as a separate non-destructive navigation action.

### 2026-09-23 — Active documentation synchronized

- Removed the standalone team and super-admin manual checklists in favor of one consolidated multi-tenant acceptance plan after the foundation is complete.
- Updated the developer guide and schema inventory to reflect the locally completed platform super-admin workspace and all nine remotely unapplied multi-tenant migrations.

### 2026-09-23 — Tenant-scoped alerts and push foundation

- Added required event ownership to notifications, recipient snapshots, dispatches, deliveries, and read cursors; preserved historical AWS alerts and global device subscriptions.
- Added per-event push opt-in, recipient/event RLS, audited idempotent owner/admin send RPC, and all/selected active-member targeting. Published, non-suspended events alone can send; support sessions do not authorize sending.
- Added scoped attendee alerts/settings and organizer composer/history/detail routes. The scoped home links to event alerts and settings; legacy routes remain flag-off compatibility surfaces.
- Updated the push Edge worker to require event recipient, active membership, and per-event opt-in; scoped notification clicks open `/e/[slug]/alerts`. Webhook destinations are environment-configured, and missing configuration fails safely without retry.
- Added focused tenant-alert pgTAP coverage and repaired two non-hermetic/legacy assumptions in the existing suite. All 305 database assertions now pass on the restored local database. Real-device push delivery and manual two-account browser acceptance remain to be tested.

### 2026-09-23 — Tenant-scoped workshop seats

- Added required `event_id` ownership and a composite session reference to seat claims, backfilled existing claims, and reconciled held-seat counters.
- Moved count maintenance to claim insert/delete triggers, including automatic release when a member leaves, is removed, is blocked, or loses their account identity. My Flow bookmarks remain intact.
- Restricted audited capacity edits to event owners/admins, closing the temporary support-session capacity path. The scoped schedule editor now exposes optional capacity, off-app reservations, close-seats control, and a live attendee-facing preview.
- Added focused input validation and database isolation/authorization tests. Local suite passes 87 unit tests and 331 pgTAP assertions; build and schema lint pass. A live two-device last-seat race and responsive browser acceptance remain manual checks for the consolidated foundation plan.

### 2026-09-23 — Tenant-scoped networking

- Added membership-owned event cards, opt-in card-link selections, and deduplicated event scan history. QR card reads require active membership in the same event; direct table access is revoked and composite foreign keys prevent cross-event relationships.
- Added scoped Connect and card routes with a reused but event-neutral card presentation. Published cards can be edited and scanned; archived cards/history are read-only, suspended events are hidden, and legacy card routes remain separate.
- Removing a global social URL or deactivating membership revokes its event-card selections. Existing global URLs remain reusable, but no event links are selected automatically. Active members can edit reusable links on Connect with either Google or email-link sign-in; the legacy account-settings save remains Google-only while the rollout flag is off.
- Added database isolation/consent tests and QR routing unit tests. All four networking migrations were applied only to local Supabase; remote migration state is unchanged. Current checks: 90 unit tests, 368 pgTAP assertions, schema lint, and production build pass; two-account browser acceptance is still pending.

### 2026-09-27 — Networking follow-up verification

- Restored the in-progress multi-tenant work to its feature branch while preserving the unrelated `main` rollback notes in a separate stash.
- Removed legacy AWS artwork and slogan from new event cards without changing flag-off legacy cards. Scan history now preserves unavailable connections as memories without returning a clickable token after link removal, membership loss, or identity anonymization.
- Expanded database checks for anonymous callers, suspended events, and anonymized scan targets; all 368 database assertions pass locally.

### 2026-09-27 — Event feedback and raffle scoping

- Added separate event/membership-owned feedback with idempotent attendee submission and owner/admin-only event reads. Global `app_feedback` remains platform feedback; the shared form now identifies the recipient accurately.
- Added scoped feedback and raffle routes. Raffle export is a fresh active-attendee names snapshot for an external drawing tool, without in-app draw or winner storage; legacy global-admin paths remain flag-off compatibility surfaces.
- Restricted both domains at database and route/action boundaries across tenants, lifecycle states, suspension, membership removal, and deleted identity. Feedback authors anonymize as “Former attendee” when their account identity is removed. Duplicate raffle labels have an on-demand, same-event identity check; exported text remains names-only.
- Applied three forward migrations to local Supabase only, regenerated types, and added 35 focused pgTAP assertions plus scoped-action tests. No remote migration or deployment was performed.

### 2026-09-27 — Event-scoped Photo Booth

- Added `/e/[slug]/photo-booth` for active members of published or archived, non-suspended events and an attendee navigation link. The legacy `/more/photo-booth` route redirects to the preferred eligible event only when the multi-tenant flag is enabled; flag-off AWS frames remain unchanged.
- Added two deterministic Sync-only vector frames used by both preview and local 1080×1920 JPEG composition. The existing three-shot camera/picker, retake, countdown, and media cleanup flow is reused; photos still have no server, Storage, or database write path.
- Added scoped-route and frame-contract tests. No migration, bucket, generated database type, or remote configuration change was needed. Physical camera acceptance remains for the consolidated test plan.

## Verification evidence

- `npm test`: all 109 tests passed, including Photo Booth route, legacy redirect, and frame-contract checks.
- `npm run lint`: passed with 9 pre-existing warnings in legacy networking-card files and no errors.
- `npm run build`: passed on Next.js 16.3.2 with all scoped Phase 3 routes, including Photo Booth; the existing `metadataBase` warning remains.
- `npx tsc --noEmit`: passed after the Photo Booth implementation.
- `npx supabase db push --linked --dry-run`: recognized the foundation, audited-operations, and tenant-program migrations in order and did not mutate the linked project.
- `npx supabase db lint --local --level warning`: no schema errors or warnings after the networking migrations.
- `git diff --check`: passed.
- `npx supabase test db`: all 403 pgTAP assertions pass, including feedback/raffle tenant isolation, eligibility, lifecycle, suspension, and anonymization.
- `node scripts/smoke-organizer.mjs`: local two-tenant route and browser acceptance passed, including speaker/session creation, real branding upload and normalization, public/attendee branding display, lifecycle flows, 320/375/414/768px overflow checks, and measured text/control contrast.
- Moved the complete local Supabase port block from Windows-reserved `54320–54329` to `45420–45429`, restored the preserved local database backup, and verified `200` responses from local Auth and the Next.js app. Docker again shows the Supabase API, Studio, Mailpit, analytics, and Postgres containers with published host ports.
- The restored local database now passes the complete pgTAP suite; raffle-export and platform-assignment assertions use their UUID-scoped fixtures.

## Consolidated acceptance planning — September 27, 2026

- Added `docs/multi-tenant-acceptance-plan.md` with a local-first two-event fixture matrix, automated baseline, release-blocking authorization/lifecycle checks, feature-parity browser/device checks, evidence fields, and a go/no-go gate. This is a checklist, not a record of passed manual tests. No hosted migrations, flags, or data were changed.

## In progress

- Alerts, push scoping, workshop seats, networking, event feedback/raffle, and Photo Booth are locally implemented. Real-device push and camera acceptance, a live last-seat race, and two-account networking and feedback/raffle browser acceptance still require verification; no remote function deployment or migrations were performed.
- The consolidated end-to-end plan is ready; its manual checks have not yet been run as a complete acceptance pass.

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

1. Execute `docs/multi-tenant-acceptance-plan.md` locally, record evidence, and fix any blocking failures, including physical-device push/camera and two-account/race checks.
2. Apply migrations to preview/staging only with explicit approval, then repeat the acceptance plan before cutover.

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
