# Architecture

## System shape

Sync is a Next.js App Router PWA backed by Supabase Auth, Postgres, Storage, and Realtime. Resend is used for transactional email. The application uses one shared database schema with strict row-level tenant isolation.

The migration is additive and feature flagged by the server-only `MULTI_TENANT_PLATFORM_ENABLED` environment variable. Existing production routes remain available until the new tenant paths pass acceptance testing.

## Route boundaries

- `/` — generic Sync platform landing page
- `/events` — signed-in event hub
- `/events/new` — authenticated draft event creation
- `/e/[slug]` — published public event page
- `/e/[slug]/home`, `/alerts`, `/connect`, `/more`, `/settings`, `/photo-booth` — attendee routes
- `/manage/[slug]/*` — event owner/admin workspace
- `/super-admin/*` — platform operations
- `/settings` — global account settings
- `/auth/confirm` — email magic-link PKCE exchange

Legacy routes such as `/home` and `/admin` resolve the user's most relevant event and redirect to a scoped route; otherwise they redirect to `/events`.

Next.js proxy logic is only an optimistic navigation gate. Every server action, route handler, and data-access leaf must authenticate and authorize independently.

## Identity and authorization

- `auth.users` is the canonical global identity.
- A global profile stores display name, avatar, and reusable social URLs.
- Platform super admins are separate from event roles.
- `event_memberships` stores tenant roles and status. It has its own primary key and a nullable `user_id` so account deletion can anonymize identity without destroying event history.
- Each event has exactly one active owner. Ownership transfer is transactional and only targets an active admin.
- Event admins enter through exact verified-email invitations that expire after seven days.

Membership statuses support active, left, removed, and blocked behavior. A removed attendee may rejoin; a blocked attendee may not. Leaving hides the person from active event views while preserving historical data.

Organizer creation is a short form followed by an event setup workspace. Slugs are immutable after creation in v1. Active owned-event quotas count draft/published events, including suspended events, and creation is serialized per owner. Basics edits preserve existing session time-window constraints. Setup-only creation/basics audits do not prevent untouched-draft deletion; an immutable platform tombstone preserves the deleted event and its creation request.

## Data domains

### Global

- Profiles and reusable social links
- Push subscriptions tied to the user/device
- Platform super-admin assignments
- Account status and quota overrides
- Platform feedback
- Platform audit log and support sessions

### Event scoped

- Events, branding, memberships, and invitations
- Sessions, speakers, free-text room labels, and bookmarks
- Seat inventory and reservations
- Event notification configuration, delivery, preferences, and read state
- Event networking cards, card-link selections, and scan history
- Event feedback and raffle state
- Event audit records

Every tenant-owned row has an `event_id`. Relationships that can cross tables use composite foreign keys including `event_id` where practical so invalid cross-event references fail at the database boundary.

Speaker publication is explicit and independent of session publication. Session intervals must remain within their event's start and end timestamps. Normalized track and venue entities are deferred; v1 keeps the existing room text field.

## Database security invariants

1. Row Level Security is enabled on every Data API table.
2. Grants are explicit; schema exposure alone never grants access.
3. Anonymous access is limited to narrow read RPCs for published, non-suspended events.
4. Private authorization helpers are not exposed, use `security definer` only when necessary, set `search_path = ''`, schema-qualify references, and revoke execution from public roles.
5. Event writes verify active membership and role inside the database, not only in UI code.
6. Sensitive mutations use audited RPCs with caller-provided request UUIDs for idempotency.
7. Event staff only see event-relevant profile data: name, photo, verified email, membership/reachability status, and social links the attendee selected for that event.
8. Super-admin support access requires a reason, creates an audit record, expires within 60 minutes, and is visibly represented. It is not silent impersonation.

## Storage

Branding objects live under event-scoped paths such as `events/{event_id}/branding/...`. Published branding may be publicly readable. Upload, replacement, and deletion require active owner/admin authorization. Storage policies check the path's event identifier. Upsert policies include the required `INSERT`, `SELECT`, and `UPDATE` permissions.

Inputs may be at most 10 MB and are normalized into smaller delivery assets. Unsafe or unreadable uploads are rejected.

## Event themes

All routes use the original fixed Sync dark teal/gold/green theme from `app/globals.css`. Event logos and covers remain supported branding data without overriding interface colors or fonts. Stored `theme_preset` and `accent_color` fields remain for compatibility only; there is no user-, role-, or event-dependent UI theme resolver or chooser. No database migration is needed for this restoration.

## Time and localization

- Each event stores an IANA timezone.
- Schedule calculations, lifecycle labels, and notification timing use the event timezone.
- Display language and date order follow the browser locale.
- Events may span multiple calendar days.

## Notifications and jobs

Scheduled work must be set-based and limited to published, non-archived, non-suspended events. Schedule timing does not automatically create attendee notifications. Manual operational alerts remain event scoped and auditable. Free-tier email guards are enforced before enqueueing delivery.

## Account deletion

Self-service deletion anonymizes personal identity rather than deleting event history. A user must first transfer or archive owned active events. Profile fields, social links, auth identity, and active reachability are removed; membership, audit, and delivery records retain anonymous/tombstone references where required.

## Migration strategy

1. Add tenant foundations while the feature flag is off.
2. Backfill the existing AWS event as an archived event, its current admin as owner and initial super admin, and existing non-admin profiles as attendees.
3. Scope every existing feature table before allowing creation of multiple events. Advanced AWS-only features may initially remain read-only.
4. Quarantine undocumented remote `merch_*` objects: document them and revoke client access, but do not integrate or delete them without a separate decision.
5. Build and verify the scoped route tree in preview/staging.
6. Enable the feature flag, redirect legacy paths, observe, then remove obsolete compatibility code.
7. After stabilization, create a clean baseline for fresh environments. Supabase migration squashing must be reviewed because DML, cron jobs, Storage buckets, and secrets are not preserved automatically.

The historical duplicate-table migration involving `20260902120000_social_profiles.sql` is not edited after application. It is addressed by the later verified baseline.

## Performance baseline

- Index all tenant foreign keys and common `(event_id, status/time)` access patterns.
- Prefer set-based queries over per-row loops.
- Paginate event rosters, audits, and delivery logs.
- Keep Realtime subscriptions event scoped and opt-in.
- Treat the initial free plan as a pilot; the design target is roughly 100 concurrent events and 10,000 active attendees after appropriate service upgrades.
