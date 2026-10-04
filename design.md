# Design — Sync / South Summity 2026

Locked visual system for the org-event worktree. Extend this system rather than inventing a theme per route.

## Identity and genre

- App: Sync. Event: AWS Student Community Day South Summity 2026 (user-supplied spelling).
- Logo: public/new-assets/SS2026 Icon - Transparent.png. Original references remain untouched.
- Genre: playful event identity with restrained, practical app surfaces.
- Landing: centered poster, CSS grid and tiles, existing pauseable corner animation.
- App/admin: existing workspaces over a static event grid, with a pale blue-lavender light canvas or navy-charcoal dark canvas. Four stationary corner washes (blue/pink/violet/green) and sparse edge tiles stay behind content and become smaller/softer on phones. Panels and controls remain opaque; functional QR grounds stay white.
- Public cards: four templates, preserving IDs 1–4; anonymous viewers retain light colors and signed-in viewers follow app appearance.

## Theme

| Role | Value |
| --- | --- |
| Background | #F7F7FA |
| Authenticated app/admin canvas (scoped) | #F0F3FA |
| Surface / overlay / action text | #FFFFFF |
| Secondary surface | #F1EEF7 |
| Text / primary action | #17171C |
| Muted text | #45454F |
| Accent / focus | #742BC0 |
| Divider | #D8DBE2 |
| Field boundary | #7C808B |
| Success / warning / danger | #087A43 / #8A4B00 / #B42338 |
| Decorative blue / orange / violet / green / pink | #42B4FF / #FF9900 / #AD5CFF / #00E582 / #FF2CFD |

Bright brand colors are decoration, never small functional text. Primary buttons use the action pair; selections use the accent pair. Authenticated workspaces follow device appearance until their visible sun/moon control saves a light/dark choice to browser-local `sync-app-appearance`. Landing, maintenance, and anonymous public cards retain their existing presentation. Signed-in networking templates adapt their app-view colors without changing IDs or downloaded photo artwork.

Dark roles: canvas #10151F, surface/overlay #1B2230, secondary #232B3C, tertiary #202C3C, text/action #F3F5FA, muted #B9C2D1, action text #131923, accent #C49AFF with #221134 text, focus #D3AFFF, divider #364158, field boundary #7D8AA0. Semantic text colors are success #70DDA7, warning #FFC573, danger #FF91A7 on explicit dark soft surfaces. No background animation or animated theme transition.

## Typography, shape, and behavior

- Perandory SemiCondensed: Sync identity only. Geist: headings, body, controls. Roman headings; tabular numbers for time/counts.
- Existing spacing/layout and React Aria ownership stay intact. Rounded cards, subtle neutral borders/shadows; existing control sizes and safe-area padding.
- Retain loading, empty, error, disabled, selected, and success behavior. Focus stays visible. No new reveal animation.
- All four networking choices remain: neutral, pale blue, violet grid, and multicolor event. Replace legacy crystal/star/pubmat decoration with static tiles.
- Photo Booth: one supplied Sue frame (`public/new-assets/SS2026 Photobooth Frame.png`), with its navy ground, colored tiles, logo, “South Summit 2026” title, BUILD GROW LEAD footer, and mascot placement preserved. Three photo windows sit beneath the transparent artwork; preview and export share window coordinates. No frame picker or added date. App light/dark appearance does not recolor the artwork.
- PWA/share/notification assets use the same logo and light identity. Generate outputs from source scripts.

## Boundaries

No route, auth, access-control, database, import, or deployment changes. Theme work does not authorize production writes. Keep old reference/source assets. Shared CSS role tokens and this file are the visual source of truth.

Soft status surfaces are explicit light tokens: accent #F1E8FA, success #E6F3EC, warning #FBEFE0, danger #FCECEF. Browser measurements retain at least 4.74:1 for small semantic text. Finished sessions retain readable text instead of reducing whole-card opacity.

Regenerate identity assets with `node scripts/generate-icons.mjs` (using `scripts/event-art.mjs`) and the supplied Sue photo frame with `node scripts/generate-event-frames.mjs`. Keep all original and legacy frame assets.
