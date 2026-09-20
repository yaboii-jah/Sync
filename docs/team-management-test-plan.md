# Team Management Manual Test Plan

Run this against local development only. Use a disposable event: creating an invitation makes a draft meaningful activity, so archive it rather than expecting draft deletion to work afterward.

## Setup

1. Start Docker Desktop, then run `npx supabase start` and `npm run dev`.
2. Open `http://localhost:3000`.
3. Create a disposable event with an owner account.
4. Prepare four local accounts: owner, existing admin, invitee with the intended email, and a different-email account.
5. Add the existing admin to the event through the local test fixture or a previously accepted invitation.

## Checks

- [ ] The owner can open `/manage/[slug]/team`, invite an admin, and see the pending email and expiry.
- [ ] With no `RESEND_API_KEY` or `EVENT_INVITE_FROM_EMAIL`, creating an invitation still provides a copyable link and explains that email is not configured.
- [ ] Refreshing the Team page does not reveal the raw link again.
- [ ] Open the copied `/invite#…` link while signed out. Sign in with the wrong account: the page does not reveal the event and refuses acceptance.
- [ ] Sign in with the exact invited address. The page identifies the event and requires an explicit **Accept invitation** action.
- [ ] Accepting redirects to `/manage/[slug]/team`; the invitee is now an active admin.
- [ ] An admin can view the team but has no invite, revoke, remove, or transfer controls.
- [ ] Reissue an invitation. The prior link is invalid and the new link works.
- [ ] Revoke a pending invitation: a reason shorter than eight characters is rejected; a valid reason revokes the link.
- [ ] Remove an active admin: the same reason validation applies and management access disappears after refresh.
- [ ] Transfer ownership: an incorrect event-name confirmation is rejected; a correct confirmation promotes the selected admin and leaves the old owner as an admin without owner-only controls.
- [ ] Archive the disposable event and confirm Team is read-only.
- [ ] Check keyboard navigation, visible focus, modal cancel behavior, copy feedback, and 320 px and desktop widths.

## Optional Resend Check

Set `RESEND_API_KEY` and `EVENT_INVITE_FROM_EMAIL` only in ignored local environment files. Invite a permitted recipient, confirm a single email arrives with the right event name and link, and verify that the copied fallback link has the same acceptance behavior. Never paste invitation links or email-provider keys into issues or logs.
