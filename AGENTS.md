<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `docs/project-overview.md` — product definition,
   goals, features, and scope
2. `docs/architecture.md` — system structure,
   boundaries, storage model, and invariants
3. `docs/ui-context.md` — theme, colors, typography, 
   component conventions and frontend guidelines
4. `docs/code-standards.md` — implementation rules
   and conventions
5. `docs/ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
6. `docs/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

Update `docs/progress-tracker.md` after each
meaningful implementation change.

Update `docs/app-guide.md` after a major implementation only when it changes
developer-relevant behavior, architecture, routes, setup, security boundaries,
deployment workflow, or repository structure. Keep the guide concise and
replace stale statements instead of appending implementation history.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.

