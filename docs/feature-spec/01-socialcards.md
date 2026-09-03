# Single Networking QR

## Goal

Account Settings lets an authenticated attendee manage LinkedIn, Instagram,
Facebook, and GitHub profile links. `/connect` summarizes those configured
networks and publishes one stable networking QR code. The code opens an
app-owned `/c/<public_token>` card rather than an individual social network.

## Owner Experience

- Show all four optional profile fields together in Account Settings; do not
  duplicate those inputs on Connect.
- Validate and save the complete set from Settings with one explicit Save
  action.
- Blank fields remove saved links. At least one valid link is required to
  publish, and removing the final link unpublishes the card.
- Google provides only the attendee name and photo. It never derives a social
  URL.
- Show one stable QR after at least one link is saved. The QR remains visible
  and downloadable while private, with a clear Private status.
- Connect shows compact labels for the configured networks and links to Account
  Settings for changes.
- Connect shows a Preview social card button below Save QR. The owner can use
  it to inspect the card before publishing; other viewers still see the same
  unavailable state while it is private.
- Provide an explicit `Share my card` control. Turning it off disables all
  existing QR copies; turning it on again restores the same token.
- Saving non-empty edits in Settings updates what subsequent scans show without
  changing the QR.

## Scanner Experience

- A normal phone-camera scan opens `/c/<public_token>` as a web page.
- No Sync account or sign-in is required.
- A published card shows the owner's Google display name and photo plus buttons
  for only the saved social links.
- Malformed, unknown, private, and empty cards share one unavailable state.
- Card pages are `noindex, nofollow` and do not emit attendee-specific social
  preview metadata.

## Supported Destinations

- LinkedIn personal profile
- Instagram profile
- Facebook profile
- GitHub profile-shaped root URL (`github.com/<name>`). The URL shape cannot
  distinguish a person from an organization without a GitHub API dependency,
  so account type is not verified.

All values are normalized to canonical HTTPS URLs in the application and
constrained again in Postgres.

## Security

- Owners can read only their own card and social rows.
- Owners write links and publication state only through authenticated database
  functions.
- Anonymous clients receive no table grants. They may execute only the narrow
  card lookup function, using the high-entropy token as a bearer credential.
- Unpublishing must take effect on the next lookup.

## Out Of Scope

- In-app camera scanner or modal scan flow
- Scan counts or attendee identity tracking
- GitHub API verification
- Token rotation
