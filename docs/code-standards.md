# Code Standards

## General

- Use TypeScript with strict types and avoid `any`.
- Prefer small server-first modules with explicit client boundaries.
- Keep route components focused on composition; put data access and authorization in feature modules.
- Use semantic names from the product model: event, membership, owner, admin, attendee, lifecycle, suspension.
- Do not hardcode a current event, tenant slug, event ID, timezone, or brand in reusable code.

## Next.js

- Read the matching guide in `node_modules/next/dist/docs/` before using or changing a Next.js API.
- Treat dynamic route `params` and `searchParams` according to the installed Next.js version; do not rely on older synchronous conventions.
- Proxy/middleware may improve navigation but is never the authorization boundary.
- Server actions and route handlers reauthenticate and reauthorize at the leaf.
- Keep the PWA manifest global unless the architecture document is intentionally revised.

## Tenant context

- Resolve an event from a validated slug at the route boundary.
- Pass a typed `EventContext` rather than loose slug/ID pairs through the component tree.
- Use `event_id` in every event-owned query and mutation, even when another key appears unique.
- Never infer authorization from knowing an event slug or from a client-supplied role.
- Centralize capability derivation in an `EventPermissions` type; UI checks are presentation only.

Required shared types include `EventContext`, `EventLifecycle`, `EventRole`, `MembershipStatus`, `EventThemePreset`, and `EventPermissions`.

## Supabase and Postgres

- Add schema changes through forward-only migrations; do not edit applied migrations.
- Enable RLS and define explicit grants for every Data API table.
- Index foreign keys and common tenant predicates.
- Prefer composite foreign keys containing `event_id` for relationships between tenant tables.
- Keep authorization checks in policies or audited database functions as well as application code.
- `security definer` functions set `search_path = ''`, schema-qualify all objects, and have execution revoked unless intentionally exposed.
- Use caller-provided UUIDs for idempotent sensitive mutations.
- Test cross-tenant denial, inactive membership denial, anonymous limits, and privileged paths.

## UI

- Use semantic theme tokens and existing primitives. The original Sync theme is fixed globally; user preferences, roles, and stored event presets/accents must not override it.
- Keep event logos and covers at the event shell/hero level; they never override shared UI colors or fonts.
- Preserve React Aria semantics, keyboard access, visible focus, reduced motion, and sufficient contrast.
- Avoid adding dependencies when a small existing primitive is sufficient.

## Validation and errors

- Validate all public input at the server boundary.
- Return user-safe errors and log structured diagnostic context without secrets or unnecessary PII.
- Treat slugs, emails, URLs, colors, dates, timezones, upload metadata, and invitation tokens as untrusted.
- Store canonical time values and use the event IANA timezone for interpretation and display.

## Verification

- Add focused unit tests for pure rules and integration tests for authorization boundaries.
- Run formatting/type/lint checks relevant to changed files.
- Run `npm run build` before completing an implementation unit.
- Update `docs/progress-tracker.md` after every meaningful implementation change.
