# Multi-tenant acceptance plan

Use this checklist to decide whether the multi-tenant foundation is ready for preview/staging and, later, cutover. Run it against **local Supabase first**. Reuse it in preview/staging only after that environment and its data are explicitly approved. A passing automated suite is not a substitute for the browser, device, and direct-access checks below.

For every check, record `Pass`, `Fail`, `Blocked`, or `Not run`, the tester/date/environment, and a short evidence link or issue ID. Never put invite tokens, QR secrets, API keys, cookies, private attendee details, or full email links in screenshots, tickets, or shared logs. A blocked check is not a pass.

## Safe setup and fixture matrix

1. Confirm the branch and app point to local Supabase (`127.0.0.1:45421`), not a hosted project. Start Docker, run `npx supabase start`, then `npm run dev`; use `http://localhost:3000`. Enable `MULTI_TENANT_PLATFORM_ENABLED` only in the local app environment and restart the dev server. Do not edit production flags, OAuth clients, or linked database state for this run.
2. Use two disposable, unrelated events **A** and **B**, with different owners. Keep the pre-existing AWS event and identities as preservation fixtures: inspect them, but do not delete or overwrite them. Give A and B distinct names, slugs, logos, schedules, alerts, seats, connections, and feedback so accidental cross-event data is visible.
3. Use separate browser profiles for: A owner, A admin, A attendee, B owner, B attendee, an invitee with the exact target email, a different-email account, a blocked/removed attendee, a signed-out visitor, and a platform super-admin. One person may own multiple test accounts, but do not reuse a browser session across roles. Test the super-admin account both as platform admin and as an ordinary event member/owner; platform authority must not silently grant tenant access.
4. Prepare draft, published, archived, and suspended event states. Use fresh disposable events if a lifecycle transition cannot safely be reversed. Use at least two real browsers/devices for concurrent seat and push checks.
5. Record fixture IDs without secrets. Clean up only test-owned fixtures after evidence is captured, preferably through app controls or a known UUID-scoped local script. Never run broad cleanup on a hosted database. The existing `scripts/smoke-organizer.mjs` refuses remote Supabase and removes only its own fixtures; it does not clean up manually created fixtures.

Evidence record (copy for each ID): `ID — Result: Not run | Tester/date: — | Environment: local | Evidence/issue: —`

## Automated baseline — run before manual checks

| ID | Action | Expected result |
| --- | --- | --- |
| A1 | `npm test` | All unit tests pass. |
| A2 | `npm run lint` and `npx tsc --noEmit` | No errors; record any warnings separately. |
| A3 | `npm run build` | Production build succeeds. |
| A4 | `npx supabase db lint --local --level warning` and `npx supabase test db` | Local schema lint and all pgTAP/RLS assertions pass. |
| A5 | `node scripts/smoke-organizer.mjs` with the local app running | Local-only organizer/two-tenant browser probe passes and cleans up its own fixtures. |

The last recorded implementation baseline was 109 unit tests and 403 pgTAP assertions; those numbers are **not** results for this acceptance run. Record fresh output and investigate any changed count or failure.

## P0 — release-blocking authorization and lifecycle

