# Sync (Student Edition)

## Overview

Sync (Student Edition) is a companion PWA for attendees of AWS Student Community Day Mega Manila 2026. It keeps attendees oriented throughout the event day with a live view of what's happening now, real-time session status, a speaker/sponsor directory, and QR-based LinkedIn networking, installable to a phone's home screen like a native app. It's an enhanced version of the original Sync app, rebuilt with LinkedIn sign-in and no admin-side management overhead.

## Goals

1. Let an attendee go from landing page to a fully usable account via LinkedIn sign-in, with no manual registration form beyond a one-time profile URL entry
2. Surface session status (not started / ongoing / finished) in real time, with zero manual posting required from anyone
3. Let an attendee generate and share a LinkedIn networking QR code without retyping their profile URL more than once
4. Make the app installable as a PWA so it behaves like a native app from the home screen

## Core User Flow

1. User lands on the public landing page and taps "Get Started"
2. User signs in with LinkedIn (name and photo auto-filled)
3. User pastes their LinkedIn profile URL once, generating their networking QR code
4. User lands on the Home dashboard showing the current session and what's next
5. User taps into a session to view its description, room, and speaker
6. User receives schedule-driven session reminders and start/end notifications for sessions saved to My Flow
7. User opens Connect to show their QR code to another attendee for networking
8. User browses the More page for the speaker/sponsor directory and quick links (event website, photo booth)

## Features

### Authentication
- Sign in with LinkedIn — auto-fills name and profile photo
- One-time manual entry of a valid `linkedin.com/in/` profile URL, normalized for the networking QR code

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
- Personal networking card with auto-generated QR code linking to LinkedIn profile

### Speakers & Sponsors
- Browsable directory with photo, name, role, and organization
- Detail view with bio and LinkedIn link

### Quick Links
- Link to the main event website
- Link to the photo booth

### Account Settings
- View/update name and LinkedIn profile URL from the authenticated header or desktop navigation rail

### Platform
- Installable as a PWA (home screen icon, standalone app-like experience)

## Scope

### In Scope

- LinkedIn OAuth sign-in
- Real-time program flow with automatic session status
- Automatic, schedule-driven session reminders and start/end notifications
- Organizer announcements managed directly in the database
- Persisted unread alert count and session-linked alert detail access
- QR-based LinkedIn networking
- Speaker/sponsor directory
- Quick links to external providers
- PWA installability

### Out of Scope

- Workshop registration and slot management (deferred to a later phase)
- Admin/organizer interface — session, speaker, and notification data is managed directly in the database, not through a built app
- An in-app announcement composer or other organizer/admin posting interface

## Success Criteria

1. A user can sign in via LinkedIn and reach the Home dashboard with no manual form beyond the one-time LinkedIn URL entry
2. Session status badges update in real time across all connected clients with no manual re-posting
3. A user can generate a networking QR code that correctly resolves to their LinkedIn profile
4. A user can install the app to a device home screen and launch it as a standalone PWA
5. A user can browse the full speaker/sponsor directory and open an entry's LinkedIn profile when one is provided
