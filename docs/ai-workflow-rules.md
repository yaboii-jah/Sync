# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. `project-overview.md`, `architecture.md`, and `code-standards.md` define what to build, how to build it, and the constraints it must follow; `progress-tracker.md` tracks what's actually been done and what's still open. Always implement against these four files — do not infer or invent product behavior, system design, or conventions from scratch. If something isn't covered by them, that's a signal to update the relevant file first, not to guess and move on.

## Scoping Rules

- Work on one feature unit at a time
- Prefer small, verifiable increments over large
  speculative changes
- Do not combine unrelated system boundaries in a
  single implementation step

## When to Split Work

Split an implementation step if it combines:

- UI changes and Supabase schema or RLS policy changes (e.g. don't build a session card component in the same step as adding a column to `sessions`)
- Realtime sync logic and Web Push delivery logic — these are two separate layers per `architecture.md` and should be built and verified independently
- Any behavior not clearly defined in `project-overview.md` or `architecture.md` — most notably workshop registration or admin capabilities beyond the approved event-operations scope

If a change cannot be verified end to end quickly,
the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the
  context files
- If a requirement is ambiguous, resolve it in the
  relevant context file before implementing
- If a requirement is missing, add it as an open question
  in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- Supabase-generated type definitions (e.g. `database.types.ts`) — regenerate from the schema via the Supabase CLI, don't hand-edit
- Generated PWA icons and other generated assets — edit their source script/configuration and regenerate them rather than hand-editing generated output. `public/sw.js` is an exception: it is hand-authored source code and must be edited directly when service-worker behavior changes.
- Any third-party library internals

## Keeping Docs in Sync

Update the relevant context file whenever implementation
changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant defined in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `npm run build` passes
