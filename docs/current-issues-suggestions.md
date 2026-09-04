## Issues

- [x] Sign-out confirmation used outdated LinkedIn copy. It now uses provider-neutral sign-in wording.

## Suggestions

- [x] Account Settings now exposes installation status, the native install prompt when available, and platform-specific manual instructions.
- [x] Social URL handling accepts direct profile variants, bare handles, HTTP inputs normalized to HTTPS, trusted subdomains, and Facebook native `/share/<token>/` links while rejecting unrelated platform paths and lookalike domains.
- [x] Google profile photos refresh on OAuth sign-in when metadata provides a photo; the existing first-name initial remains the fallback and edited display names are preserved.
- [x] The networking QR is always displayed. Cards activate automatically when at least one social link is saved, and empty cards resolve to the generic unavailable state.
- [x] Social-card icons and labels use one centered fixed grid for consistent alignment.
- [x] The on-screen QR now scales responsively up to 288px, and publication-state UI has been removed. Empty cards show the QR but do not offer a download.

## Questions

- [x] The install banner could disappear because its `beforeinstallprompt` listener mounted only on Home, the event is not replayed, and browsers control whether the event fires. Installation state is now captured at the app root; Home dismissal lasts for the current browser session, while Account Settings remains available.

Physical-device acceptance is still required for native installation prompts and manual iOS/Android guidance.
