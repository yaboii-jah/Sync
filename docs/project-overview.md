# Sync (Student Edition)

## Overview

October 4 production-testing decision: publish the reviewed event changes, disable website maintenance for normal Google sign-in, and restore both existing background jobs. Anyone who finds the production link can sign in; sharing and marketing remain an owner activity, with marketing deferred until testing and revisions are complete. See `event-release.md` for release status and `progress-tracker.md` for acceptance results.

Sync (Student Edition) is a companion PWA for attendees of AWS Student Community Day Mega Manila 2026. It keeps attendees oriented throughout the event day with a live view of what's happening now, real-time session status, a speaker/sponsor directory, and QR-based social networking, installable to a phone's home screen like a native app. An allowlisted event-operations team uses a protected admin workspace in the same application to correct live session state, send attendee alerts, and monitor delivery during the event.

The `org-event` worktree reuses this legacy application for AWS Student Community Day South Summity 2026. Authenticated attendee/admin workspaces support the approved light/dark event identity, device appearance by default, browser-local toggles, and static grid/tile/corner-wash decoration. Public landing and maintenance retain their light identity. Sync remains the app name and identity heading. PWA/share imagery and photo-booth frames use the supplied logo. The supplied new program is October 7, 2026, 09:30–17:30 Asia/Manila at Biñan People’s Center Auditorium, with 15 consecutive activities. The approved production import established one event and 15 published sessions; a separately rehearsed roster update now has five confirmed people (three talk speakers and two panelists), the still-unconfirmed opening keynote, and six session links. Four supplied portraits are referenced by the roster; Trisha Pelagio’s portrait remains pending. Retained administrators and schema/security are preserved. Controlled database unfreeze is committed and independently verified. The October 4 testing release disables public website maintenance and restores both existing jobs; real admin/attendee testing continues on production. The event name remains the provisional theme heading. The reviewed event branch is committed/published and deployed to both production domains for unannounced testing; see `docs/event-release.md`. Fresh-client Auth/write testing and reopening remain separate units. Product flows, permissions, and route behavior remain unchanged.

The event branch supports the active server-side website maintenance gate. It presents neutral Sync maintenance content while enabled and preserves the legacy app when disabled. The approved import, frontend deployment, and controlled database unfreeze are complete. Fresh client acceptance, restoration of approved jobs, and public launch remain separate operations; see docs/event-reopening.md.

## Goals

1. Let an attendee go from landing page to a fully usable account via Google sign-in, with no manual registration form and nothing typed
2. Surface administrator-controlled session status (not started / ongoing / finished) in real time without attendees refreshing or reposting
3. Let an attendee activate one stable networking QR code for their selected LinkedIn, Instagram, Facebook, and GitHub profiles without retyping profile URLs
4. Make the app installable as a PWA so it behaves like a native app from the home screen
5. Give approved event operators a secure, auditable way to correct live program state and communicate with attendees

## Core User Flow

1. User lands on the public landing page and taps "Get Started"
2. User signs in with Google (name and photo auto-filled)
3. User optionally adds one or more social profile URLs; saving at least one link automatically activates one stable networking QR code
4. User lands on the Home dashboard showing the current session and what's next
5. User taps into a session to view its description, room, and speaker
6. User receives audited organizer alerts and deliberate manual status alerts; schedule timing itself does not generate attendee notifications
7. User opens Connect to show their QR code or scan another attendee's Sync QR; scanning opens an active card containing only the social links that attendee chose to save
8. User opens the Photo Booth from More, captures three event-framed photos, and downloads a shareable keepsake that never leaves their device
9. User browses the More page for the speaker lineup, event website link, and app feedback form

## Features

### Authentication
- Sign in with Google — auto-fills name and profile photo
- No further entry required to use the app; networking links are optional and added later

### Program Flow
- "Happening Now" live banner
- Full event schedule with real-time status badges (Not Started / Ongoing / Finished)
- Finalized schedule supports parallel sessions, grouped by time block
- Personalized schedule view ("My Flow") vs. full schedule ("All")
- Seat capacity on the sessions that have a seat limit: the card states how full a workshop is (`33/33 · Full`, `30/33 · 3 left`) and the session detail view offers the seat
- Overlapping My Flow bookmarks remain allowed but are warned about when saved and marked in My Flow
- Session detail view — description, time, room, speaker info
- Published sessions are attendee-visible; unpublished drafts remain available only to event operators

### Real-Time Notifications
- Organizer announcements and explicitly confirmed manual Start/End/Undo End alerts
- Bookmark-targeted Web Push for eligible manually-triggered session-linked notifications
- Organizer announcements created through the protected admin composer and broadcast to snapshotted recipients
- Real-time Alerts feed with persisted unread state; session-linked alerts open the session detail modal

### Networking (Connect)
- One stable personal networking QR code resolving to an app-owned card whenever at least one link is saved
- Built-in QR scanner with rear-camera capture and image-picker fallback for saved QR screenshots; it accepts only Sync networking-card paths
- Optional LinkedIn, Instagram, Facebook, and GitHub profile links managed together
- The card activates automatically when links exist; clearing the last link disables existing QR copies without changing the code
- A private, deduplicated list of attendees whose networking cards an attendee has scanned, with the saved card URL available for reopening

