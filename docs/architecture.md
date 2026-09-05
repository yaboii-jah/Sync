# Architecture Context

## Stack

| Layer | Technology | Role |
| --------- | --------------------------- | ------ |
| Framework | Next.js | Pages, routing, server-side rendering, API routes |
| Backend / DB | Supabase (Postgres) | Database, Auth, Realtime, Row Level Security |
| Auth | Supabase Auth — `google` | Sign in with Google (OpenID Connect). Supplies `name` and `picture`, which `handle_new_user` already reads |
| Installable PWA | Hand-authored static service worker (`public/sw.js`) + web manifest | Static icon/manifest caching, Web Push, and home-screen install. Authenticated routes and Next.js route data are never cached. (Note: `next-pwa`/`@serwist/next` are webpack plugins and incompatible with Next 16's default Turbopack builds — do not reintroduce them) |
| Push Delivery | Web Push API — pg_cron → `notifications` INSERT → pg_net webhook → `send-push` Edge Function → FCM/Web Push | Notifications when the app isn't open |
| Hosting (typical pairing, not yet finalized) | Vercel (frontend) + Supabase Cloud (backend) | Deployment |

## System Boundaries

- `app/` — Next.js routes for attendee screens, a public `/c/[token]` networking-card route outside the attendee shell, plus a separate `/admin` route group with its own responsive operations shell. Admin routes cover the dashboard, immediate notification composer/history/delivery results, session override controls, read-only attendee search, and mutation audit history.
- Root `proxy.ts` — Next.js 16's renamed middleware convention; refreshes Supabase sessions and gates routes. `/auth/*` (OAuth callback), `/`, `/login`, and `/c/*` are exempt from gating; proxy redirects must strip query params so OAuth codes can't leak into `/login`
- `lib/supabase/` — Supabase client setup, generated database types, and typed queries/mutations for program flow, directory, quick links, notifications, and profiles
- `components/` — Shared UI building blocks: session cards, live status badges, QR networking card (supports LinkedIn, Instagram, Facebook, GitHub), directory + bio modals, desktop top navigation / side rail, and mobile bottom tab navigation
- `public/sw.js` + `public/manifest.webmanifest` + `public/icons/` — hand-authored service worker (static PWA asset caching + push/notification-click handlers), PWA manifest, and icons; authenticated pages and Next.js route data are deliberately excluded from caches, and the service worker is source code, never build-generated

## Storage Model

- **Database (Supabase Postgres)**: attendee content plus the finalized event theme and parallel schedule, an admin allowlist, recipient snapshots, durable push dispatch/delivery results, session override metadata, and append-only admin audit events. Session/event statuses normally derive from schedule times every minute; a Start or End override is authoritative until an admin resumes automatic mode. Notifications snapshot recipients transactionally so feed visibility, history, and push delivery use the same audience. Admin mutations run through narrowly granted, idempotent database functions that verify `auth.uid()` against the allowlist and append audit data in the same transaction. `profiles.pass_type` remains dormant with its existing default and is not an application capability.
- **Alerts and push delivery**: attendees can select only notifications for which they have a `notification_recipients` row. Automatic session alerts snapshot bookmarkers, admin broadcasts snapshot every profile, and selected sends snapshot explicit profile IDs. A durable dispatch is claimed idempotently by the Edge Function, which loads canonical recipients, records per-device push-service acceptance/failure, records recipients with no subscription in aggregate results, and prunes 404/410 endpoints. “Delivered” in admin UI means accepted by the push service, not confirmed display on a device.
- **Networking cards**: one `networking_cards` row per profile, created by trigger, holding a stable high-entropy `public_token` and an `is_public` implementation flag derived transactionally from whether links exist. Links live in `social_profiles`, one row per supported network per attendee, each constrained to an approved profile or platform-native share URL. The QR always encodes `/c/<public_token>`; profile edits do not change it. Saving at least one link activates the card, while clearing the last link disables every existing QR copy without changing the code. The scanner route is public bearer access, returns data only through the narrow `get_public_networking_card` function, and is marked `noindex`; direct anonymous table access remains revoked. An authenticated owner may use `/c/<public_token>?preview=1` to inspect the same card view when links exist.
- **Blob/File Storage**: not yet needed — profile photos come directly from Google OIDC metadata as external URLs; speaker/sponsor photos can stay as external URLs or move to Supabase Storage later if that becomes necessary.
- **Bookmark lifecycle**: attendees can bookmark only sessions that have not finished. The scheduled status job removes finished-session bookmark rows after creating the ended notification; the UI filters them immediately from My Flow based on the device clock. Overlapping bookmarks are allowed; a conflict is any half-open interval overlap (`other.start_time < target.end_time` and `other.end_time > target.start_time`) and is derived from the current schedule rather than stored.

## Auth and Access Model

- Every user signs in via Supabase Auth using Google (OIDC) — no separate registration form. Social profile URLs (LinkedIn, Instagram, Facebook, GitHub) are optional networking data an attendee manages in Account Settings; Connect summarizes the configured networks, provides a preview of the active card, and displays its stable QR
- Administrators use the same sign-in but gain operational access only through an out-of-band `admin_users` allowlist; attendee metadata and pass type never grant admin access
- Each user's profile is a single row tied 1:1 to their auth identity — no shared or delegated ownership
- Attendees have read-only access to sessions, speakers/sponsors, and notifications, enforced via Row Level Security — not just app-level checks. Anyone holding an active networking-card token may resolve only that card's name, photo, and selected links through a narrowly granted function
- A user can only write to their own profile row, their own My Flow bookmarks, their own push subscriptions, and their own alert read state — nothing else
- Allowlisted admins can perform only the approved event-day mutations through audited database functions; general content management remains outside the app

## Invariants

1. Session, speaker/sponsor, and notification tables have no client-side write path — RLS enforces read-only access for attendees, with no app-level admin bypass
2. Session status derives from schedule data unless an allowlisted administrator has set a persistent Start or End override; Resume Auto clears that override and recomputes from schedule
3. A user can only ever modify their own profile row, their own My Flow bookmarks, their own push subscriptions, and their own alert read state — never another user's rows or any content table; the scheduled status job may remove finished-session bookmark rows as system cleanup
4. Admin access is enforced in the database for every read and mutation; hiding `/admin` UI is never treated as authorization
5. Pushes are triggered only by schedule automation or audited admin mutations, and every push audience must match an immutable recipient snapshot
6. Admin audit rows are append-only, and retries of the same mutation request cannot create duplicate notifications or status side effects
7. Public networking access is bearer-token scoped: anonymous clients have no direct table grants, cards with no links and unknown cards are indistinguishable, and a card reveals only the owner's display name, photo, and explicitly saved social links
8. The finalized event may have concurrent sessions; attendee schedule groups equal-start sessions, and the attendee hero and admin dashboard expose all published current or earliest-next choices rather than silently selecting one
9. My Flow overlap warnings do not block a bookmark, and automatic notifications remain independently targeted to bookmarkers for each saved session
