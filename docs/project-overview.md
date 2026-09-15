# Sync

## Product definition

Sync is a multi-tenant event companion platform for organizers who want a polished event experience without building a custom app. Each event is an isolated tenant with its own public page, schedule, speakers, team, attendees, brand, and operational data. Sync itself remains a single installable PWA.

The platform is not tied to AWS or to student events. AWS Student Community Day Mega Manila 2026 is retained as an archived legacy tenant and migration fixture.

## Users and roles

- **Platform super admin** manages platform health, users, events, suspensions, quota overrides, platform feedback, and audited support access.
- **Event owner** creates and ultimately controls one event. An event has exactly one owner.
- **Event admin** helps manage an event after accepting an email-bound invitation.
- **Attendee** explicitly joins an event and uses its attendee experience.
- A person may hold different roles in different events.

## Product goals

1. Let any signed-in user create and brand an event.
2. Give each event a safe, isolated management and attendee experience.
3. Let signed-out visitors understand a published event before joining.
4. Make the attendee's current event the dominant signed-in experience.
5. Preserve useful event memories after an event is archived.
6. Support event operations without weakening database isolation or auditability.

## Core journeys

### Attendee

1. Open an unlisted event URL.
2. Review the published event page, schedule, and speakers.
3. Sign in with Google or an email magic link.
4. Explicitly join the event.
5. Use the schedule, bookmarks, alerts, networking, and other enabled event features.
6. Reopen an archived event later in read-only memories mode.

### Organizer

1. Sign in and create a draft event.
2. Add event identity, venue, dates, IANA timezone, logo/cover branding, sessions, and speakers. All events share the original Sync UI theme.
3. Invite admins by verified email.
4. Preview and publish the event.
5. Operate the live event, moderate membership, and review event feedback.
6. Archive the event when it is complete.

### Platform operator

1. Review users, events, quotas, audit records, and platform feedback.
2. Suspend an unsafe event without changing its lifecycle.
3. Start a reason-gated, audited support session lasting at most 60 minutes.

## Tenant and discovery model

- An event is the top-level tenant in v1; organizations/workspaces are out of scope.
- Published events are reachable by scoped URL but are unlisted and `noindex` by default.
- There is no public event directory in v1.
- Joining is explicit and requires authentication.
- Signed-in `/events` separates events a user manages from events they attend.

## Event state

- Lifecycle is `draft`, `published`, or `archived`.
- Suspension is a separate platform-controlled state.
- Upcoming, live, and ended labels are derived from event dates in the event timezone.
- Only a draft that has never been published and has no meaningful activity may be deleted; other events are archived.

## Release scope

### Core multi-tenant release

- Event hub and event creation
- Public event pages and explicit joining
- Event branding
- Owner/admin/attendee membership and admin invitations
- Schedule, speakers, and bookmarks
- Event management workspace
- Platform super-admin workspace
- Safe migration of the legacy AWS event

### Follow-up parity

- Push notifications and operational alerts
- Workshop seats
- Event-scoped networking and scan history
- Event feedback and raffle workflows
- Photo Booth with generated event-neutral frames

## Non-goals for v1

- Organization workspaces
- Public event marketplace or directory
- Custom domains
- Billing
- Granular custom staff roles
- Attendee approval queues
- Full interface localization
- Platform-wide broadcasts

## Operating constraints

- Initial operation targets Supabase and Resend free tiers; those limits are pilot constraints, not architectural capacity promises.
- Default safeguards are 5 active owned events per user, 20 active admins per event, 500 sessions per event, and 10 MB branding uploads before normalization.
- Email delivery uses a soft platform ceiling of 80 messages per day and 10 admin-invite emails per event per day. Google sign-in and copy-link invitation fallback remain available.
