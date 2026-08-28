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

## Second pass — working the wall systematically

The first pass found one move. A second pass, working every angle in order,
found the one that actually matters. Recorded in full so the dead ends are not
re-explored.

**Wall re-verified against the primary source.** The first pass cited Microsoft
Learn, whose page is stamped 2024-08-08 — old enough that the constraint could
have expired. Fetching LinkedIn's live discovery document directly returns the
identical set today:

```
scopes_supported:       ["openid", "profile", "email"]
claims_supported:       [iss, aud, iat, exp, sub, name, given_name,
                         family_name, picture, email, email_verified, locale]
subject_types_supported: ["pairwise"]
```

Corroborated by the app's own consumption path: `handle_new_user()` in
`20260822090000_create_profiles.sql` reads exactly `name` and `picture` from
`raw_user_meta_data` and nothing else. The wall is real and current.

**Dead ends, so nobody re-walks them:**

- *Derive the slug from the photo URL.* The `picture` claim is a
  `media.licdn.com` asset URL whose path segment is an opaque media identifier
  (LinkedIn's own sample: `C5F03AQHqK8v7tB1HCQ`), not the member's vanity name.
  Reasoned from the URL format, not tested against a live profile — but there is
  no mechanism by which a CDN asset ID would encode a vanity slug.
- *Derive it from `sub`.* Closed by `pairwise`, as above.
- *Ask a third party.* This is LinkFinderAI. Already shipped and reverted for
  returning real profiles for fake emails.

**The finding that changes the recommendation — move 8, "ask what it is for".**

**LinkedIn already ships this exact feature.** Every member has a personal QR
code built into the LinkedIn mobile app (search bar → QR icon), free, with
"My code" and "Scan" tabs; scanning opens the member's profile with a Connect
button ready to tap. It is still current in 2026.

So the feature as currently specified — a QR that resolves to a LinkedIn
profile — is a **strictly worse copy of a free native feature**. Sync's version
demands a manual URL paste first. LinkedIn's does not. Both end on the same
profile page. The friction buys nothing at all.

That reframes the problem. The question is not "how do we remove the paste".
It is **"what can this QR do that LinkedIn's own cannot?"**

Per LinkedIn's own documentation of the feature, the answer is specific:
LinkedIn's QR offers **no scan tracking** — a member cannot learn who scanned
them or when. Neither can Sync today, because the scan resolves entirely
outside it.

That is the whole differentiator, and it is exactly what an app-owned QR target
unlocks. The app-owned QR is therefore not a nicer alternative to the current
design; it is the only version of this feature that justifies its own existence.

**One further property, from move 5 (change when).** With an app-owned target
the QR works *before* the LinkedIn URL exists. An attendee can be scanned on
arrival, add their URL that evening, and every connection made earlier gains the
link retroactively. The current design cannot do this — no URL, no QR, no
connection, permanently lost.

## Third pass — the solution, with the spec left intact

The owner's ruling: this is an event product, LinkedIn's native QR is not a
competitor and not a reason to reopen the feature's purpose. The requirement
stands as written. What follows removes the friction **without amending
anything** — no spec change, no RLS change, no invariant change.

The earlier passes both attacked the wrong half. They asked how to obtain the
URL *without the user*, hit the wall, and moved to redesigning the QR. But the
spec never said the machine must obtain it. It says the attendee supplies it
once (Core User Flow 3). The friction is not that a human is involved — it is
that the human has to **type**, on a phone, a string they do not have memorised.

So: keep the human, delete the typing.

### The move — Sync is a PWA, so it can be a share target

Sync is installable (`public/manifest.webmanifest`, `display: standalone`). Any
installed PWA can register itself in the Android share sheet through the **Web
Share Target API**, and receive data other apps share into it.

LinkedIn's mobile app already has *Share profile via…*. With a share target
registered, **Sync appears in that share sheet**. The attendee taps
Share → Sync, and their profile URL arrives in the app directly.

Zero characters typed. No clipboard. No memorising a slug.

The manifest addition is small:

```json
"share_target": {
  "action": "/onboarding/share",
  "method": "GET",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```

The handler at `/onboarding/share` reads the query params, normalizes through
the existing `normalizeLinkedInProfileUrl`, saves, and redirects to `/home`.

**The trap, documented by Chrome and worth stating before anyone implements
it:** on Android the `url` param is frequently **empty**, and the shared URL
arrives inside `text` — occasionally inside `title`. A handler that reads only
`url` will look broken on most devices and work on a few. Scan all three params
for a `linkedin.com/in/` match.

**Requirements and coverage, honestly:**

- The PWA **must be installed** to the home screen. Chrome requires this before
  an app may register as a share target; it is a deliberate anti-abuse rule.
- **Chrome on Android 76+.** iOS Safari does not implement Web Share Target.

So this is a fast path for installed Android users, not a universal one. It
needs the layer below.

### The layers beneath it

Each is independently useful and none conflicts with the spec:

1. **Share target** — installed Android. Zero typing.
2. **One-tap paste.** LinkedIn's *Share profile → Copy link* puts the URL on the
   clipboard in two taps. A "Paste my LinkedIn link" button calling
   `navigator.clipboard.readText()` behind the user gesture turns the third step
   into one tap, on iOS as well as Android. *Not device-tested — the permission
   prompt behaviour on iOS Safari needs checking on real hardware before this is
   claimed to work.*
3. **Accept a bare slug.** Whatever route the string arrives by, the current
   validator rejects `linkedin.com/in/<slug>` — no scheme — and the input is
   `type="url"` + `required`, so the browser blocks it before the app sees it.
   This is a plain defect and it undercuts both layers above.

Layer 3 is a prerequisite, not an optional extra: LinkedIn's own share sheet and
copy-link both produce strings the current validator will refuse.

### Why this needs no amendment

`project-overview.md` Core User Flow 3 reads *"User pastes their LinkedIn
profile URL once."* A share target **is** that step, performed once, with the
typing removed. Success Criteria 3 — the QR resolves to the LinkedIn profile —
stays true. Networking feature description stays true. `profiles` RLS is
untouched. No new table, so Invariant 3 is untouched.

The app-owned QR from the second pass remains a valid, larger idea, and it is
the only thing here that requires the owner's sign-off. It is now decoupled:
this solution ships without it.

## Recommendation

Ship in this order. Each step stands alone and none needs a spec amendment.

1. **Accept a bare slug.** One validator, plus dropping `type="url"`.
   Prerequisite for everything else — LinkedIn's own copy-link and share sheet
   both emit strings the current check refuses.
2. **Register the share target.** Manifest entry plus one route handler. Turns
   the onboarding step into Share → Sync, with nothing typed. Read `text` and
   `title` as well as `url`.
3. **Add the one-tap paste button** as the iOS and not-installed fallback.
4. **Separately**, take the app-owned QR to jah as a spec amendment. It is a
   bigger idea and now fully decoupled from the friction fix.

**Not verified, and it matters:**

- The share-target flow has **not been tested on a device**. It requires an
  installed PWA on Android Chrome, and the `url`/`text`/`title` behaviour varies
  by sharing app — LinkedIn's specific share payload has not been inspected.
  Nothing here should be reported as working until it has been shared from the
  real LinkedIn app into an installed build.
- iOS clipboard permission behaviour is untested on real hardware.
- The photo-URL derivation in the second pass was reasoned from URL structure
  rather than tested against a live profile.

## Sources

- [Sign In with LinkedIn using OpenID Connect — Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [LinkedIn OIDC discovery document](https://www.linkedin.com/oauth/.well-known/openid-configuration)
- [LinkedIn Partner Program 2026 — approval reality](https://www.getphyllo.com/post/linkedin-api-access-in-2026-partner-program-approval-timeline-alternatives)
- [Using a LinkedIn QR Code to Connect with Members — LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a525286/using-a-linkedin-qr-code-to-connect-with-members)
- [Receiving shared data with the Web Share Target API — Chrome for Developers](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
- [share_target — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target)
