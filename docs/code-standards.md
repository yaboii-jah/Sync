# Code Standards

## General

- Keep modules small and single-purpose — a session card component shouldn't also know how to format notification text
- Fix root causes, don't layer workarounds — if Realtime data arrives in the wrong shape, fix the query or the schema, don't patch it in the UI layer
- Don't mix unrelated concerns in one component or route — auth logic, data fetching, and presentation stay separated
- Don't build toward deferred scope such as workshop registration or general content management; admin work remains limited to the approved event-operations surface
- Treat `datetime-local` values as Asia/Manila wall-clock input at the boundary; never let the browser or server default timezone reinterpret an event time
- Keep attendee queries explicitly publication-filtered even when RLS also permits allowlisted admins to read drafts
- Two relative-time formatters in `lib/format.ts` coexist on purpose and must not be merged into one. `formatRelativeTime` keeps the long vocabulary (`5 hours ago`) and serves `/alerts`, the five admin routes, and the session detail modal. `relativeSessionLabel` serves the `/home` session card with the short vocabulary (`5 hr ago`). The split exists because a single vocabulary would change screens that were out of scope for the home UI fix batch. The known, accepted consequence is that an open session detail modal reads `ended 5 hours ago` while the card behind it reads `ended 5 hr ago`. Unifying them is a decision about those other screens first, not a refactor of these two functions

## TypeScript

- Strict mode is required throughout the project
- Avoid `any` — use explicit interfaces or narrowly scoped types, especially for Supabase table rows and LinkedIn OAuth payloads
- Validate unknown external input at system boundaries before trusting it (LinkedIn OAuth response fields, Realtime payloads) rather than assuming shape

## Next.js

- Default to server components; add `"use client"` only where browser interactivity is required (e.g. the QR code display, the tab bar, live-updating badges)
- Keep any route handler focused on a single responsibility
- Don't create a Next.js API route as a passthrough for something the Supabase client can already do directly under RLS — only add one when logic must run server-side (e.g. triggering a Web Push notification on a session status change)

## Styling

- Use CSS custom property tokens for color and spacing — no hardcoded hex values except functional canvas/SVG media APIs that require an explicit color string
- Follow the fixed dark AWS Student Community Day theme in `ui-context.md`; do not add a light, system, or per-user appearance mode. Standard surfaces are tonal and borderless; gold is reserved for focal, live, selected, and primary emphasis.
- Use local primitives from `components/ui/`; use React Aria Components directly only when the local primitive does not cover an accessible interaction
- Status badges (Not Started / Ongoing / Finished) use a consistent color mapping wherever they appear — schedule, notifications, session detail
- Browser media work must invalidate stale async requests and stop tracks on hidden-page and unmount paths; never leave camera ownership to a route transition
- Shared attendee actions such as profile options and history-aware Back behavior belong in reusable components rather than route-specific copies

## API Routes / Edge Functions

- Validate and parse request input before any logic runs
- Enforce auth before any mutation — no route trusts a client-supplied user ID
- Every admin mutation must verify the database allowlist, use a request UUID for idempotency, and append its audit record transactionally
- Destructive admin actions require a local `AlertDialog`, and database functions must enforce the same eligibility rule independently of the UI
- Return consistent, predictable response shapes across all routes
- Schedule synchronization must not create attendee notifications; only audited organizer announcements and explicitly confirmed manual status actions may enter the notification pipeline
- Reserve custom routes and Supabase Edge Functions for what RLS and the Supabase client can't handle directly — primarily, sending Web Push for an already-created organizer notification

## Data and Storage

- Metadata (sessions, speakers/sponsors, notifications, profiles) belongs in the Supabase Postgres database
- Profile and speaker photos are referenced by external URL (e.g. from LinkedIn) — no blob storage needed unless that changes later
- Don't store large or generated content directly in the database
- Administrators do not receive broad table-write grants; privileged operations use narrowly granted functions with explicit allowlist checks

## File Organization

- `app/` — separate route groups for attendee-facing screens and the protected admin operations workspace
- `lib/supabase/` — Supabase client setup and typed queries/mutations for sessions, speakers, notifications, and profiles
- `components/` — Shared UI building blocks: session cards, status badges, QR code display, tab navigation
- `public/` + service worker config — PWA manifest, icons, and the service worker handling static-asset caching and push delivery; never cache authenticated routes or Next.js route data
