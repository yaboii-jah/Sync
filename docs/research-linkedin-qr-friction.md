# Research — removing the LinkedIn URL step from networking

**Status:** research only. Nothing here is implemented, and parts of it
contradict `project-overview.md` — see *Spec conflicts* before acting.
**Author:** Ram · **Branch:** `docs/research-ram`

## The question

> Attendees have to paste their LinkedIn URL before their QR will show. Why not
> just sign in with LinkedIn, take the URL from that automatically, generate the
> QR, and have the scanner land on the profile?

## Verdict

**The first half is impossible; the second half is already how it works.**

Sign-in with LinkedIn is already shipped — `app/actions.ts:15` calls
`signInWithOAuth({ provider: "linkedin_oidc" })`. The manual URL step exists
*despite* OAuth, not for the lack of it. LinkedIn does not return the profile
URL to a self-serve app, so there is nothing to read it from.

This is not a new finding. `progress-tracker.md` § Architecture Decisions
already records it:

> the LinkedIn profile URL still needs a one-time manual entry because standard
> OIDC scopes don't expose it, and full profile API access requires LinkedIn
> Partner Program approval

What follows re-verifies that against LinkedIn's live documentation, and then
proposes the one change that does remove the friction.

## Evidence

LinkedIn's OIDC discovery document publishes the complete claim set:

```
sub · name · given_name · family_name · picture · locale · email · email_verified
```

No `vanityName`. No profile URL. No `linkedin.com/in/` slug.

The same document declares:

```json
"subject_types_supported": ["pairwise"]
```

**Pairwise is the part that closes the door.** It means LinkedIn mints a
*different* `sub` for every application. The sample value in LinkedIn's own docs
is `"782bbtaQ"` — an opaque, app-scoped token. So:

- `linkedin.com/in/<sub>` resolves to nothing; it is not a slug.
- The `sub` cannot be correlated with any LinkedIn identity outside this app.

There is no derivation, no lookup, no clever trick. The value simply is not in
the payload.

`vanityName` exists only on `r_basicprofile`, which is gated behind the
**LinkedIn Partner Program** — a use-case review taking several weeks, aimed at
commercial integrations. A one-day student event app is not a plausible
approval.

**Conclusion: no configuration of Supabase or of the LinkedIn app can make
sign-in yield the profile URL.** Requesting extra scopes will not help.

## What was already tried, and why it is a different idea

`8628c47` removed a **LinkFinderAI** integration — a third-party service that
*guessed* a LinkedIn URL from the attendee's email address. It was reverted
because, per the tracker at the time:

- it missed on the owner's own email ("Empty response"), and
- **"a fake email returned a real profile at high confidence"**

That second point is the serious one: the provider would confidently hand back
*someone else's* profile. Pointing an attendee's networking QR at a stranger is
worse than asking them to paste a URL.

That failure does not apply to sign-in-derived data, which is authoritative by
construction. The two ideas fail for unrelated reasons — the revert is not
evidence against this one. It is, separately, evidence against ever inferring
identity from an email.

> **Housekeeping:** `LINK_FINDER_API_KEY` is still present in the environment
> and no code reads it. It should be revoked at the provider.

## The reframe that does remove the friction

The friction is not really the typing. It is **what the QR encodes.**

`components/connect/connect-card.tsx:57`

```tsx
<QRCodeSVG value={linkedinUrl} …/>
```

The QR *is* the LinkedIn URL. That single fact is what makes the URL a hard
prerequisite: no URL, nothing to encode, so onboarding must block
(`lib/supabase/profile.ts:37`).

Encode an app-owned URL instead — `…/u/<profile_id>` — and the dependency
inverts:

| | today | with an app-owned QR |
| --- | --- | --- |
| QR available | only after the URL is entered | **immediately at first sign-in** |
| scanner lands on | linkedin.com, outside the app | the attendee's card, inside the app |
| LinkedIn URL | blocking gate | optional enrichment, added any time |
| card contents | — | name + photo, already free from OIDC |
| connection captured | **nothing** | scan recorded server-side |

