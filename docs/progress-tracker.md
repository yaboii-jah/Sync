# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Program Flow dashboard UI (Unit 5) complete; next unit: Realtime sync (live status flips via Supabase Realtime subscriptions)

## Current Goal

- Finalize initial planning docs, then begin building the core attendee-facing app (LinkedIn sign-in, program flow, automatic notifications, networking, speaker/sponsor directory, quick links) with Next.js + Supabase and PWA support

## Completed

- Project overview defined: purpose, user flow, user stories, feature list, scope (project-overview.md)
- Architecture defined: stack, system boundaries, storage model, auth/access model, invariants (architecture.md)
- Code standards defined (code-standards.md)
- Home screen layout redesign concept: bottom tab navigation, card-based light theme, "happening now" dashboard (diverges from the original Flowgram's dark, list-heavy layout)
- Ceremonial Landing unit (post-auth design round): merged Landing/Login into one poster screen at `/` (`/login` is now a param-preserving shim); Perandory Semi-Condensed wired via `next/font/local` as `--font-display`; official design-system values extracted from aws-scd.cloud stylesheets and applied (atmosphere palette tokens, `.field` layered hero backdrop, lockup sheen sweep, eyebrow, gradient flourish, pastel-yellow pill CTA, film grain); comet shower falling diagonally with viewport-independent ~24° angle (shared `--len` travel vector), staggered negative delays, lingering-end variants via `--end-o`, static fallback under `prefers-reduced-motion`
- Auth Unit 4 / Program Flow schema (Unit 4): migrations `20260822130000_create_program_flow.sql` + `20260822131000_seed_program_flow.sql` pushed — `events`, `sessions` (title/description/room/start/end/status), `speakers_sponsors` (role-checked), `session_speakers` join, `my_flow_bookmarks` (own-row select/insert/delete RLS); read-only `TO authenticated` policies on content tables; pg_cron every-minute job `sync-program-flow-statuses` auto-flips session/event statuses from schedule times; placeholder seed loaded (event Sep 11 2026 9:30 AM–6 PM PHT at Asia Pacific College, 9 sessions incl. lunch, 8 speakers across all roles, 7 links) — real timeline swaps in later via SQL; `database.types.ts` regenerated; sync function verified executing (204), seed spot-checked
- Unit 5 / Program Flow dashboard UI: bottom tab shell (Home live; Alerts/Connect/More disabled); smart "Happening Now" hero card with four states (pre-event countdown, current-session glow, Up Next, event wrap) driven by device clock + Manila-time formatting (`lib/format.ts`); All ⇄ My Flow segmented toggle; session cards with shared StatusBadge mapping (not-started = yellow-green outline, ongoing = light-green pulse, finished = dimmed) and optimistic bookmark toggling through a `toggleBookmark` server action; modal session detail per ui-context patterns; typed query layer in `lib/supabase/queries/program-flow.ts`; `lucide-react` added for stroke icons
- Desktop split-view layout (`≥1024px`): 232px labeled left rail replaces the bottom tab bar (Perandory wordmark, gold hairline border, sign-out pinned); home splits into sticky hero pane (~38%) beside the schedule list; content capped at 1280px centered on ultrawides; mobile layout below the breakpoint untouched. Verified signed-in render at all widths
- Auth Unit 1: `@supabase/supabase-js` + `@supabase/ssr` installed; `.env.local`/`.env.example`; `lib/supabase/` browser + server clients with env validation; root `proxy.ts` (Next.js 16 convention — middleware renamed) refreshing sessions and gating all routes except `/` and `/login`; placeholder `/login` page; build/lint pass, redirect behavior verified against the live Supabase project
- Decisions made during auth planning: three-unit slice (clients/proxy → schema+RLS → auth UI); blocking onboarding gate for first-time LinkedIn URL capture; stub `/home` post-login target; functional-only login/onboarding UI this phase (ceremonial landing is a separate unit); basic sign-out included; `profiles.pass_type` column included in migration; loose `linkedin.com/in/` URL validation
- Auth Unit 2: Supabase CLI linked to project (Flowgram / `mygybolhwoeckrgczclm`); migration `20260822090000_create_profiles.sql` pushed — `profiles` table (id → auth.users, name, photo_url, validated linkedin_url, pass_type default 'regular', timestamps), RLS enabled with select/update-own policies using `(select auth.uid())`, `handle_new_user` trigger auto-creating profiles from auth metadata, `updated_at` trigger; `database.types.ts` regenerated via CLI into `lib/supabase/` and typed clients wired up; migration list verified local = remote. Live RLS behavior test deferred until a real authenticated user exists (needs LinkedIn provider)
- Auth Unit 3: dark-only token foundation in `globals.css` (brand palette as Tailwind v4 `@theme` tokens, Lato via `next/font`); functional landing page with Get Started; `/login` with LinkedIn sign-in server action; `/auth/callback` route handler exchanging the OAuth code and routing to onboarding vs home based on profile state; blocking `/onboarding` gate with validated LinkedIn URL save (client form via `useActionState`, server-side re-validation, DB check constraint as backstop); stub `/home` showing identity + sign-out (requires complete profile via `requireCompleteProfile` helper); proxy redirects signed-in users from `/login` to `/home`; build/lint pass, route protection smoke-tested. Ceremonial landing treatment deliberately deferred to its own design unit
- Live end-to-end verification of the auth unit against the production Supabase project: `linkedin_oidc` provider confirmed enabled; authorize endpoint redirects to LinkedIn's consent URL with correct scopes (`openid email profile`) and callback; admin-created test users confirmed the `handle_new_user` trigger auto-creates profiles seeded from auth metadata; RLS verified — auth user reads/updates own row only, anon sees nothing, cross-user select/update/delete all blocked, no client delete path; DB check constraint rejects non-LinkedIn URLs while accepting valid ones; `updated_at` trigger confirmed firing. App-level flow simulated with real session cookies in ssr format: signed-in user without LinkedIn URL is gated to `/onboarding`, after URL save reaches `/home`, signed-in users hitting `/login` bounce to `/home`. Test users deleted afterwards; database left clean
- Post-verification fixes from real-browser testing: OAuth redirect loop fixed in `proxy.ts` (matcher now excludes `/auth/*` so the OAuth callback is reachable while signed out; proxy redirects strip query params so stray codes can't leak into `/login`); `/auth/callback` surfaces exchange failures via terminal log + `?detail=` shown on the login page; `/login` self-heals stray `?code=` params by forwarding them to `/auth/callback`; flexible LinkedIn URL handling — loose client validation accepting http/https, www./m. subdomains, sub-page paths, and query params, with canonical storage (`https://www.linkedin.com/in/<slug>`) and migration `20260822110000` relaxing the DB check constraint to match

## In Progress  

- None. Auth feature unit fully verified end-to-end against the live project (LinkedIn provider configured and live). The only unautomatable step is the human LinkedIn consent screen — everything before and after it was verified programmatically.

## Next Up

- Realtime sync unit: Supabase Realtime subscriptions on `sessions` so status badges and the Happening Now hero flip live without refresh (built and verified independently per ai-workflow-rules)
- Notifications/push unit after Realtime lands
- Ceremonial Landing/Login brand treatment from `ui-context.md` (design-heavy; independent of Program Flow)

## Open Questions

- App name: resolved — **Sync** (per project-overview.md)
- Hosting not yet finalized — Vercel + Supabase Cloud is the assumed pairing, not a locked decision
- Workshop registration system design (slot concurrency, QR check-in flow) still unaddressed in detail — deferred until that phase starts

## Environment Setup Requirements

- **Supabase Auth redirect allowlisting**: GoTrue only honors OAuth `redirect_to` targets listed under Dashboard → Authentication → URL Configuration → Redirect URLs; anything else silently falls back to the Site URL and drops the auth code on an unhandled page. Required entries: `http://localhost:3000/auth/callback` for local dev, plus each deployed origin's `/auth/callback` when hosting is finalized. As a safety net, `/login` now detects a stray `?code=` query param and redirects it to `/auth/callback` so sign-in still completes.

## Architecture Decisions

- **Next.js + Supabase, with PWA integration** — chosen for a single stack covering frontend, auth, database, and realtime, plus an installable home-screen experience for attendees
- **LinkedIn OAuth via Supabase's `linkedin_oidc` provider for sign-in** — auto-fills name, email, and photo; the LinkedIn profile URL still needs a one-time manual entry because standard OIDC scopes don't expose it, and full profile API access requires LinkedIn Partner Program approval
- **No custom admin/organizer interface** — session, speaker, and notification data is managed directly in the Supabase database instead of through a built admin app, to keep the initial build focused on the attendee-facing experience
- **Notifications limited to fully automatic session start/end alerts** — schedule-change alerts and freeform organizer announcements (semi-manual/manual types) were dropped to keep the notification system entirely data-driven with no posting workflow to build
- **Workshop registration deferred to a later phase** — the 3-workshop, 39-slot, QR-check-in system (with a decided ~24h Pro-pass early-access window) is out of scope for the initial build
- **Two-layer realtime design** — Supabase Realtime (Postgres change subscriptions) keeps the app in sync while open; Web Push API via the service worker handles notifications when the app is closed. These are treated as separate systems, not one feature

## Session Notes

- Planning docs (project-overview.md, architecture.md, code-standards.md, ui-context.md, ai-workflow-rules.md) reflect current scope; implementation has caught up with the auth portion of the plan
- A Home screen mockup exists showing the proposed redesigned layout (bottom tabs, dashboard-style home) as a reference for the actual build
- App naming is still open — no name has been chosen yet
- Next session should pick up at the Program Flow schema unit; real event schedule data from organizers is needed for seed content (placeholders acceptable to start)
