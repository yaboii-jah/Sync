# Sync (Student Edition)

## Overview

Sync (Student Edition) is a companion PWA for attendees of AWS Student Community Day Mega Manila 2026. It keeps attendees oriented throughout the event day with a live view of what's happening now, real-time session status, a speaker/sponsor directory, and QR-based social networking, installable to a phone's home screen like a native app. An allowlisted event-operations team uses a protected admin workspace in the same application to correct live session state, send attendee alerts, and monitor delivery during the event.

## Goals

1. Let an attendee go from landing page to a fully usable account via Google sign-in with no manual registration form
2. Surface session status (not started / ongoing / finished) in real time, with zero manual posting required from anyone
3. Let an attendee publish one stable networking QR that opens their chosen LinkedIn, Instagram, and Facebook profile links
4. Make the app installable as a PWA so it behaves like a native app from the home screen
5. Give approved event operators a secure, auditable way to correct live program state and communicate with attendees

## Core User Flow

1. User lands on the public landing page and taps "Get Started"
2. User signs in with Google (name and photo auto-filled)
3. User may add personal LinkedIn, Instagram, and Facebook links from Connect and explicitly publish their public networking card
4. User lands on the Home dashboard showing the current session and what's next
5. User taps into a session to view its description, room, and speaker
6. User receives schedule-driven session reminders and start/end notifications for sessions saved to My Flow
7. User opens Connect to show their QR code to another attendee for networking
8. User browses the More page for the speaker/sponsor directory and quick links (event website, photo booth)

## Features

### Authentication
- Sign in with Google — auto-fills name and profile photo
- A successful Supabase Google OAuth exchange provides the verified account identity; it does not verify ownership of separately entered social links

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
- Optional personal LinkedIn, Instagram, and Facebook links, entered as profile URLs or handles and normalized before storage
- One stable QR opens an app-owned public bearer card containing every configured social link
- Public cards are disabled by default and require explicit attendee consent to publish; attendees can disable a card without deleting its saved links
- Social links are user-provided and ownership is not verified; Facebook profile-shaped URLs cannot reliably distinguish personal profiles from Pages without Meta API access
- QR scans and outbound social-link clicks are not tracked

### Speakers & Sponsors
- Browsable directory with photo, name, role, and organization
- Detail view with bio and LinkedIn link

### Quick Links
- Link to the main event website
- Link to the photo booth

### Account Settings
- View/update the Google-initialized display name from the authenticated header or desktop navigation rail
- Manage networking links and public-card visibility from Connect

### Admin Operations
- Database-allowlisted administrators switch between attendee and admin views in the same app
- Responsive operations dashboard for current program state, attendee reachability, recent sends, and failures
- Immediate title/body notifications sent to everyone or explicitly selected attendees
- Targeted notifications appear in the Alerts feed only for snapshotted recipients, including recipients without push enabled
- Manual Start, End, and Resume Auto controls persist against schedule automation; manual timestamps become the attendee-facing live state
- Searchable read-only attendee directory, notification history, delivery results, and immutable mutation audit log
- `profiles.pass_type` remains dormant and is not used for targeting, authorization, filtering, or dashboard metrics
- Administrators do not see attendee social links in the attendee directory

### Platform
- Installable as a PWA (home screen icon, standalone app-like experience)

## Scope

### In Scope

- Google OAuth sign-in
- Real-time program flow with automatic session status
- Automatic, schedule-driven session reminders and start/end notifications
- Organizer announcements managed directly in the database
- Persisted unread alert count and session-linked alert detail access
- Public, attendee-controlled QR networking across LinkedIn, Instagram, and Facebook
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

1. A user can sign in via Google and reach the Home dashboard with no manual registration form
2. Session status badges update in real time across all connected clients with no manual re-posting
3. A user can configure social links, explicitly publish one stable networking QR, update its destinations without regenerating it, and disable its public card
4. A user can install the app to a device home screen and launch it as a standalone PWA
5. A user can browse the full speaker/sponsor directory and open an entry's LinkedIn profile when one is provided
6. An allowlisted administrator can send a recipient-scoped alert, inspect push acceptance results, and manually override or restore session status without cron reverting the override
