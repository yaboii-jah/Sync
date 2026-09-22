# Platform Super-Admin Test Plan

## Setup

1. Start local Supabase and the app at `http://localhost:3000` with `MULTI_TENANT_PLATFORM_ENABLED=true`.
2. Use one active `platform_super_admins` account, one ordinary account, and two unrelated events with owners and attendees.
3. Keep Resend optional; these checks do not send email.

## Access and navigation

- Signed out: `/super-admin` returns to authentication.
- Ordinary signed-in user: every `/super-admin/*` route is unavailable.
- Active super admin: Overview, Events, Users, Feedback, and Audit load in the fixed Sync platform-operations shell.
- Disable the multi-tenant flag and confirm `/super-admin` is unavailable while legacy `/admin` behavior is unchanged.

## Oversight and quotas

- Verify overview totals match local users/events and show suspended events, active support, recent feedback, and failed invitation email counts.
- Search/filter events by name, slug, lifecycle, and suspension state; inspect owner and aggregate counts.
- Search users by name and verified email. Confirm only aggregate event footprint appears—no tenant attendee roster.
- On a user or event owner, set each quota, reload, and confirm values persist and an audit entry appears.
- Leave individual fields blank to restore their defaults; clear every field to delete the override.
- Confirm branding accepts the effective per-owner limit and rejects a larger file in both the browser and server path.

## Suspension and support

- Suspend an event with a reason and confirm public/attendee/organizer behavior becomes unavailable or read-only without changing lifecycle.
- Remove suspension and confirm the platform audit records both operations.
- Start support for Event A with a purpose. Confirm its attendee roster becomes visible only in the dedicated support page.
- In a mutable event, remove and restore an attendee; confirm the event audit records the moderation.
- Start support for Event B. Confirm Event A access ends immediately and only one live session remains.
- End support explicitly and confirm the roster is no longer available. Also verify access disappears after the 60-minute expiry.
- For archived or suspended events, confirm attendee data may be inspected during support but moderation controls are unavailable.

## Feedback, audit, and responsive checks

- Filter platform feedback by bug, usability, and idea; confirm it is read-only.
- Inspect audit details for quota, suspension, and support actions, including actor, event, reason, and timestamps.
- Check `/super-admin`, event detail, user detail, and support at 320, 375, 414, 768, and desktop widths for overflow, readable focus states, and usable forms.

## Automated verification

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx supabase db lint --local --level warning`, and `npx supabase test db --local`.
