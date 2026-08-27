# Architecture Context

## Stack

| Layer | Technology | Role |
| --------- | --------------------------- | ------ |
| Framework | Next.js | Pages, routing, server-side rendering, API routes |
| Backend / DB | Supabase (Postgres) | Database, Auth, Realtime, Row Level Security |
| Auth | Supabase Auth — `linkedin_oidc` | Sign in with LinkedIn (OpenID Connect) |
| Offline / Installable | Hand-authored static service worker (`public/sw.js`) + web manifest | Service worker, offline shell caching, home-screen install. (Note: `next-pwa`/`@serwist/next` are webpack plugins and incompatible with Next 16's default Turbopack builds — do not reintroduce them) |
| Push Delivery | Web Push API — pg_cron → `notifications` INSERT → pg_net webhook → `send-push` Edge Function → FCM/Web Push | Notifications when the app isn't open |
| Hosting (typical pairing, not yet finalized) | Vercel (frontend) + Supabase Cloud (backend) | Deployment |

## System Boundaries

- `app/` — Next.js routes for all attendee-facing screens: `/home` (dashboard + session-detail modal), `/alerts` (notifications feed + session-detail modal), `/connect` (QR networking card), `/more` (quick links and speakers/sponsors directory + bio modals), `/settings` (name + LinkedIn URL editing, reached from the authenticated header or desktop rail), plus `/onboarding` (first-login LinkedIn URL capture)
- Root `proxy.ts` — Next.js 16's renamed middleware convention; refreshes Supabase sessions and gates routes. `/auth/*` (OAuth callback), `/`, and `/login` are exempt from gating; proxy redirects must strip query params so OAuth codes can't leak into `/login`
- `lib/supabase/` — Supabase client setup, generated database types, and typed queries/mutations for program flow, directory, quick links, notifications, and profiles
- `components/` — Shared UI building blocks: session cards, live status badges, QR networking card, directory + bio modals, side rail / bottom tab navigation
- `public/sw.js` + `public/manifest.webmanifest` + `public/icons/` — hand-authored service worker (offline shell caching + push/notification-click handlers), PWA manifest, and icons; the service worker is source code, never build-generated

## Storage Model

- **Database (Supabase Postgres)**: profiles, events, sessions, session-speaker links, speakers/sponsors, notifications, quick links, My Flow bookmarks (attendee-saved sessions), push subscriptions (one row per attendee device with a persistent `device_id` and endpoint, own-row RLS), and alert read state (one `alert_read_state` row per attendee, storing `last_read_at` under own-row RLS). Session/event statuses flip automatically from schedule times via a pg_cron job running every minute — no manual posting, no drift beyond ~60s — and each real session flip also writes a `notifications` row from agreed templates. The same job writes a `session_reminder` notification ~10 minutes before each session starts (deduplicated via `sessions.reminder_sent_at`). Notification types: `session_live`, `session_ended`, `session_reminder`, `announcement` (organizer-inserted via SQL — there is no announcement UI). Capacity columns are deferred together with workshop tables. Deferred workshop tables (workshops, workshop slots, workshop registrations) will live here too once that phase starts. LinkedIn profile URLs must be valid `linkedin.com/in/` profile URLs; onboarding and Settings normalize accepted input to `https://www.linkedin.com/in/<slug>` before storage.
- **Alerts and push delivery**: every `notifications` row appears in the authenticated Alerts feed. `alert_read_state.last_read_at` provides the unread count, which is refreshed from Realtime notification inserts and cleared when the attendee opens Alerts. Session-linked feed entries open the shared session-detail modal; announcements remain static cards. For background delivery, a pg_net AFTER-INSERT trigger POSTs every notification to the `send-push` Edge Function (shared secret stored in `private.app_secrets`, mirrored into the function's `PUSH_WEBHOOK_SECRET`; the function authenticates via that header, so the gateway runs with `--no-verify-jwt`). The webhook payload carries `related_session_id` and a private `target_user_ids` snapshot: session-linked notifications go only to attendees who bookmarked that session when the notification was created, while announcements (no session link) fan out to every stored subscription. The snapshot preserves `session_ended` recipients before the scheduled cleanup removes finished-session bookmarks. Messages are VAPID-signed (keys in function secrets, subject `mailto:jahmelldorias17@gmail.com`), and endpoints answering 404/410 are pruned automatically.
- **Blob/File Storage**: not yet needed — profile photos come directly from LinkedIn's OAuth response as external URLs; speaker/sponsor photos can stay as external URLs or move to Supabase Storage later if that becomes necessary.
- **Bookmark lifecycle**: attendees can bookmark only sessions that have not finished. The scheduled status job removes finished-session bookmark rows after creating the ended notification; the UI filters them immediately from My Flow based on the device clock.

## Auth and Access Model

- Every user signs in via Supabase Auth using LinkedIn (OIDC) — no separate registration form beyond a one-time LinkedIn profile URL entry
- Each user's profile is a single row tied 1:1 to their auth identity — no shared or delegated ownership
- Attendees have read-only access to sessions, speakers/sponsors, and notifications, enforced via Row Level Security — not just app-level checks
- A user can only write to their own profile row, their own My Flow bookmarks, their own push subscriptions, and their own alert read state — nothing else
- There is no admin/organizer role in the app itself — session, speaker, and notification data is managed directly in the database, outside the app's access model entirely

## Invariants

1. Session, speaker/sponsor, and notification tables have no client-side write path — RLS enforces read-only access for attendees, with no app-level admin bypass
2. Session status changes are always derived from schedule time/status data — never from a manually typed notification
3. A user can only ever modify their own profile row, their own My Flow bookmarks, their own push subscriptions, and their own alert read state — never another user's rows or any content table; the scheduled status job may remove finished-session bookmark rows as system cleanup
4. No feature may depend on a custom admin interface, since none is being built for this version
5. Pushes are triggered only by the automation (session status flips and the ~10-minute-before reminders) or by organizer-inserted `announcement` rows in the database — never by app users through the UI
