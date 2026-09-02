# Sync (Student Edition)

## Overview

Sync (Student Edition) is a companion PWA for attendees of AWS Student Community Day Mega Manila 2026. It keeps attendees oriented throughout the event day with a live view of what's happening now, real-time session status, a speaker/sponsor directory, and a QR-based networking card, installable to a phone's home screen like a native app. An allowlisted event-operations team uses a protected admin workspace in the same application to correct live session state, send attendee alerts, and monitor delivery during the event.

## Goals

1. Let an attendee go from landing page to a fully usable account via Google sign-in, with no manual registration form and nothing typed
2. Surface session status (not started / ongoing / finished) in real time, with zero manual posting required from anyone
3. Let an attendee share a networking card — LinkedIn, Instagram, Facebook, or any mix of the three — from a QR code that never has to be reprinted when the links change
4. Make the app installable as a PWA so it behaves like a native app from the home screen
5. Give approved event operators a secure, auditable way to correct live program state and communicate with attendees

## Core User Flow

1. User lands on the public landing page and taps "Get Started"
2. User signs in with Google (name and photo auto-filled)
3. User adds the social profiles they want to share in Settings, then turns their card on in Connect
4. User lands on the Home dashboard showing the current session and what's next
5. User taps into a session to view its description, room, and speaker
6. User receives schedule-driven session reminders and start/end notifications for sessions saved to My Flow
7. User opens Connect to show their QR code to another attendee for networking
8. User browses the More page for the speaker/sponsor directory and quick links (event website, photo booth)

## Features

### Authentication
- Sign in with Google — auto-fills name and profile photo
- No further entry required to use the app; networking links are optional and added later

### Program Flow
- "Happening Now" live banner
- Full event schedule with real-time status badges (Not Started / Ongoing / Finished)
- Personalized schedule view ("My Flow") vs. full schedule ("All")
- Session detail view — description, time, room, speaker info

### Real-Time Notifications
- Session reminder and start/end alerts generated automatically from schedule data
- Bookmark-targeted Web Push for session-linked notifications
- Organizer announcements inserted directly in the database and broadcast to all subscribed devices
- Real-time Alerts feed with persisted unread state; session-linked alerts open the session detail modal

### Networking (Connect)
- Personal networking card carrying any of LinkedIn, Instagram and Facebook, each entered once and normalized
- QR code encoding the card's own token, so links can be added, changed or withdrawn without a new code
- The card is off until the attendee turns it on, and a withdrawn card stops resolving on the next scan

### Speakers & Sponsors
- Browsable directory with photo, name, role, and organization
- Detail view with bio and LinkedIn link

### Quick Links
- Link to the main event website
- Link to the photo booth

### Account Settings
- View/update name and the three networking links from the authenticated header or desktop navigation rail

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
- QR-based networking card
- Speaker/sponsor directory
- Quick links to external providers
- PWA installability
- Protected event-operations admin workspace

### Out of Scope

- Workshop registration and slot management (deferred to a later phase)
- Session creation, schedule-time editing, speaker management, and other content-management tooling
- Scheduled notifications, drafts, resend, external notification links, and multi-admin approval
- Attendee editing, access suspension, deletion, or pass-type management

## Success Criteria

1. A user can sign in via Google and reach the Home dashboard with no manual form at all
2. Session status badges update in real time across all connected clients with no manual re-posting
3. A user can publish a networking card whose QR code resolves to the profiles they chose, and stops resolving when they withdraw it
4. A user can install the app to a device home screen and launch it as a standalone PWA
5. A user can browse the full speaker/sponsor directory and open an entry's LinkedIn profile when one is provided
6. An allowlisted administrator can send a recipient-scoped alert, inspect push acceptance results, and manually override or restore session status without cron reverting the override
