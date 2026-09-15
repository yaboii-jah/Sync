# Schema Inventory for Tenant Migration

## Observed legacy domains

| Legacy object | Current scope | Tenant migration destination |
| --- | --- | --- |
| `events` | Tenant root | Lifecycle, suspension, branding, ownership, and compatibility `status` fields are complete |
| `sessions` | Tenant scoped | Composite tenant constraints, event-window enforcement, scoped policies, and audited RPCs are complete |
| `speakers_sponsors` | Tenant scoped | Required `event_id`, explicit publication state, scoped policies, and audited RPCs are complete |
| `session_speakers` | Tenant scoped | Required `event_id` and composite session/speaker foreign keys are complete |
| `my_flow_bookmarks` | Tenant scoped | Required `event_id`, active membership checks, and composite session ownership are complete |
| `notifications` and delivery tables | Global feed | Add `event_id`; migrate preferences, recipients, dispatches, and reads together |
| `quick_links` | Global | Convert to event-owned content |
| `networking_cards`, `social_profiles`, scan history | Global/user scoped | Keep reusable URLs global; move cards, selections, and scans to membership/event scope |
| Workshop seat functions/state | Compatibility scoped | Claim/release RPCs now verify the session event and active membership; adding `event_id` to claim rows remains deferred |
| `app_feedback` | Global app feedback | Keep as platform feedback; add separate event feedback later |
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

## Quarantined remote objects

Generated remote types expose `merch_attendees`, `merch_scan_log`, `merch_claim_attendee`, and `merch_revert_claim`, although they have no intended migration source or approved place in Sync. The foundation migration conditionally revokes `anon` and `authenticated` privileges from matching tables and every `public.merch_*` function if they exist. It does not delete, modify, or integrate their data.

The merchandise objects still require an ownership decision before cutover. Do not expose them through the new application.

## Migration-chain hazards

- `supabase/seed.sql` is configured but absent.
- The historical social-profile sequence includes an out-of-band/no-op mismatch around `20260902120000_social_profiles.sql`.
- A linked-project dry run recognizes the foundation, audited-operations, and tenant-program migrations as pending, in that order.
- Docker Desktop is installed and the local Supabase stack, clean replay, schema lint, and pgTAP suite are working.

Core program reads and Realtime subscriptions are event scoped. The new management workspace uses explicit `event_id`-filtered setup counts instead of `admin_get_dashboard`. Legacy `/admin/*` pages and Server Actions are retired from application access when the multi-tenant flag is enabled; their RPCs remain flag-disabled compatibility code and are never imported by new management routes. Advanced single-event data domains still require parity work before cutover; application redirects are not database authorization.

These hazards are why the existing history is preserved and a reviewed clean baseline is deferred until after cutover stabilization.
