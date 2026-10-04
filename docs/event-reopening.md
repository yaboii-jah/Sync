# Controlled reopening

October 4 authorization: the owner approved deploying the latest event changes with website maintenance disabled for unannounced production testing and restoring both existing jobs. Normal public Google login is intended; testers sign in before Catherine or Jahmell can grant admin access. Marketing remains pending testing/revisions. The current operation is described in `event-release.md`; the completed one-use database operations below remain historical evidence and must not be repeated.

The South Summity release is on the production domains with website maintenance enabled. The imported event, 15 published activities, five placeholders, five links, retained admins, and legacy security remain the baseline. Cleanup and import are complete and must not be repeated.

## Preparation unit

`scripts/reopening/run.mjs` accepts only `prepare` and `rehearse`, with the explicit production project. It loads checksummed import/release evidence, checks both public domains for no-store maintenance 503, and requires a fresh matching database/content inventory. Evidence is private under `.production-maintenance/event-import/reopening/`, inside the existing ACL-restricted ignored directory. The existing operation lock coordinates with import/release tools.

```powershell
node --experimental-strip-types scripts/reopening/run.mjs prepare --project-ref mygybolhwoeckrgczclm
node --experimental-strip-types scripts/reopening/run.mjs rehearse --project-ref mygybolhwoeckrgczclm
```

The committing candidate removes only the 22 named maintenance triggers and their private rejection function. Both cron jobs remain paused. The validation has the identical transaction body with a final `ROLLBACK`. Neither candidate is a migration, seed, cleanup, or event import. The runner has no execution, job-resumption, or website-configuration command.

## One-use execution

The separate `scripts/reopening/execute.mjs` runner requires `execute`, the explicit project, and `--sql-sha256 <reviewed candidate hash>`. It verifies the exact generator output and successful rollback evidence, captures a fresh frozen inventory, checks website maintenance and exact content, and exclusively writes/fsyncs a durable attempt marker before submitting the candidate once. A fresh independent inventory/content check verifies only the intended guard removal; a lost acknowledgement never causes a resend. Failure retains private diagnostics and requires live-state review. There is no job-resumption or public-launch command.

Both runners accept an optional `--review-id <ID>` to prepare, rehearse, or execute a separately named review under the protected reopening directory. IDs contain only lowercase letters, digits, and hyphens, beginning with a letter. Existing reviews/attempt markers are never overwritten or deleted.

OAuth initiation can create or expire `auth.flow_state` while `auth.users` and `auth.identities` remain frozen. A refreshed review may reconcile only this bookkeeping count against the release/import baseline. Every other Auth count, data hash, account, schema/security field, and sequence must still match. The new candidate embeds the complete fresh inventory, including its exact flow-state count. Transaction assertions, rollback verification, and execution/post-commit comparisons stay strict; the exception never relaxes these checks.

The transaction takes both existing operation advisory locks, bounded DDL locks, and a permitted read lock on managed cron. Exact inventory and imported-content assertions run before and after reversal. The only accepted changes inside the transaction are the guards, their function, and their four insert-hook inventory entries. Table data, accounts, Auth metadata, business triggers/functions, constraints, grants, RLS, cron definitions/activity, Storage, and exact sequence values must match. Two zero-row profile updates under `authenticated` and `service_role` prove the statement-level freeze no longer rejects those database roles. These are not actual Auth-service, OAuth, browser-session, or attendee-write acceptance.

Preparation refuses to overwrite an existing review. A durable rehearsal attempt marker prevents an automatic second attempt, including after an uncertain response. Fresh independent inventory/content and website checks follow the rollback; failure retains diagnostics and evidence. Do not remove old markers or use a different checksum as authorization. Reconcile any drift before preparing a new reviewed operation.

## Subsequent controlled execution and acceptance

1. Review the candidate hash and successful rollback evidence. Implement the separate one-use execution step with fresh maintenance, content, security, and idle-writer checks. Remove only the rehearsed guards/function and independently verify the intended state. Keep website maintenance enabled and jobs paused during initial acceptance. A database unfreeze also permits direct Supabase Auth/API clients, so the website gate alone does not isolate those clients.
2. Use fresh Google sign-in for a retained admin and an authorized attendee through the local app or a protected test deployment with an approved OAuth callback. Never fabricate session evidence or request tokens/passwords. Verify event/date/venue/program, speaker fallbacks, personal bookmark/profile/networking changes, non-admin denial of admin routes/RPCs, and authorized admin operations. Preserve actual results and disclose checks requiring physical devices. Avoid test announcement/push sends without explicit authorization.
3. Review both existing job identities and command hashes against the retained freeze baseline. Restore only explicitly approved jobs after relevant client/background acceptance. Program status synchronization and push retry are separate decisions; do not assume every formerly active job should resume. Observe dispatches and HTTP queues. Do not deploy an Edge Function merely to reopen the frontend.
4. For failed acceptance, pause/drain jobs and capture fresh state before reinstating the exact maintenance function/22 guards. Preserve client-created data and sequence states; never restore the old empty-content inventory, archive, or cleanup/import transaction. Keep website maintenance active.
5. Public launch is a later unit: after successful client and approved-job acceptance, deploy with website maintenance disabled, verify actual public routing/flows, and record the launch and recovery target. The preparation rehearsal does not authorize this launch.

