# Sync (Student Edition)

## Overview

Sync (Student Edition) is a companion PWA for attendees of AWS Student Community Day Manila 2026 — a budget-friendly, student-focused alternative to the main AWS Community Day Manila event. It keeps attendees oriented throughout the event day with a live view of what's happening now, real-time session status, a speaker/sponsor directory, and QR-based LinkedIn networking, installable to a phone's home screen like a native app. It's an enhanced version of the original Sync app used at the main event, rebuilt with LinkedIn sign-in and no admin-side management overhead.

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
6. User receives a real-time notification when a session starts or ends
7. User opens Connect to show their QR code to another attendee for networking
8. User browses the More page for the speaker/sponsor directory and quick links (event website, photo booth)

## Features

### Authentication
- Sign in with LinkedIn — auto-fills name and profile photo
- One-time manual entry of LinkedIn profile URL, used for the networking QR code

### Program Flow
- "Happening Now" live banner
- Full event schedule with real-time status badges (Not Started / Ongoing / Finished)
- Personalized schedule view ("My Flow") vs. full schedule ("All")
- Session detail view — description, time, room, speaker info

### Real-Time Notifications
- Session start/end alerts, generated automatically from schedule data — no manual posting needed

### Networking (Connect)
- Personal networking card with auto-generated QR code linking to LinkedIn profile

### Speakers & Sponsors
- Browsable directory with photo, name, role, and organization
- Detail view with bio and LinkedIn link

### Quick Links
- Link to the main event website
- Link to the photo booth

### Account Settings
- View/update name and LinkedIn profile URL

### Platform
- Installable as a PWA (home screen icon, standalone app-like experience)

## Scope

### In Scope

- LinkedIn OAuth sign-in
- Real-time program flow with automatic session status
- Automatic, schedule-driven notifications (session start/end only)
- QR-based LinkedIn networking
- Speaker/sponsor directory
- Quick links to external providers
- PWA installability

### Out of Scope

- Workshop registration and slot management (deferred to a later phase)
- Admin/organizer interface — session, speaker, and notification data is managed directly in the database, not through a built app
- Semi-automatic or manual notification types (schedule-change alerts, freeform announcements)

## Success Criteria

1. A user can sign in via LinkedIn and reach the Home dashboard with no manual form beyond the one-time LinkedIn URL entry
2. Session status badges update in real time across all connected clients with no manual re-posting
3. A user can generate a networking QR code that correctly resolves to their LinkedIn profile
4. A user can install the app to a device home screen and launch it as a standalone PWA
5. A user can browse the full speaker/sponsor directory and open any entry's LinkedIn profile
