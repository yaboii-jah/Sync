## Issues

- [x] Share my card did not respond to pointer clicks on its visible row. `Switch.Content` now wraps the full-width label content and track rather than only the small visual control.
- [x] Session alerts did not respond to pointer clicks on its visible row. It now uses the same full-width clickable HeroUI switch composition; blocked and unsupported states remain non-interactive.
- [x] Appearance showed only the compact Light/Dark control. Settings now exposes Light, Dark, and System while desktop navigation keeps the compact control.

## Suggestions

## Questions

- [x] Why did these appear after merging `develop`? The switch repair was committed on `main` but had not reached `origin/develop`, and that repair only wrapped the visual track in `Switch.Content`. Keyboard activation worked, proving the underlying checkbox and handlers were valid, but the visible row remained outside HeroUI's clickable label. Incoming commit `0fd4626` separately replaced the three-choice theme selector with the compact navigation control. The local merge now contains the full switch repair, and Settings has a dedicated three-choice presentation again.