## Execution record

Preparation and live rollback rehearsal completed at **2026-10-03 08:09:47 UTC / 16:09:47 Asia/Manila**.

- Committing candidate SHA-256: `31e241ce4450b2040b5eca3ddd4dc7654065b719dd1abe79ce06925c15671f16`.
- Identical-body rollback validation SHA-256: `373629f66d76ea6c6385df7c88936ecabc8575d1a534933b2cee227bd95b070c`.
- Reversal, two zero-row database-role probes, exact imported-content checks, and unrelated-state assertions passed inside the rolled-back transaction. Independent post-rollback inventory/content verification confirmed all 22 guards restored, both jobs paused/drained, unchanged 1/15/5/5 content and retained admins/Auth metadata, security, Storage, and exact sequence states.
- Both public domains still returned no-store maintenance 503. Private review, attempt, post-rollback inventory, and successful checksummed evidence are preserved in the reopening directory. Existing cleanup/import/release evidence is untouched.
- All 126 tests passed, including seven new reopening safeguard cases. Lint without warnings, TypeScript, production build, and diff checks passed. These operator changes and handoff updates remain local; no deployment or public configuration changed.

At that rehearsal checkpoint, no permanent unfreeze, job restoration, fresh Google acceptance, or public launch had occurred.

## Google login recovery and controlled unfreeze

The owner reported continued Google login failure and requested recovery after reopening preparation. The database freeze was still the active blocker; Google was independently confirmed enabled on the intended Supabase project. The local app was reachable at `http://localhost:3000`, while the public site returned maintenance 503.

The original candidate's execution preflight stopped before creating an execution attempt or submitting SQL: a new login attempt had increased only `auth.flow_state` from 8 to 9. All other inventory fields matched exactly. Original review/rehearsal artifacts and markers were preserved. A fresh named review, `login-recovery-20261003`, embedded the complete current inventory and passed the identical-body rollback rehearsal at **08:30:47 UTC / 16:30:47 Asia/Manila**.

- Executed candidate SHA-256: `7748755db582d020004bc01773ca7731d5ffb5cb517f54a350f7b84f105dda4a`.
- Refreshed rollback validation SHA-256: `3b381a9b3579ad79d45316807595a32ddf54eeab7943d02504e6e89bb6602d0d`.
- One-use execution was acknowledged and independently verified at **08:33:28 UTC / 16:33:28 Asia/Manila**. All 22 maintenance guards and the private rejection function are removed. The exact 1/15/5/5 imported content/publication/date/timezone, retained admins/accounts/profiles/identities, Auth metadata, schema/security, business hooks, Storage, and exact sequence states matched the fresh preflight. Both jobs remain paused/drained and both public domains still return no-store maintenance 503.
- Protected execution preflight, durable attempt marker, acknowledgement, post-unfreeze inventory, and checksummed successful evidence are in `.production-maintenance/event-import/reopening/login-recovery-20261003/execution/`. Do not rerun the execution or remove its marker. No cleanup/import, job restoration, deployment, OAuth configuration change, or public launch occurred.
- All **130 tests**, lint without warnings, TypeScript, production build, and diff checks passed. The separate execution runner and four new execution/refresh safeguard tests remain local alongside the prior handoff changes.

Google login can now be retried through the local app. Fresh successful Google/admin/attendee client acceptance remains pending the owner's retry; database-role probes and guard removal do not prove a completed OAuth session. The production domains intentionally remain under maintenance. Do not run the older release verifier against the unfrozen state: it expects all guards present. Approved job restoration and public launch remain later acceptance units.

Post-unfreeze OAuth initiation was verified at **08:37:54 UTC / 16:37:54 Asia/Manila** using the existing public client configuration and PKCE: the Supabase authorize endpoint returned 302 to Google's expected host with the intended Supabase callback. Google authorization/consent was not followed and no browser session was fabricated. This normal initiation creates temporary Auth flow bookkeeping only. Local root returned 200, signed-out Home preserved its 307 sign-in redirect, and callback without a code returned the local root. A successful owner Google retry is still pending.

## Retained-profile Connect acceptance repair

The owner subsequently reached authenticated `/connect`, and live diagnostics showed one actual Auth session. Its card read failed because all five retained profiles lacked a networking-card row after cleanup. The existing trigger provisions a card only for an inserted profile; an existing user's Google sign-in does not insert that profile again.

A guard-free, jobs-paused data repair restored only the five missing default private cards with new tokens. Existing profile/card provisioning and owner/public RPCs are unchanged. Live rollback rehearsal verified all five owner reads, all five anonymous denials, and exact unrelated-state preservation. The candidate committed and was independently verified at **09:04:31 UTC / 17:04:31 Asia/Manila**, with five private cards, zero missing cards, and no saved social links. No prior-event token/link was restored, and no permissions or schema changed. Public maintenance and both paused jobs remain in place.