| ID | Action | Expected result |
| --- | --- | --- |
| P0-1 | With the flag off, open legacy `/home`, `/admin`, and `/more/photo-booth`, then try `/events`, `/manage/[slug]`, and `/super-admin`. Turn the flag back on locally and repeat. | Flag-off preserves the existing AWS experience and does not expose the new workspace. Flag-on enables scoped routes. The flag is not treated as a substitute for RLS. |
| P0-2 | From a signed-out browser, open a protected scoped URL; sign in via the supported magic-link and Google flows. Retry with an invalid/expired link. | Authentication returns to the intended safe destination; invalid credentials fail without granting access. OAuth callback configuration is correct for this environment. |
| P0-3 | Create A and B as separate owners. Check `/events`, `/e/[slug]`, public discovery, joining, and direct URL access as visitor, member, and nonmember. | Public event details follow visibility/lifecycle rules; joining is explicit. Private routes and data from A never appear in B or to a nonmember. |
| P0-4 | Attempt A reads/writes using B credentials and IDs, including direct Supabase table/RPC calls for membership, invitations, program, branding, alerts, seats, networking, feedback, raffle, and Photo Booth eligibility. Repeat with anonymous and blocked/removed accounts. | Server/database access is denied or safely empty; changing a URL or request body never crosses tenant boundaries. Do not infer this solely from hidden UI controls. Relevant `supabase/tests/*.test.sql` checks must also pass. |
| P0-5 | As owner, admin, attendee, and nonmember, open `/manage/[slug]` pages (`basics`, `branding`, `schedule`, `speakers`, `team`, `alerts`, `feedback`, `raffle`) and attempt mutations. | Owner/admin privileges match each action; attendees and nonmembers cannot mutate organizer data. An admin's team roster is read-only where specified. |
| P0-6 | From A owner, issue an admin invitation, copy its link, preview while signed out/wrong-email, then sign in with the exact verified email and explicitly accept. Reissue and try the old link; revoke another invite. | Only the intended verified account can accept; preview alone grants nothing; expired/reissued/revoked links fail. Raw token appears only in the fragment/copy flow, not request URLs or logs. |
| P0-7 | Exercise admin removal and ownership transfer (including wrong typed confirmation, self/last-owner attempts, and reason validation). | Invalid operations are rejected; the event always retains one active owner; successful changes update access immediately and create audit records. |
| P0-8 | Create draft A, save basics/content, publish, archive, and try edits/joins in each state. Suspend and unsuspend a disposable event as super-admin. | Draft is not publicly joinable; published access works; archive is read-only as designed; suspension blocks normal activity without silently changing lifecycle; unsuspension restores the prior lifecycle. |
| P0-9 | Test owner event-creation quota and super-admin quota override, then remove the override. | Normal quota blocks extra creation, override changes only the intended owner, default behavior returns afterward, and actions are audited. |
| P0-10 | As an ordinary account, call `/super-admin/*` and platform actions directly. As super-admin, inspect overview, event/user search, feedback, and audit; open a time-limited support session for A, switch to B, end/expire it. | Ordinary users have no platform access. Super-admin browsing does not become blanket attendee/invitation access; roster access is limited to the dedicated, audited support scope. Switching/ending/expiry closes prior scope. Archived/suspended events are inspect-only where specified. |
| P0-11 | Use the same email as A owner and platform super-admin. Exercise A management, B nonmembership, and support access separately. | Roles coexist without conflicting UI; platform status alone does not make the account B owner/member or bypass event-specific support controls. |
| P0-12 | Inspect the original AWS event and a representative legacy account/history after flag-off and flag-on transitions. | Existing identities, event data, and legacy routes remain intact; no migration/test fixture has overwritten or deleted them. |

## P1 — feature acceptance (fix before claiming feature parity)

