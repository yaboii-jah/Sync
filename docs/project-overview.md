# Sync (Student Edition)

## Overview

Sync (Student Edition) is a companion PWA for attendees of AWS Student Community Day Mega Manila 2026. It keeps attendees oriented throughout the event day with a live view of what's happening now, real-time session status, a speaker/sponsor directory, and QR-based social networking, installable to a phone's home screen like a native app. An allowlisted event-operations team uses a protected admin workspace in the same application to correct live session state, send attendee alerts, and monitor delivery during the event.

## Goals

1. Let an attendee go from landing page to a fully usable account via Google sign-in, with no manual registration form and nothing typed
2. Surface session status (not started / ongoing / finished) in real time, with zero manual posting required from anyone
3. Let an attendee activate one stable networking QR code for their selected LinkedIn, Instagram, Facebook, and GitHub profiles without retyping profile URLs
4. Make the app installable as a PWA so it behaves like a native app from the home screen
5. Give approved event operators a secure, auditable way to correct live program state and communicate with attendees

## Core User Flow

1. User lands on the public landing page and taps "Get Started"
2. User signs in with Google (name and photo auto-filled)
3. User optionally adds one or more social profile URLs; saving at least one link automatically activates one stable networking QR code
4. User lands on the Home dashboard showing the current session and what's next
5. User taps into a session to view its description, room, and speaker
6. User receives schedule-driven session reminders and start/end notifications for sessions saved to My Flow
7. User opens Connect to show their QR code; scanning it opens an active card containing only the social links they chose to save
8. User browses the More page for the speaker/sponsor directory and quick links (event website, photo booth)

## Features

### Authentication
- Sign in with Google — auto-fills name and profile photo
- No further entry required to use the app; networking links are optional and added later

### Program Flow
- "Happening Now" live banner
- Full event schedule with real-time status badges (Not Started / Ongoing / Finished)
- Finalized schedule supports parallel sessions, grouped by time block
- Personalized schedule view ("My Flow") vs. full schedule ("All")
- Overlapping My Flow bookmarks remain allowed but are warned about when saved and marked in My Flow
- Session detail view — description, time, room, speaker info

### Real-Time Notifications
- Session reminder and start/end alerts generated automatically from schedule data
- Bookmark-targeted Web Push for session-linked notifications
- Organizer announcements inserted directly in the database and broadcast to all subscribed devices
- Real-time Alerts feed with persisted unread state; session-linked alerts open the session detail modal

### Networking (Connect)
- One stable personal networking QR code resolving to an app-owned card whenever at least one link is saved
- Optional LinkedIn, Instagram, Facebook, and GitHub profile links managed together
- The card activates automatically when links exist; clearing the last link disables existing QR copies without changing the code

### Speakers & Sponsors
- Browsable directory with photo, name, role, and organization
- Facilitators have their own directory category alongside speakers, hosts, panelists, and sponsors
- Detail view with bio and LinkedIn link

### Quick Links
- Link to the main event website
- Link to the photo booth

### Account Settings
- View/update name and networking links from the authenticated header or desktop navigation rail

### Admin Operations
- Database-allowlisted administrators switch between attendee and admin views in the same app
- Responsive operations dashboard for current program state, attendee reachability, recent sends, and failures
- Immediate title/body notifications sent to everyone or explicitly selected attendees
- Targeted notifications appear in the Alerts feed only for snapshotted recipients, including recipients without push enabled
- Manual Start, End, and Resume Auto controls persist against schedule automation; manual timestamps become the attendee-facing live state
- Searchable read-only attendee directory, notification history, delivery results, and immutable mutation audit log
- `profiles.pass_type` remains dormant and is not used for targeting, authorization, filtering, or dashboard metrics

### Platform
- Installable as a PWA (home screen icon, standalone app-like experience)

## Scope

### In Scope

- Google OAuth sign-in
- Real-time program flow with automatic session status
- Automatic, schedule-driven session reminders and start/end notifications
- Organizer announcements managed directly in the database
- Persisted unread alert count and session-linked alert detail access
- QR-based social networking (LinkedIn, Instagram, Facebook, GitHub)
- Speaker/sponsor directory
- Quick links to external providers
- PWA installability
- Protected event-operations admin workspace

### Out of Scope

- Workshop registration, capacity, and slot management (including the BuilderCards activity) remain out of scope
- Session creation, schedule-time editing, speaker management, and other content-management tooling
- Scheduled notifications, drafts, resend, external notification links, and multi-admin approval
- Attendee editing, access suspension, deletion, or pass-type management

## Success Criteria

1. A user can sign in via Google and reach the Home dashboard without completing a manual registration form; social links remain optional
2. Session status badges update in real time across all connected clients with no manual re-posting
3. A user can activate one stable networking QR code that resolves to a noindex card showing their name, photo, and only their configured social links
4. A user can install the app to a device home screen and launch it as a standalone PWA
5. A user can browse the full speaker/sponsor directory and open an entry's LinkedIn profile when one is provided
6. An allowlisted administrator can send a recipient-scoped alert, inspect push acceptance results, and manually override or restore session status without cron reverting the override
7. Attendees can understand every concurrent live or upcoming program choice and receive a clear warning when saved My Flow sessions overlap
