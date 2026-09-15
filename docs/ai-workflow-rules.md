# AI Workflow Rules

## Required reading

Before architecture or implementation work, read in order:

1. `docs/project-overview.md`
2. `docs/architecture.md`
3. `docs/ui-context.md`
4. `docs/code-standards.md`
5. `docs/ai-workflow-rules.md`
6. `docs/progress-tracker.md`

Read the relevant installed Next.js guide before changing framework APIs. For database work, follow the repository Supabase and Postgres skills before authoring SQL.

## Delivery method

- Work in small, reversible feature units.
- Update architecture, product scope, or standards documentation before implementing a decision that changes them.
- Keep `MULTI_TENANT_PLATFORM_ENABLED` off by default until the core acceptance suite passes.
- Preserve current production behavior while parallel tenant routes are incomplete.
- Prefer additive migrations and compatibility adapters over destructive rewrites.
- Do not silently absorb unknown remote database objects into the product model.

## Required sequence

1. Define and document the unit.
2. Inspect existing code, tests, migrations, and installed framework documentation.
3. Implement the smallest complete vertical slice.
4. Test successful, unauthorized, cross-tenant, inactive, and malformed cases as applicable.
5. Run `npm run build`.
6. Update `docs/progress-tracker.md` with evidence, decisions, and the next unit.

## Multi-tenant safeguards

- Never add an event-scoped UI before its database isolation model is defined.
- Never trust client-provided event IDs, roles, ownership, or lifecycle state.
- Every tenant query must be visibly scoped.
- Anonymous access uses purpose-built published-event reads only.
- Event admin and super-admin powers are separate and auditable.
- Account deletion, membership removal, archive behavior, and ownership transfer must preserve historical integrity.

## Documentation policy

- Active documents describe the current approved platform direction and current implementation state.
- Event-specific historical documents live under `docs/archive/<event>/`.
- Do not let completed-event names, logos, or one-off operations become global requirements. Preserve the original Sync visual identity as the fixed app-wide theme.
- Record open implementation questions in the progress tracker rather than guessing silently.

## Completion standard

A unit is complete only when its behavior works end to end, authorization boundaries are covered in proportion to risk, the build passes, and the progress tracker reflects reality. A feature flag does not excuse insecure or incomplete database behavior behind it.
