# Networking Card Persistence

## Data Model

- `networking_cards` has one row per attendee with a stable `public_token` and
  explicit `is_public` state.
- `social_profiles` has at most one row per `(user_id, network)` for `linkedin`,
  `instagram`, `facebook`, and `github`.
- Social URLs are canonical, no longer than 256 characters, and constrained by
  network in the database.

## Save Semantics

The Account Settings form submits all four fields together. The authenticated
`save_social_profiles` function replaces the caller's complete link set in one
transaction. Empty values are omitted, so clearing a field deletes that row.
If no links remain, the same transaction sets `is_public = false`.

Direct INSERT, UPDATE, and DELETE privileges on `social_profiles` remain
revoked from `anon` and `authenticated`.

## Publish Semantics

`set_networking_card_public(true)` succeeds only when the authenticated caller
has at least one saved link. Setting false preserves both links and token. The
token never changes during ordinary save, publish, or unpublish operations.

## Read Semantics

- `get_own_networking_card()` returns the authenticated owner's token,
  publication state, and links.
- `get_public_networking_card(token)` returns name, photo, and links only when
  the card is currently published and has at least one link.
- The public function is callable by `anon` and `authenticated`; the underlying
  tables are not.

## Acceptance Criteria

- Existing LinkedIn, Instagram, and Facebook rows survive the migration.
- GitHub rows can be saved, updated, removed, and returned by both card reads.
- Invalid and non-canonical URLs fail at the database boundary.
- One Save updates the complete link set atomically.
- Connect contains no social-link inputs and reads the saved set only to show
  configured networks and determine whether publication is available.
- Removing the final link unpublishes the card.
- Anonymous direct table reads and all direct writes fail.
- Anonymous lookup returns a published card and returns no rows after it is
  unpublished.