### Workshop Seats
- The three workshop tracks carry a seat limit; every other session has none and shows nothing
- Tracks A and B seat 33, Track C (the BuilderCards tournament's four teams of four) seats 16, and all three start full because registration happened off-app through the organiser export
- Event operations edits the off-app registered count to open seats, and can close a workshop outright even while seats are free
- An attendee can take a free seat and release it again; taking a seat also saves the session to My Flow, while removing the bookmark never gives the seat up
- A seat claim is settled in the database under a row lock, so the last seat is only ever sold once

### Speakers
- Browsable speaker lineup with portrait when supplied and branded initials otherwise
- Responsive speaker grid with name and optional organization
- Detail view with optional bio and LinkedIn link

### Quick Links
- Link to the main event website
- Link to the native app feedback form

### Photo Booth
- An authenticated, local-only three-shot booth reached from More with the supplied Sue event frame
- Front camera by default with a front/rear switch where supported, plus an image-picker fallback
- Three separately triggered three-second countdown captures arranged in a 9:16 event-branded story strip
- High-quality 1080×1920 JPEG download; attendees can retake an individual slot without losing the other two
- Camera footage and source/result images remain in browser memory only and are never uploaded or persisted

### Account Settings
- View/update name and networking links from the authenticated header or desktop navigation rail

### App Feedback
- Authenticated attendees can submit identified feedback about Sync
- Fixed categories: Bug, Usability, and Idea
- Required trimmed message limited to 2,000 characters
- Submit-only flow with request-id deduplication and a clear thank-you state

### Admin Operations
- Database-allowlisted administrators switch between attendee and admin views in the same app
- Any current administrator can grant or remove admin access for an existing signed-in user from attendee details, with confirmation and transactional auditing. Catherine Notado and Jahmell Dorias are protected by immutable account IDs; self-demotion and removal of the last admin are refused. Demotion preserves the account and attendee data. Invitations and account creation/deletion are outside this feature.
- Responsive operations dashboard for current program state, attendee reachability, recent sends, and failures
- Session create/edit/publish controls for event-day schedule corrections; admin time inputs always use Asia/Manila (PHT)
- Seat controls in the same session editor: a capacity, the count registered off-app, and a switch that closes seats. A live preview shows the exact badge attendees will read. Capacity can never be set below the seats attendees already hold
- Unpublished, not-started drafts can be permanently deleted after confirmation; published or started sessions are unpublished instead
- Immediate title/body notifications sent to everyone or explicitly selected attendees
- Read-only latest-100 app feedback list showing category, message, attendee name/photo, and submission time
- Targeted notifications appear in the Alerts feed only for snapshotted recipients, including recipients without push enabled
- Manual Start, End, and confirmed Undo End controls are the only session-state transitions; scheduled times remain program information. Undo End always returns a manually ended session to Not Started, clears its actual start/end timestamps, and requires a new manual Start. Original timing and the correction remain in immutable audit history. Sessions with previous manual lifecycle history stay protected from draft deletion. Sent alerts and removed My Flow bookmarks are not restored; an optional correction alert defaults off. Sessions stay Not Started until an admin acts, and stay Ongoing until an admin ends them. Ending or resetting a session does not start another session. Resume Auto remains unavailable.
- Searchable attendee identity/reachability directory with confirmed admin-access controls, notification history, delivery results, and immutable mutation audit log
- On-demand raffle-name export for every non-admin attendee profile: names only, one line per profile, with numbered duplicate-name entries that stay privately traceable in the admin workspace
- `profiles.pass_type` remains dormant and is not used for targeting, authorization, filtering, or dashboard metrics

### Platform
- Installable as a PWA (home screen icon, standalone app-like experience)

## Scope

### In Scope

- Google OAuth sign-in
- Real-time program flow with manually controlled session status
- Audited organizer announcements and explicitly confirmed manual status notifications
- Organizer announcements managed through the protected admin composer and audited database RPC
- Persisted unread alert count and session-linked alert detail access
- Workshop seat capacity: admin-set seat numbers, an attendee-facing fullness badge, and atomic seat claim/release
- QR-based social networking (LinkedIn, Instagram, Facebook, GitHub)
- Speaker lineup
- Event website quick link, native app feedback, and local Photo Booth
- PWA installability
- Protected event-operations admin workspace

### Out of Scope

- Full workshop registration remains out of scope: no waitlists, no payment, no QR check-in, and no attendee roster in the app. Seat capacity and seat claiming are in scope and described above; the organiser export stays the source of truth for who registered off-app
- Speaker management and other general content-management tooling outside the approved session editor
- Scheduled notification resends, external notification links, and multi-admin approval
- Attendee account/profile editing, account suspension or deletion, or pass-type management
- Attendee feedback history, editing, and deletion; feedback triage, replies, badges, and notifications

## Success Criteria

1. A user can sign in via Google and reach the Home dashboard without completing a manual registration form; social links remain optional
2. Session status badges update in real time across all connected clients with no manual re-posting
3. A user can activate one stable networking QR code that resolves to a noindex card showing their name, photo, and only their configured social links
4. A user can install the app to a device home screen and launch it as a standalone PWA
5. A user can browse the complete speaker lineup and open an entry's LinkedIn profile when one is provided
6. An allowlisted administrator can send a recipient-scoped alert, inspect push acceptance results, and manually start or end sessions without schedule timing changing their status
7. Attendees can understand every concurrent live or upcoming program choice and receive a clear warning when saved My Flow sessions overlap
8. An authenticated attendee can submit identified app feedback in one of three categories, and an allowlisted administrator can review the latest 100 submissions without exposing feedback to attendees
