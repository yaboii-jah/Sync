# Sync Developer Guide

This is the short technical orientation for Sync. Read it with `docs/progress-tracker.md`, which is the source of truth for what is implemented today and what remains.

## What the application is

Sync is a Next.js PWA for running multiple isolated events from one application and Supabase project. An event is the tenant boundary. A person can own or administer one event and attend another with the same account; those roles never grant access across events.

The application is moving additively from the completed AWS Student Community Day Mega Manila 2026 app to the reusable platform. `MULTI_TENANT_PLATFORM_ENABLED` switches entry into the new route tree and defaults to `false`. It is a rollout control, not a security boundary. The original event and compatibility routes remain while migration work is incomplete.

## System at a glance

- **Next.js 16 / React 19** render App Router pages, Server Components, route handlers, and Server Actions.
- **Supabase Auth** provides Google OAuth and session cookies.
- **Supabase Postgres** stores global identities and tenant-owned event data. RLS, explicit grants, and audited RPCs enforce authorization.
- **Supabase Storage and Realtime** hold event assets and deliver scoped live updates.
- **Tailwind CSS and React Aria** provide styling and accessible interactions. `app/globals.css` owns the fixed Sync theme; `tokens.css` supplies shared platform aliases.
- **Docker Desktop** runs the local Supabase services. It is a development dependency, not part of the attendee-facing production app.

A typical request flows from a browser to a Next.js route, then through a server-side authorization/query module to Supabase. UI visibility is never treated as authorization: protected actions and data-access leaves authenticate again, and the database enforces tenant rules independently.

## Repository map

| Path | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, loading/error states, Server Actions, OAuth callbacks, and generated social images |
| `components/` | Shared UI grouped by attendee, organizer, admin, platform, and feature |
| `lib/events/` | Event-domain types, validation, routing, and organizer rules |
| `lib/supabase/` | Browser/server clients, authentication, authorization, generated database types, and query modules |
| `supabase/migrations/` | Forward-only database history; never edit a migration already applied remotely |
| `supabase/tests/` | pgTAP coverage for RLS, grants, RPCs, and tenant isolation |
| `public/` | PWA files and static event assets |
| `scripts/` | Local utilities and repeatable browser acceptance probes |
| `docs/` | Product, architecture, UI, standards, rollout, schema inventory, and implementation status |

## Routes and roles

- `/` is the landing/authentication entry.
- `/events` lists events the signed-in user attends or manages; `/events/new` creates a private draft.
- `/e/[slug]` is an unlisted published event page; `/e/[slug]/home` is its scoped attendee entry.
- `/manage/[slug]/*` is the owner/admin workspace. Its implemented editors cover event basics, logo/cover branding, schedule sessions, speaker profiles, team administration, publication state, and session-speaker assignments.
- `/invite` is a public, noindex invitation entry. The secret remains in the URL fragment, so a matching signed-in account must explicitly accept it before gaining admin membership.
- Legacy attendee routes such as `/home`, plus `/admin/*`, remain compatibility paths during rollout.
- The planned `/super-admin/*` workspace is for platform operations and is separate from event administration.

The global identity lives in Supabase Auth. Event membership supplies the contextual `owner`, `admin`, or `attendee` role. Platform super-admin authority is separate. Every event-owned query and mutation must carry an `event_id`; knowing a slug or object ID is not permission.

Events move through `draft`, `published`, and `archived`. Suspension is an independent platform state. Archived and suspended management is read-only, and only an untouched, never-published draft may be deleted.

## Authentication and data boundaries

The sign-in button starts Google OAuth through Supabase. Google returns to the Supabase callback, which redirects to `/auth/callback`; that route exchanges the PKCE code, stores the session in cookies, and continues to the validated internal destination. Local provider credentials belong in ignored environment files and must never be committed.

`proxy.ts` refreshes cookies and performs optimistic navigation redirects. It does not authorize application data. New organizer routes use event-scoped authorization helpers, server actions validate untrusted form input, and sensitive writes call audited/idempotent database RPCs with caller-generated request UUIDs.

Database changes are forward-only. Tenant-owned relationships include `event_id`, preferably in composite foreign keys, so invalid cross-event relationships fail at the database boundary. Consult `docs/schema-inventory.md` before migrating a legacy domain.

Branding uploads use two Storage boundaries. The browser sends a JPEG, PNG, or WebP of at most 10 MB to a private, user-scoped staging path. A server action decodes and normalizes it with Sharp, uploads a versioned WebP delivery object, and calls an audited RPC to update the event. Delivery assets are public because they appear on the unlisted public event page; only an active event owner/admin can create, activate, replace, or remove them. Do not bypass the path helpers or replace immutable delivery objects in place.

Team invitations are issued by the event owner and are bound to the invitee’s exact verified email. Configure `RESEND_API_KEY` and `EVENT_INVITE_FROM_EMAIL` only in ignored deployment/local environment files to send email. Without them, the owner still receives a secure copyable link. See `docs/team-management-test-plan.md` for local manual QA.

## Local development

1. Install dependencies with `npm install` and start Docker Desktop.
2. Put local Supabase URL/key values in `.env.local`. Put OAuth provider secrets in the ignored root `.env` when referenced by `supabase/config.toml`.
3. Start the local backend with `npx supabase start`, then run the app with `npm run dev`.
4. Use the local Studio URL printed by Supabase to inspect local data. This project uses API port `45421`, Studio port `45423`, and Postgres port `45422` to avoid Windows-reserved dynamic ports. Local users and events do not affect production while the app points to `127.0.0.1:45421`.

Useful checks:

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
npx supabase test db
```

`scripts/smoke-organizer.mjs` is a local-only browser probe for tenant routing and organizer flows. It refuses a remote Supabase URL and cleans up only its own UUID-scoped fixtures.

## Delivery and current state

Code, database schema, and environment configuration are deployed separately. Pushing a branch does not copy local data, but CI may deploy that branch depending on hosting settings. Apply migrations to preview/staging first, repeat authorization and browser acceptance, and enable the multi-tenant flag only after the core acceptance gate passes. Never commit secrets or point local destructive tests at a hosted project.

Tenant foundations, audited operations, scoped program data, event routes, event creation, event basics, lifecycle controls, schedule/speaker management, tenant-scoped branding uploads, and team controls are locally verified. Full platform operations and remaining legacy feature migrations are still staged work. Use `docs/progress-tracker.md` for the exact current status rather than extending this guide with implementation history.

## Where to look first

- Product behavior: `docs/project-overview.md`
- System and security decisions: `docs/architecture.md`
- Current implementation and next unit: `docs/progress-tracker.md`
- Database migration status: `docs/schema-inventory.md`
- UI rules: `docs/ui-context.md`
- Implementation conventions: `docs/code-standards.md`

Update this guide after a major implementation only when developer-relevant behavior, architecture, routes, setup, security boundaries, deployment workflow, or repository structure changes. Replace stale statements instead of appending a changelog.
