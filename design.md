# Design — Sync / South Summity 2026

Locked visual system for the org-event worktree. Extend this system rather than inventing a theme per route.

## Identity and genre

- App: Sync. Event: AWS Student Community Day South Summity 2026 (user-supplied spelling).
- Logo: public/new-assets/SS2026 Icon - Transparent.png. Original references remain untouched.
- Genre: playful event identity with restrained, practical app surfaces.
- Landing: centered poster, CSS grid and tiles, existing pauseable corner animation.
- App/admin: existing navigation and workspaces; static accents only on identity headers and Home's featured surface.
- Public cards: four light templates, preserving template IDs 1–4.

## Theme

| Role | Value |
| --- | --- |
| Background | #F7F7FA |
| Surface / overlay / action text | #FFFFFF |
| Secondary surface | #F1EEF7 |
| Text / primary action | #17171C |
| Muted text | #45454F |
| Accent / focus | #742BC0 |
| Divider | #D8DBE2 |
| Field boundary | #7C808B |
| Success / warning / danger | #087A43 / #8A4B00 / #B42338 |
| Decorative blue / orange / violet / green / pink | #42B4FF / #FF9900 / #AD5CFF / #00E582 / #FF2CFD |

Bright brand colors are decoration, never small functional text. Primary buttons use the action pair; selections use the accent pair. No dark/system/persisted appearance mode.

## Typography, shape, and behavior

- Perandory SemiCondensed: Sync identity only. Geist: headings, body, controls. Roman headings; tabular numbers for time/counts.
- Existing spacing/layout and React Aria ownership stay intact. Rounded cards, subtle neutral borders/shadows; existing control sizes and safe-area padding.
- Retain loading, empty, error, disabled, selected, and success behavior. Focus stays visible. No new reveal animation.
- All four networking choices remain: neutral, pale blue, violet grid, and multicolor event. Replace legacy crystal/star/pubmat decoration with static tiles.
- Photo frames: white grid with blue/green or violet/pink accents; existing three slots and frame IDs, logo/event-name footer, no unconfirmed date or face-covering overlays.
- PWA/share/notification assets use the same logo and light identity. Generate outputs from source scripts.

## Boundaries

No route, auth, access-control, database, import, or deployment changes. Theme work does not authorize production writes. Keep old reference/source assets. Shared CSS role tokens and this file are the visual source of truth.

Soft status surfaces are explicit light tokens: accent #F1E8FA, success #E6F3EC, warning #FBEFE0, danger #FCECEF. Browser measurements retain at least 4.74:1 for small semantic text. Finished sessions retain readable text instead of reducing whole-card opacity.

Regenerate identity assets with `node scripts/generate-icons.mjs` and photo frames with `node scripts/generate-event-frames.mjs`; both share `scripts/event-art.mjs`.