Two things this buys beyond deleting the friction:

1. **The card is populated with zero user input.** `name` and `picture` already
   arrive from the OIDC response and are already used on the Connect card.
2. **The scan becomes observable.** Today the entire networking interaction
   happens outside the app — a raw LinkedIn URL in a QR means the product learns
   nothing about who met whom. That data is arguably the point of a networking
   feature at an event.

The attendee still ends up on LinkedIn; there is one interstitial card in
between, which is also where a "Connect on LinkedIn" button lives.

## What it would cost

Honest accounting, verified against the code:

**Cheap:**
- The onboarding gate is one line — `lib/supabase/profile.ts:37`. And
  `profiles.linkedin_url` is **already nullable**
  (`20260822090000_create_profiles.sql:10`), so no migration is needed to stop
  blocking.

**Not cheap — the real blocker:**
- `profiles` is **own-row read only**:

  ```sql
  create policy "Users can view own profile"
    on public.profiles for select
    to authenticated
    using ((select auth.uid()) = id);
  ```

  No attendee can read another attendee's row. A scanned card therefore needs
  either a narrow additional SELECT policy or a `security definer` RPC exposing
  **only** name, photo and LinkedIn URL. That is a deliberate widening of the
  access model and must be designed, not slipped in.

- Recording scans introduces a new table and touches **Invariant 3** ("a user
  can only ever modify their own … rows"). It is satisfiable — the *scanner*
  owns the row they write — but the invariant text would need to name it.

- A public-ish `/u/<id>` route sits outside the current gating model in
  `proxy.ts`, which exempts only `/`, `/login` and `/auth/*`.

## Spec conflicts — owner decision required

`ai-workflow-rules.md` forbids inventing product behavior, so these are raised
rather than resolved. The current spec **mandates the behavior this proposal
changes**:

- `project-overview.md` § Success Criteria 3 — "a networking QR code that
  **correctly resolves to their LinkedIn profile**"
- `project-overview.md` § Features / Networking — "auto-generated QR code
  **linking to LinkedIn profile**"
- `project-overview.md` § Core User Flow 3 — "User **pastes their LinkedIn
  profile URL once**, generating their networking QR code"

The one-time paste is a documented design decision, not an oversight. Changing
what the QR points at requires amending `project-overview.md` first, and
`architecture.md` for the RLS and invariant changes.

## Lower-risk wins that need no spec change

These reduce the same friction without touching the QR target:

1. **Accept a bare slug.** The onboarding input is `type="url"` and `required`
   (`app/onboarding/linkedin-url-form.tsx:26`), and
   `normalizeLinkedInProfileUrl` requires a `https?://` prefix. So an attendee
   pasting `linkedin.com/in/ram-baarde` — which is what LinkedIn's own "copy
   link" and every business card produce — is rejected by the browser before the
   app ever sees it. Accepting a bare slug and prepending the scheme is a
   contained change to one validator.
2. **Paste-from-clipboard button.** LinkedIn mobile's *Share profile → Copy
   link* is two taps; retyping a slug on a phone keyboard is roughly forty
   keystrokes.

Item 1 is a plain defect against the existing spec and can proceed on its own.

## Recommendation

1. Ship the bare-slug fix now — small, no spec conflict, removes a real failure.
2. Take the app-owned QR to jah as a **spec amendment**, not a patch. It deletes
   the blocking step outright and turns a dead-end scan into connection data,
   but it changes a documented success criterion and widens `profiles` read
   access. Both belong to the owner.

## Sources

- [Sign In with LinkedIn using OpenID Connect — Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [LinkedIn OIDC discovery document](https://www.linkedin.com/oauth/.well-known/openid-configuration)
- [LinkedIn Partner Program 2026 — approval reality](https://www.getphyllo.com/post/linkedin-api-access-in-2026-partner-program-approval-timeline-alternatives)
