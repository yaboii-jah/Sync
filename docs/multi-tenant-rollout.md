# Multi-Tenant Rollout

## Feature flag

`MULTI_TENANT_PLATFORM_ENABLED` is server-only and defaults to disabled. It controls entry into the new hub and scoped route tree, not database security. New tables and policies must be safe even when the flag is off.

## Phase 0 — Context and inventory

- Rewrite active product, architecture, UI, standards, workflow, and app guides.
- Archive completed-event documentation.
- Inventory local and remote schema, including undocumented `merch_*` objects.
- Record a migration/backfill map and fresh-reset hazards.

## Phase 1 — Tenant foundation

- Add events, event memberships, admin invitations, super admins, platform audit, and quota override foundations.
- Add lifecycle, ownership, invitation, joining, moderation, and support-session RPCs.
- Add RLS, explicit grants, composite constraints, indexes, and cross-tenant tests.
- Add event branding Storage paths and policies.
- Backfill the AWS event but keep multiple-event creation disabled.

## Phase 2 — Core vertical release

- Add `/events`, event creation/setup, and theme resolution.
- Add public event page and explicit joining.
- Move schedule, speakers, and bookmarks to scoped routes and data access.
- Add `/manage/[slug]` team, content, membership, preview, publish, archive, and ownership flows.
- Add `/super-admin` oversight, suspension, quotas, feedback, audits, and support sessions.
- Verify legacy redirects and magic-link authentication.

Core acceptance requires two unrelated event tenants to coexist with no cross-tenant reads or writes, including direct RPC/API attempts.

## Phase 3 — Feature parity

- Alerts, push preferences, and delivery tracking
- Workshop seats
- Networking cards and scan history
- Event feedback and raffle
- Generated Photo Booth frames

Each feature is migrated as a complete event-scoped unit. Existing AWS data may remain read-only until its unit is complete.

## Phase 4 — Cutover

- Exercise staging with representative attendee, owner, admin, blocked, archived, suspended, and super-admin accounts.
- Enable the flag in a controlled environment and observe error, auth, delivery, and database metrics.
- Enable production, retaining reversible legacy redirects.
- Remove obsolete single-event compatibility only after an observation window.
- Produce and fresh-reset a reviewed baseline migration; restore omitted DML, cron, bucket, and secret setup explicitly.

## Rollback

Before final cutover, disabling the feature flag returns traffic to the legacy route experience. Additive schema remains in place. Data written to new tables is not deleted during rollback. Any migration with an irreversible data transform requires a backup and a separately documented recovery procedure.
