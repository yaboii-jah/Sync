## Issues
- [x] Editing a session preserves its Asia/Manila wall-clock time instead of reinterpreting the value in the browser or server timezone.
- [x] Unpublished sessions are hidden from attendee Home, Realtime refetches, and linked alert lookups, including when an admin is using the attendee view.
- [x] Deleting a session requires confirmation and is limited to unpublished, not-started drafts; the database enforces the same rule.

## Suggestions
- [x] Remove the duplicate theme under the program date and center the theme at the top of every hero state.

## Questions
- [x] Push behavior is documented in `docs/app-guide.md` and the formal architecture/project docs. Automatic session alerts target bookmarked-session recipients; manual status alerts and announcements use their configured all/selected snapshot, and push delivery is device/subscription dependent.
-  