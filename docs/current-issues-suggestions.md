# Current Issues & Suggestions

Use this file as the implementation checklist. Mark an item complete only after
the owning route or behavior has been verified.

## Functional Issues

- [x] Remove all schedule-generated reminder, live, and ended notifications while preserving schedule status and bookmark cleanup.
- [x] Fix desktop Photo Booth camera startup and preview.
- [x] Make Photo Booth Choose photo open the normal image/file picker instead of forcing camera capture.

## UI Suggestions

- [x] Increase spacing between the authenticated mascot and Sync wordmark, and between the landing seal and event label.
- [x] Remove the install-popup download icon.
- [x] Keep a visible close button on the install popup.
- [x] Show the install popup after a short delay and keep its narrow-screen layout readable.
- [x] Make Not Started session status a solid, readable yellow chip.
- [x] Give ongoing Home sessions a clear green edge and lifted fill.
- [x] Move attendee Account, Admin, and Sign out actions into an anchored profile menu.
- [x] Replace the pale-lime QR ground with neutral white and cap the visible QR at 240px.
- [x] Keep public social-card labels aligned at narrow widths.
- [x] Add Back to Connect only to authenticated owner previews of public social cards.
- [x] Add meaningful internal spacing to the Settings Install Sync section.
- [x] Redesign 404 and runtime error states with a shared restrained tonal illustration.
- [x] Use `public/assets/story-sky.webp` on the landing page only; reduce the landing seal to 96px and add 16px spacing.
- [x] Add a history-aware Back control to Photo Booth with `/more` fallback.
- [x] Add more balanced top spacing to the Photo Booth image windows and keep preview/export geometry aligned.

## Approved Decisions

- [x] Keep scheduled session status automatic; do not add a delayed-session hold in this pass.
- [x] Keep manual Start/End notifications available, defaulting the confirmation checkbox to off.
- [x] Preserve historical and already-queued automatic notification records during cutover.
- [x] Keep current behavior for manually starting or ending unpublished drafts.
- [x] Use a full story-sky image on landing only and retain the simplified authenticated app field.
- [x] Use a React Aria anchored popover for the attendee profile menu.
- [x] Use a shared history-aware Back control.
- [x] Use a shared tonal error illustration rather than a full cosmic error page.
- [x] Fully harden Photo Booth lifecycle, stale async work, permission states, and desktop camera selection.
- [x] Rebalance Photo Booth windows to tops `96`, `628`, and `1160` in both preview and export.

## Open Verification

- [ ] Verify automatic notification suppression with a rolled-back and linked-database test.
- [ ] Verify QR scanning on physical devices after the color and size change.
- [ ] Verify Photo Booth on desktop Chrome/Edge, Android Chrome/PWA, and iOS Safari/Home Screen.
- [ ] Verify profile-menu keyboard focus, placement, and sign-out confirmation.
- [ ] Verify responsive layouts at 320px, 375px, 414px, 768px, and desktop widths.
