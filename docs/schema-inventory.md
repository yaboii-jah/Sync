# Schema Inventory for Tenant Migration

## Observed legacy domains

| Legacy object | Current scope | Tenant migration destination |
| --- | --- | --- |
| `events` | Single event | Extend as the tenant root; retain derived `status` temporarily and add lifecycle/suspension/branding fields |
| `sessions` | Has `event_id` | Add composite tenant constraints and scoped policies in the schedule unit |
| `speakers_sponsors` | Global event content | Add `event_id` before multiple-event creation is enabled |
| `session_speakers` | Indirectly scoped | Add explicit `event_id` and composite foreign keys |
| `my_flow_bookmarks` | User + session | Add explicit `event_id` and require active membership |
| `notifications` and delivery tables | Global feed | Add `event_id`; migrate preferences, recipients, dispatches, and reads together |
| `quick_links` | Global | Convert to event-owned content |
| `networking_cards`, `social_profiles`, scan history | Global/user scoped | Keep reusable URLs global; move cards, selections, and scans to membership/event scope |
| Workshop seat functions/state | Single event | Add event identity and membership checks in one transactional unit |
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

- The known AWS event receives its stable slug, Manila timezone, archived lifecycle, and private `legacy_aws` theme.
- The earliest legacy admin becomes owner for each existing event.
- Other legacy admins become event admins.
- Existing non-admin profiles become attendees.
- Every legacy admin is mirrored into `platform_super_admins` during the parallel period.
- `admin_users` remains intact so current routes continue to work while the feature flag is off.

If a fresh local database has no auth users, the seeded legacy event cannot receive an owner until a bootstrap identity exists. Production backfill is expected to have at least one legacy admin and must be checked before applying the migration.

## Quarantined remote objects

Generated remote types expose `merch_attendees`, `merch_scan_log`, `merch_claim_attendee`, and `merch_revert_claim`, although they have no intended migration source or approved place in Sync. The foundation migration conditionally revokes `anon` and `authenticated` privileges from matching tables and every `public.merch_*` function if they exist. It does not delete, modify, or integrate their data.

The merchandise objects still require an ownership decision before cutover. Do not expose them through the new application.

## Migration-chain hazards

- `supabase/seed.sql` is configured but absent.
- The historical social-profile sequence includes an out-of-band/no-op mismatch around `20260902120000_social_profiles.sql`.
- A linked-project dry run recognizes the new foundation migration as the only pending migration.
- Local SQL execution currently requires Docker or Podman, which is not installed in the development environment.

These hazards are why the existing history is preserved and a reviewed clean baseline is deferred until after cutover stabilization.
