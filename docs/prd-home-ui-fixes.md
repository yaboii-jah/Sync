# PRD — Home and hero UI defects

Status: approved rev 1.0, 2026-09-07
Owner: attendee experience
Source: Playwright walkthrough of the running app on `http://localhost:3000`,
signed in as a real attendee, at 390x844 (iPhone 15) and 1440x900.

## Problem

Five defects appear on the signed-in attendee screens. Each one is reproduced
in the browser, not inferred from the code. Each one degrades event-day use.

## Evidence

| ID | Screen | Observed |
| --- | --- | --- |
| E-1 | `/home` program flow | Two separate groups both read `11:45 AM`. The list header reads `Friday, September 11`, but the list contains sessions from other dates. A reader cannot tell which day a row belongs to. |
| E-2 | `/home` session card | A card reads `7160 min · ended 5 hours ago`. 7160 minutes is about 5 days. |
| E-3 | `/home` session cards | Relative time uses three vocabularies in one list: `in 4 d`, `ended 9 hours ago`, `2 min`. |
| E-4 | `/home` hero, 390px | The venue is plain text. The Google Maps link exists only at `lg` and above. `components/home/hero-card.tsx:295-305` gates the text with `lg:hidden` and the link with `hidden lg:flex`. |
| E-5 | `/home` first load | The `Install Sync` region and the `Get session alerts` dialog are both present at the same time. |

E-4 has a second defect in the same place: `venueMapUrl` in
`components/home/hero-card.tsx:29` hard-codes `Asia+Pacific+College`, while the
visible label uses `event.venue`. If the venue row changes, the link points at
the wrong place.

## Requirements

**FR-1 — the program list must state the date of each group.**
When a group's start date differs from the previous group's start date, the
list must show that date. The user must be able to tell two `11:45 AM` groups
apart without opening a card.

**FR-2 — durations must be readable at any length.**
A duration of 120 minutes or more must render in hours, and a duration of 24
hours or more must render in days. `7160 min` must not appear.

**FR-3 — relative time must use one vocabulary.**
One formatter must produce every relative-time string on the session card, in
one unit vocabulary, for both past and future.

**FR-4 — the venue link must work on a phone.**
One venue element must serve every breakpoint, and it must be the map link. The
map URL must be derived from `event.venue`, with the current constant as the
fallback when `event.venue` is null.

**FR-5 — first-run prompts must not stack.**
The install prompt and the push-permission dialog must not be visible at the
same time. One must wait for the other to close.

## Out of scope

* The session data itself. The `test for offline notif` and `Test event` rows,
  and the override that produced the 7160-minute end time, are database
  content, not UI. This PRD does not change data.
* Any change to the palette, the type scale, or the component set in
  `docs/ui-context.md`.
* `/alerts`, `/connect`, `/more`, `/settings`, and the admin console.

## Acceptance

Each requirement is accepted when the stated screen shows the required result
in a real browser at 390x844 and at 1440x900, and when `npx tsc --noEmit`
reports no new error.

## Unknowns

* U-1 — FR-1: does the date belong on every group, or only on a group whose
  date differs from the event date? The listed rule (show it on a date change)
  is the assumption used here.
* U-2 — FR-5: which prompt takes priority when both are ready?

## Decisions (2026-09-07)

These answer the unknowns raised in the requirement map. They are the rules the
implementation must follow.

* **D-1 (U-1a, U-1b, U-3)** — the program list shows a date on the first group
  and on every group whose Manila date differs from the group above it. The
  format is `formatManilaDate`, the formatter already used on the page.
* **D-2 (U-2)** — the push dialog goes first. It is modal, so it already blocks
  the page. The install prompt appears after the push dialog reaches a terminal
  state. The install prompt stays non-blocking and keeps no backdrop.
* **D-3 (U-4, R-02)** — the `Friday, September 11` subheader stays as it is. It
  labels the event date, and the group dates from D-1 remove the ambiguity it
  caused. No code change.
* **D-4 (U-5a, S-1)** — FR-4 covers the pre-event countdown hero state only,
  the state where the defect was observed. The other four hero states keep
  their present content. Venue in those states is a separate request.
* **D-5 (U-5b, S-2)** — the desktop-only venue paragraph in
  `components/home/home-client.tsx:243-247` is removed, so the venue renders
  once at every width.
* **D-6 (S-3)** — `formatRelativeTime` is not touched, because `/alerts` and the
  admin console read it and both are out of scope. `relativeStartLabel` in
  `lib/format.ts` is extended into one card-facing formatter that covers past
  and future. `docs/code-standards.md` records why two relative formatters
  exist.
* **D-7 (R-05, S-5)** — the card always renders a relative clause. The present
  `null` return past 24 hours is a defect, not a feature.
* **D-8 (U-6)** — duration renders as `N min` below 120 minutes, `N hr` plus
  `M min` when non-zero from 120 minutes, and `N d` plus `M hr` when non-zero
  from 24 hours. `tabular-nums` stays.
* **D-9 (U-7, U-8)** — the hero countdown is unchanged. The card vocabulary is
  the abbreviations `min`, `hr`, `d`.
* **D-10 (S-6, R-09)** — the acceptance gate is `npx tsc --noEmit` and
  `npm run build`, plus a browser check at 390x844 and 1440x900.
* **D-11 (S-4)** — accepted. FR-2 makes the keynote card readable, not correct.
  The 7160-minute span is an operator override in the database and stays out of
  scope.
* **D-12 (U-9)** — the implementer captures a fresh clean-profile observation of
  both first-run prompts as part of the R-08 evidence.