| ID | Action | Expected result |
| --- | --- | --- |
| P1-1 | On A, edit schedule/speakers, view public/attendee program, bookmark as attendee, then inspect B. | Published content and bookmarks are scoped to A; B remains unchanged. Archive/suspension restrictions hold. |
| P1-2 | Fill a workshop to one remaining seat; submit two simultaneous claims from independent A attendee devices. Try a B attendee or blocked member. | Exactly one final claim succeeds; capacity is never exceeded, counts stay consistent, and other-event/blocked identities cannot claim. Record both responses and final count. |
| P1-3 | Owner sends an A alert. Check A inbox/read state, B inbox, opt-in/opt-out controls, push permission prompts, and delivery on two real devices. | In-app alert and read state stay in A. Only opted-in eligible A subscriptions receive push; B/opted-out/blocked users do not. Document unsupported browser/OS separately from app failures. |
| P1-4 | Create A networking card; scan a consented QR on another A account, deny/revoke consent, rescan, inspect scan history, then use B's account. | Consent and scan visibility match the event rules; revoked/blocked/other-event access reveals no private card or history. No reusable link grants cross-event access. |
| P1-5 | Submit A event feedback with two accounts, inspect organizer feedback and raffle export, then compare B and platform feedback. Test archived/suspended/removed eligibility and duplicate entry. | Feedback and raffle eligibility are event-scoped; duplicate/ineligible entries are rejected; organizer export contains only authorized A data. Platform feedback remains separate; anonymized author behavior survives account removal. |
| P1-6 | On a real phone, open `/e/[slug]/photo-booth`, take or pick three images, retake one, select both frames, download the JPEG. Try draft, archived, suspended, and legacy route states. | Download is correctly framed at 1080×1920; photos stay device-local with no upload; only eligible published/archived active members enter. Flag-off legacy booth retains its original behavior. |
| P1-7 | Set distinct A/B branding, including normalized upload, public page, attendee shell, and organizer preview. | Each event displays only its own logo/cover; original Sync theme remains fixed and accessible. |
| P1-8 | Test owner invite with `RESEND_API_KEY`/verified `EVENT_INVITE_FROM_EMAIL` if available, and without delivery configuration. | Provider-ready delivery sends the correct single invite email. If Resend domain verification is pending, mark delivery `Blocked` with reason; the secure copy-link fallback **must** work and is not optional. Never expose key or full token in evidence. |
| P1-9 | Review 320, 375, 414, 768px and desktop widths for `/events`, attendee, organizer, invite, and super-admin pages. Use keyboard-only navigation and check focus, labels, errors, contrast, and overflow. | Core actions remain usable without horizontal clipping or inaccessible controls. Record browser/device and any exception. |

## Execution record

Record each check separately; do not mark an entire group passed from one example.

| ID | Result | Tester / date / environment | Evidence or issue (redacted) |
| --- | --- | --- | --- |
| A1 | Not run | — | — |
| A2 | Not run | — | — |
| A3 | Not run | — | — |
| A4 | Not run | — | — |
| A5 | Not run | — | — |
| P0-1 | Not run | — | — |
| P0-2 | Not run | — | — |
| P0-3 | Not run | — | — |
| P0-4 | Not run | — | — |
| P0-5 | Not run | — | — |
| P0-6 | Not run | — | — |
| P0-7 | Not run | — | — |
| P0-8 | Not run | — | — |
| P0-9 | Not run | — | — |
| P0-10 | Not run | — | — |
| P0-11 | Not run | — | — |
| P0-12 | Not run | — | — |
| P1-1 | Not run | — | — |
| P1-2 | Not run | — | — |
| P1-3 | Not run | — | — |
| P1-4 | Not run | — | — |
| P1-5 | Not run | — | — |
| P1-6 | Not run | — | — |
| P1-7 | Not run | — | — |
| P1-8 | Not run | — | — |
| P1-9 | Not run | — | — |

## Go/no-go decision

**No-go** if any P0 check fails, is blocked, or is unrun; if any cross-tenant read/write succeeds; if existing AWS identities/history regress; or if build/authorization tests fail. Feature-parity P1 failures must be fixed or explicitly scoped out before claiming the whole foundation complete. A pending Resend domain may defer provider-delivery acceptance only when the copy-link fallback passes and that limitation is recorded.

Before preview/staging, confirm explicit approval for that environment, a reviewed migration/backfill and backup/recovery procedure, OAuth/Resend/push configuration, and a flag-off rollback rehearsal. Run this checklist again there with representative disposable accounts. Do not apply migrations or enable production from this document alone. Rollback disables the server flag and retains additive schema/data; it does not erase new-table writes. Record final decision, approver, date, unresolved issues, and links to the run evidence here.

`Decision: Not evaluated | Approver/date: — | Blocking issues: — | Evidence: —`
