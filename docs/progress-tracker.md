# Progress Tracker

Update this file after every meaningful implementation change.

## Current objective

Convert Sync from the completed AWS Student Community Day Mega Manila 2026 companion into a secure, reusable multi-tenant event platform through a feature-flagged additive migration.

## Current phase

Phase 1 — tenant foundation, audited operations, tenant-scoped program data, and the first event-context application routes are locally verified; all three migrations remain unapplied remotely.

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

## Verification evidence

- `npm test`: 49 tests passed.
- `npm run lint`: passed with 9 pre-existing warnings in legacy networking-card files and no errors.
- `npm run build`: passed on Next.js 16.3.2.
- `npx tsc --noEmit`: passed after the event-context routing unit.
- `npx supabase db push --linked --dry-run`: recognized the foundation, audited-operations, and tenant-program migrations in order and did not mutate the linked project.
- `npx supabase db lint --local --level warning`: no schema errors or warnings.
- `git diff --check`: passed.
- `npx supabase test db`: all 185 pgTAP assertions passed, including 38 tenant-program, 64 audited-operation, and 19 tenant-foundation checks.

## In progress

- Event owner/admin management routes and event creation remain the next prerequisite for enabling the multi-tenant flag.

## Next implementation unit

1. Add `/manage/[slug]` owner/admin routes and audited event creation using the existing tenant-operation RPCs.
2. Replace or retire the legacy global `admin_get_dashboard` path before any multi-event management route can consume it.
3. Add browser-level route acceptance for two simultaneous tenants, then apply all three verified Phase 1 migrations to preview/staging before production.

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