Private checksummed evidence and the durable one-use repair marker are in `.production-maintenance/event-import/connect-recovery/`. Candidate SHA-256: `b85077e9d944c92862f69106bf4d79647e6dde96c256f7b9d59cb855b6d55b9d`. Do not repeat cleanup/import/unfreeze/card repair. The owner's `/connect` reload confirmation and the remaining live admin/attendee acceptance are still pending; SQL role probes are not browser acceptance.

## Retain only the two approved accounts

The owner clarified that all other user accounts should be deleted. A fresh production review matched exactly one Auth user/profile/admin membership for Catherine Notado and one for Jahmell Dorias. Three other Auth users were the exact target set. No Storage objects existed, no custom delete triggers were present on affected relations, background jobs were paused and drained, and both production domains still returned maintenance 503s.

The account deletion was rehearsed in a transaction that ended with `ROLLBACK`, then executed once with a checksum-bound candidate at **2026-10-04 03:26:29 Asia/Manila**. Fresh post-commit verification completed at **03:26:38 Asia/Manila**. The verified counts changed from 5 to 2 in `auth.users`, `public.profiles`, `public.admin_users`, and `public.networking_cards`, and from 10 to 4 in `auth.identities`. The only data tables whose hashes changed were those five account relations. Event/program content remains at 1 event, 15 sessions, 6 speaker rows, and 6 speaker links. Audit and notification delivery history, all other public/Auth/private/Storage table hashes, schema/security state, and exact sequences were preserved.

- Executed candidate SHA-256: `daf2695ad3ac4a6594f41568dac4fb73177f462ce106664c52b28df454971403`.
- Private preparation, rollback response, fresh post-rollback inventory, execution marker, and successful verification are retained in `.production-maintenance/event-import/account-cleanup/account-prune-20261004-v3/`. An earlier candidate with incomplete data hashes was explicitly superseded and never executed. Keep all review markers and do not rerun the account deletion.
- The website remains under maintenance, the database remains unfrozen, and both background jobs remain paused. This account change does not authorize job restoration or public launch. Supabase notes that already-issued JWTs can remain valid until they expire even after a user is deleted; deleting refresh-session rows does not immediately invalidate stateless access tokens. See [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data).

## Admin access management

The owner approved existing-user promotion and demotion by any current administrator, with Catherine Notado and Jahmell Dorias protected. The account-prune evidence was checksum-verified, and the retained live account UUID set matched before binding protection. Protection uses those IDs, independent of editable profile names. There is no invitation, Auth-account creation, or account-deletion capability in this feature.

The following narrow migrations are applied to `mygybolhwoeckrgczclm`:

- `20261003225916_admin_access_management`: protected allowlist flag, checked access reads, serialized membership changes, actor/action/target-bound request UUIDs, and transactional audit. SQL SHA-256 `3c0819722553ef0af1469cb29e4c2e1bf7270341c21f92006ef63a6fc21bf00a`; independent post-apply verification at **2026-10-04 07:10:44 Asia/Manila**.
- `20261003231912_private_admin_access_workers`: moves privileged workers into the private schema and exposes security-invoker wrappers. SQL SHA-256 `4a6a86d5839aa5775769878f8a877f89f757aba39de848382e9ae9207cc525a4`; verified at **07:27:26 Asia/Manila**.
- `20261003232856_reject_non_admin_before_access_lock`: refuses non-admin callers before taking the table lock and retains the locked recheck. SQL SHA-256 `57d1e4067d2744524f88375ed5fe8c134c13d0e9b3921af1dd74e70dcdb49342`; verified at **07:37:07 Asia/Manila**.

Only allowlist protection, new/relocated access functions, and migration history changed. Actual admin membership remained Catherine and Jahmell only. Every other inventoried table hash, policies/grants, business functions/triggers, constraints, sequence values, and job state stayed unchanged. Both websites retained no-store maintenance 503, with jobs paused/drained. Original failed and successful evidence and one-use attempt markers remain under `.production-maintenance/event-import/admin-access/`; do not resend an applied migration or remove its marker.

Rollback-only verification passed **38 checks**, including actor-bound retry rejection, retries of grants reversed later, protected-name changes, self/last-admin refusal, account preservation, and atomic audit entries. Audit IDs were redirected to a transaction-local sequence during testing, so the production sequence was not advanced by rolled-back tests. Native concurrent SQL-role checks verified an immediate non-admin refusal and a bounded five-second authenticated lock wait without changing any membership. Anonymous Data API calls to both public RPCs returned HTTP 401 / code 42501. Moving privileged workers out of the public schema removed both newly introduced advisor findings; the original 29 findings remain unchanged.

The local frontend has attendee-detail Make admin / Remove admin access controls with named confirmation, protected/self explanations, preserved retry UUIDs, pending-dismissal prevention, scrollable details, and post-success refresh. All 153 unit tests, TypeScript, lint, and production build pass. No frontend deployment, public launch, job restoration, or real user promotion/demotion occurred. Fresh signed-in browser acceptance remains necessary for confirmation, keyboard/mobile/theme behavior, and real admin/attendee navigation. Only the two protected accounts currently exist; another authorized attendee must first sign in to be selectable.
