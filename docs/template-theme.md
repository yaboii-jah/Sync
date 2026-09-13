# Event Networking Card Theme

## Purpose

Each event can offer a branded networking card without forcing its visual identity into the global Sync profile. A user keeps reusable social URLs globally and selects which links appear in each event.

## Model

- One stable, random card token per event membership
- Event-scoped selected links and template choice
- Event-scoped scan history
- No email, role, or private profile data encoded in the QR payload
- Public resolution only while the event is published and the membership is active

For archived events, anonymous card resolution is disabled. People who were active members may reopen connections already saved during that event.

## Visual rules

- Cards inherit the event's semantic theme tokens.
- The QR quiet zone and foreground/background contrast are fixed for scan reliability.
- Decorative artwork may not overlap identity, link, or QR safe areas.
- Name, avatar fallback, event name, and selected link icons remain readable at phone width.
- Templates must work without a cover image or uploaded logo.
- The archived AWS template remains private to its legacy event.

## Initial templates

- **Clear** — light, restrained, content-first
- **Night** — dark surface with event accent
- **Play** — bolder shapes derived from the event accent and cover

These templates map to the event presets but are independently selectable. Custom HTML/CSS templates are out of scope.

## Accessibility and export

- Maintain WCAG AA contrast outside the QR's stricter black/white region.
- Do not convey social-network availability by color alone.
- Exported images include the event name and a short Sync attribution.
- Reduced motion disables animated previews.
