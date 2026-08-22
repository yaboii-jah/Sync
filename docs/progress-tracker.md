# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Planning — no implementation started yet

## Current Goal

- Finalize initial planning docs, then begin building the core attendee-facing app (LinkedIn sign-in, program flow, automatic notifications, networking, speaker/sponsor directory, quick links) with Next.js + Supabase and PWA support

## Completed

- Project overview defined: purpose, user flow, user stories, feature list, scope (project-overview.md)
- Architecture defined: stack, system boundaries, storage model, auth/access model, invariants (architecture.md)
- Code standards defined (code-standards.md)
- Home screen layout redesign concept: bottom tab navigation, card-based light theme, "happening now" dashboard (diverges from the original Flowgram's dark, list-heavy layout)
- Auth Unit 1: `@supabase/supabase-js` + `@supabase/ssr` installed; `.env.local`/`.env.example`; `lib/supabase/` browser + server clients with env validation; root `proxy.ts` (Next.js 16 convention — middleware renamed) refreshing sessions and gating all routes except `/` and `/login`; placeholder `/login` page; build/lint pass, redirect behavior verified against the live Supabase project
- Decisions made during auth planning: three-unit slice (clients/proxy → schema+RLS → auth UI); blocking onboarding gate for first-time LinkedIn URL capture; stub `/home` post-login target; functional-only login/onboarding UI this phase (ceremonial landing is a separate unit); basic sign-out included; `profiles.pass_type` column included in migration; loose `linkedin.com/in/` URL validation
- Auth Unit 2: Supabase CLI linked to project (Flowgram / `mygybolhwoeckrgczclm`); migration `20260822090000_create_profiles.sql` pushed — `profiles` table (id → auth.users, name, photo_url, validated linkedin_url, pass_type default 'regular', timestamps), RLS enabled with select/update-own policies using `(select auth.uid())`, `handle_new_user` trigger auto-creating profiles from auth metadata, `updated_at` trigger; `database.types.ts` regenerated via CLI into `lib/supabase/` and typed clients wired up; migration list verified local = remote. Live RLS behavior test deferred until a real authenticated user exists (needs LinkedIn provider)
- Auth Unit 3: dark-only token foundation in `globals.css` (brand palette as Tailwind v4 `@theme` tokens, Lato via `next/font`); functional landing page with Get Started; `/login` with LinkedIn sign-in server action; `/auth/callback` route handler exchanging the OAuth code and routing to onboarding vs home based on profile state; blocking `/onboarding` gate with validated LinkedIn URL save (client form via `useActionState`, server-side re-validation, DB check constraint as backstop); stub `/home` showing identity + sign-out (requires complete profile via `requireCompleteProfile` helper); proxy redirects signed-in users from `/login` to `/home`; build/lint pass, route protection smoke-tested. Ceremonial landing treatment deliberately deferred to its own design unit

## In Progress

- Auth phase: Units 1–3 complete — auth feature unit done within scope
- Blocked for live end-to-end verification: LinkedIn Developer app with OIDC product approval + provider credentials in Supabase dashboard (Auth → Providers → LinkedIn). Once configured, verify: sign-in → profile auto-created by trigger → onboarding gate → URL save → home; then re-run RLS behavior checks with the real session

## Next Up

- Scaffold the Next.js + Supabase project
- Implement LinkedIn sign-in via Supabase Auth (`linkedin_oidc`), including the one-time LinkedIn profile URL capture step

## Open Questions

- App name not yet finalized (candidates discussed: Flowgram Campus, Pulse/EventPulse, Nimbus, Orbit, Loop, Sync)
- Hosting not yet finalized — Vercel + Supabase Cloud is the assumed pairing, not a locked decision
- Workshop registration system design (slot concurrency, QR check-in flow) still unaddressed in detail — deferred until that phase starts

## Architecture Decisions

- **Next.js + Supabase, with PWA integration** — chosen for a single stack covering frontend, auth, database, and realtime, plus an installable home-screen experience for attendees
- **LinkedIn OAuth via Supabase's `linkedin_oidc` provider for sign-in** — auto-fills name, email, and photo; the LinkedIn profile URL still needs a one-time manual entry because standard OIDC scopes don't expose it, and full profile API access requires LinkedIn Partner Program approval
- **No custom admin/organizer interface** — session, speaker, and notification data is managed directly in the Supabase database instead of through a built admin app, to keep the initial build focused on the attendee-facing experience
- **Notifications limited to fully automatic session start/end alerts** — schedule-change alerts and freeform organizer announcements (semi-manual/manual types) were dropped to keep the notification system entirely data-driven with no posting workflow to build
- **Workshop registration deferred to a later phase** — the 3-workshop, 39-slot, QR-check-in system (with a decided ~24h Pro-pass early-access window) is out of scope for the initial build
- **Two-layer realtime design** — Supabase Realtime (Postgres change subscriptions) keeps the app in sync while open; Web Push API via the service worker handles notifications when the app is closed. These are treated as separate systems, not one feature

## Session Notes

- Three planning docs are in place: project-overview.md, architecture.md, code-standards.md — all reflect the current trimmed scope (no admin side, no workshop registration, automatic-only notifications)
- A Home screen mockup exists showing the proposed redesigned layout (bottom tabs, dashboard-style home) as a reference for the actual build
- App naming is still open — no name has been chosen yet
- Next session should pick up at project scaffolding and the LinkedIn sign-in flow
