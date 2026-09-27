# Schema Inventory for Tenant Migration

## Observed legacy domains

| Legacy object | Current scope | Tenant migration destination |
| --- | --- | --- |
| `events` | Tenant root | Lifecycle, suspension, branding, ownership, and compatibility `status` fields are complete |
| `sessions` | Tenant scoped | Composite tenant constraints, event-window enforcement, scoped policies, and audited RPCs are complete |
| `speakers_sponsors` | Tenant scoped | Required `event_id`, explicit publication state, scoped policies, and audited RPCs are complete |
| `session_speakers` | Tenant scoped | Required `event_id` and composite session/speaker foreign keys are complete |
| `my_flow_bookmarks` | Tenant scoped | Required `event_id`, active membership checks, and composite session ownership are complete |
| `notifications` and delivery tables | Tenant scoped | Required `event_id`, recipient/dispatch/delivery ownership, per-event read cursor and push preference complete |
| `quick_links` | Global | Convert to event-owned content |
| Legacy `networking_cards` and scan history; `social_profiles` | Global/user scoped compatibility | Reusable URLs stay global; new event cards, selected links, and scans are membership/event scoped. Legacy rows remain for flag-off routes. |
| Workshop seat functions/state | Tenant scoped | Claim rows have required `event_id` and a composite session key; organizer capacity and attendee claims are event-authorized |
| `app_feedback` | Global app feedback | Remains platform feedback; separate `event_feedback` is event/membership scoped with authorized submit/list RPCs |
| `admin_users` and `admin_audit_log` | Global event operator | Preserve for legacy routes; mirror into platform/event role foundations, then retire after cutover |
| `profiles`, `push_subscriptions` | Global user/device | Remain global with privacy-safe event projections |

## Foundation added

Migration `20260913160000_multi_tenant_foundation.sql` adds:

- Tenant metadata and lifecycle fields to `events`
- `event_memberships`
- `event_admin_invitations`
- `platform_super_admins`
- `platform_quota_overrides`
- `platform_support_sessions`
- `platform_audit_log`
- Private role helpers, RLS, explicit grants, legacy role/membership backfill, and single-active-owner uniqueness

## Legacy backfill

- The known AWS event receives its stable slug, Manila timezone, archived lifecycle, and compatibility-only `legacy_aws` theme field; interface styling remains the shared original Sync theme.
- The earliest legacy admin becomes owner for each existing event.
- Other legacy admins become event admins.
- Existing non-admin profiles become attendees.
- Every legacy admin is mirrored into `platform_super_admins` during the parallel period.
- `admin_users` remains intact so current routes continue to work while the feature flag is off.

If a fresh local database has no auth users, the seeded legacy event cannot receive an owner until a bootstrap identity exists. Production backfill is expected to have at least one legacy admin and must be checked before applying the migration.

## Event program scoping added

Migration `20260913180000_tenant_scoped_event_program.sql` adds:

- Required event ownership for speakers, session-speaker links, and bookmarks
- Composite foreign keys preventing cross-event program relationships
- Event-bounded session times and explicit speaker publication
- Tenant-aware RLS, audited administrative RPCs, and scoped bookmark/seat RPC behavior
- A safe public program DTO RPC for published, non-suspended events
- Tenant-friendly indexes and Realtime publication for speaker and speaker-link changes

Rooms remain free-text labels for the first reusable release. Normalized tracks and venues are intentionally deferred until there is demonstrated cross-event demand.

## Event alerts and push scoping added

Migration `20260922210222_tenant_scoped_alerts_push.sql` and its two forward fixes add required event ownership, composite notification references, recipient/read-state RLS, per-event push opt-in, an audited/idempotent send RPC, and an environment-configured push webhook. Historical session alerts inherit their session event; other historical alerts and read cursors belong to the archived AWS event. Global `push_subscriptions` remain user/device records. A missing transport URL leaves an in-app alert visible and records `push_not_configured` without retrying. The Edge worker sends only to active, opted-in recipients and opens the scoped alerts route.

## Workshop seat scoping added

Migration `20260922212704_tenant_scoped_workshop_seats.sql` backfills and requires `event_id` on claims, enforces the event/session composite foreign key, and reconciles the `claimed_seats` counter. Claim insert/delete triggers now maintain the count, including membership deactivation and account-deletion cascades. Leaving, removal, and blocking release a member's seats but preserve My Flow bookmarks. The capacity RPC is restricted to event owners/admins; temporary platform support cannot edit it. Claim rows remain readable only to their active owner, with no client write grant or workshop roster API.

## Quarantined remote objects

Generated remote types expose `merch_attendees`, `merch_scan_log`, `merch_claim_attendee`, and `merch_revert_claim`, although they have no intended migration source or approved place in Sync. The foundation migration conditionally revokes `anon` and `authenticated` privileges from matching tables and every `public.merch_*` function if they exist. It does not delete, modify, or integrate their data.

The merchandise objects still require an ownership decision before cutover. Do not expose them through the new application.

## Migration-chain hazards

- `supabase/seed.sql` is configured but absent.
- The historical social-profile sequence includes an out-of-band/no-op mismatch around `20260902120000_social_profiles.sql`.
- All thirteen multi-tenant forward migrations—from the tenant foundation through scoped workshop seats—remain unapplied to the linked remote project.
- Docker Desktop is installed and the local Supabase stack and pgTAP suite work. The persistent-database super-admin fixture was made hermetic.

Core program reads and Realtime subscriptions are event scoped. The new management workspace uses explicit `event_id`-filtered setup counts instead of `admin_get_dashboard`. Legacy `/admin/*` pages and Server Actions are retired from application access when the multi-tenant flag is enabled; their RPCs remain flag-disabled compatibility code and are never imported by new management routes. Advanced single-event data domains still require parity work before cutover; application redirects are not database authorization.

These hazards are why the existing history is preserved and a reviewed clean baseline is deferred until after cutover stabilization.
