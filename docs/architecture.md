# Architecture Context

## Stack

| Layer | Technology | Role |
| --------- | --------------------------- | ------ |
| Framework | Next.js | Pages, routing, server-side rendering, API routes |
| Backend / DB | Supabase (Postgres) | Database, Auth, Realtime, Row Level Security |
| Auth | Supabase Auth — `linkedin_oidc` | Sign in with LinkedIn (OpenID Connect) |
| Offline / Installable | PWA (`next-pwa` or `@serwist/next`) | Service worker, manifest, home-screen install |
| Push Delivery | Web Push API (via service worker) | Notifications when the app isn't open |
| Hosting (typical pairing, not yet finalized) | Vercel (frontend) + Supabase Cloud (backend) | Deployment |

## System Boundaries

- `app/` — Next.js routes for all attendee-facing screens: Home, Session Detail, Notifications, Connect, More, Account Settings
- `lib/supabase/` — Supabase client setup and typed queries/mutations for sessions, speakers, notifications, and profiles
- `components/` — Shared UI building blocks: session cards, live status badges, QR code display, tab navigation
- `public/` + service worker config — PWA manifest, icons, and the service worker handling offline caching and push notification delivery

## Storage Model

- **Database (Supabase Postgres)**: profiles, events, sessions, session-speaker links, speakers/sponsors, notifications, and quick links. Deferred workshop tables (workshops, workshop slots, workshop registrations) will live here too once that phase starts.
- **Blob/File Storage**: not yet needed — profile photos come directly from LinkedIn's OAuth response as external URLs; speaker/sponsor photos can stay as external URLs or move to Supabase Storage later if that becomes necessary.

## Auth and Access Model

- Every user signs in via Supabase Auth using LinkedIn (OIDC) — no separate registration form beyond a one-time LinkedIn profile URL entry
- Each user's profile is a single row tied 1:1 to their auth identity — no shared or delegated ownership
- Attendees have read-only access to sessions, speakers/sponsors, and notifications, enforced via Row Level Security — not just app-level checks
- A user can only write to their own profile row (name, LinkedIn URL)
- There is no admin/organizer role in the app itself — session, speaker, and notification data is managed directly in the database, outside the app's access model entirely

## Invariants

1. Session, speaker/sponsor, and notification tables have no client-side write path — RLS enforces read-only access for attendees, with no app-level admin bypass
2. Session status changes are always derived from schedule time/status data — never from a manually typed notification
3. A user can only ever modify their own profile row, never another user's
4. No feature may depend on a custom admin interface, since none is being built for this version
5. Push notifications are only ever triggered by a session status change — there is no freeform announcement-sending path in this version
