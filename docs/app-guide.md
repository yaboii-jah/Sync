# Sync App Guide

## What Sync is becoming

Sync is one PWA that hosts many isolated event experiences. A signed-in person can create events, administer events they were invited to, attend other events, and revisit archived events without maintaining separate accounts.

The approved multi-tenant experience is being built in stages behind `MULTI_TENANT_PLATFORM_ENABLED`. Until cutover, the existing AWS event routes remain the production experience. See `docs/progress-tracker.md` for the exact implementation state.

## Navigation map

- `/` introduces the Sync platform.
- `/events` is the signed-in event hub.
- `/e/[slug]` is an event's public page.
- `/e/[slug]/*` contains its attendee experience.
- `/manage/[slug]/*` contains its organizer workspace.
- `/events/new` creates an authenticated private draft. `/manage/[slug]` currently supports overview, core basics, attendee preview, publish, archive, and untouched-draft deletion; branding uploads, content editing, and team controls are later units.
- `/super-admin/*` contains platform operations.
- `/settings` contains global account settings.

## Event hub

The hub chooses a relevant event using lifecycle and recency, then presents `Open current event` as the dominant action. `Attending` and `Managing` are separate sections because event roles are contextual. `Create event` is available to every eligible signed-in user, subject to platform quotas.

## Creating and publishing an event

A new event starts as a draft. The owner completes basics, venue, dates, IANA timezone, branding, schedule, speakers, and team setup. Preview and public pages use the fixed original Sync theme, as do organizer and attendee screens. Publishing makes the unlisted public URL readable and allows attendees to join.

An event can later be archived. Suspension is independent and controlled by a platform super admin. Archived events are read-only memories; suspended events are unavailable except to authorized platform operations.

## Roles

- The owner has full event control, can manage admins, and can transfer ownership to an active admin.
- Admins manage content, attendees, communications, and event operations but cannot silently take ownership.
- Attendees use published event features and can leave the event.
- Super admins manage the platform, not ordinary event content. Temporary support access is reason-gated, visible, audited, and time-limited.

## Authentication

Google and email magic links are supported. Magic-link callbacks exchange the PKCE token at `/auth/confirm`. A new email user supplies a display name; photo and social URLs are optional. Invitations bind to the exact verified email address.

## Event capabilities

The core release includes event identity and branding, public pages, membership, team invitations, schedule, speakers, bookmarks, event management, and platform oversight. Alerts, workshop seats, networking, feedback, raffle, and Photo Booth are migrated afterward but must be event scoped before multiple tenant creation is enabled.

## Privacy and retention

Organizers see only profile data needed for their event. Attendee-selected social links are event specific even though the URLs are stored globally. Leaving deactivates membership without erasing history. Account deletion anonymizes retained event records after owned active events are transferred or archived.

## Legacy AWS event

AWS Student Community Day Mega Manila 2026 is migrated as an archived event with its original branding and history. Its stored theme field remains compatibility-only and its Photo Booth frames are legacy-only. Event logos and covers remain allowed; interface colors and fonts are shared globally. Historical product documents are in `docs/archive/aws-student-community-day-2026/`.

## Local organizer acceptance

Start the app on port `3100` with local Supabase credentials and `MULTI_TENANT_PLATFORM_ENABLED=true`, then run `node scripts/smoke-organizer.mjs`. The Windows probe uses hidden headless Edge, requires Docker/local Supabase, rejects remote API URLs, and removes only its temporary UUID-scoped fixtures. It does not enable or migrate a remote deployment.
