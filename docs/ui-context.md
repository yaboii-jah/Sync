# UI Context

## Experience direction

Sync has an attendee-first, event-neutral platform shell. It should feel lively and welcoming without becoming visually noisy. The signed-in hub makes opening the user's current or most relevant event the dominant action, while clearly separating events they manage from events they attend.

The generic platform must not inherit AWS colors, names, imagery, or Perandory typography. The archived AWS tenant keeps its legacy presentation inside its scoped event routes.

## Design system

- Use Geist Sans and Geist Mono for the platform and organizer interfaces.
- Use semantic CSS variables rather than raw tenant colors in components.
- Preserve React Aria interaction semantics and Tailwind-based styling.
- Prefer clear hierarchy, generous touch targets, purposeful empty states, and restrained CSS motion.
- Avoid generic dashboard grids, decorative gradients without purpose, excessive pills, and dense card nesting.

## Platform shell

- Neutral warm or cool surfaces with strong readable contrast
- One primary platform accent for navigation and calls to action
- Attendee routes use compact mobile-first navigation
- Management routes use a denser workspace layout without looking like a separate product
- Super-admin surfaces are visibly platform-level and never borrow an event's brand

## Event theming

Organizer-controlled inputs:

- Logo
- Cover image
- Preset: `daylight`, `midnight`, or `festival`
- Custom accent color that passes validation

Platform-controlled tokens:

- Success, warning, destructive, and informational status colors
- Text/background contrast pairs
- Focus rings
- Disabled states
- Form validation
- System overlays and permission warnings

The theme resolver converts event settings into semantic tokens such as `--event-accent`, `--event-accent-contrast`, `--event-surface`, and `--event-hero-overlay`. Components never assume that the accent itself is safe for text. Reject accents that cannot produce an accessible interaction palette.

## Key screens

### Public event page

Show event identity, description, cover, venue, dates, timezone-aware schedule preview, and published speakers. The primary action is `Join event`; signed-out users authenticate before confirming membership. Published pages are unlisted and noindex by default.

### Event hub

Lead with `Open current event`. Follow with two scannable sections: `Attending` and `Managing`. Include `Create event` as a clear secondary action. Archived events live in a separate memories/history treatment.

### Event attendee shell

Brand the header and hero region with the event theme while keeping navigation predictable across events. Archived events display an unmistakable read-only banner and suppress actions that change event state.

### Event management

Use a setup checklist for drafts: basics, dates/timezone, branding, schedule, speakers, team, preview, publish. Destructive lifecycle actions explain their consequences. Ownership transfer, suspension information, and support access are always explicit.

## Responsive and accessible behavior

- Design mobile-first for attendee routes and support desktop organizer workflows.
- Maintain WCAG AA contrast for text and controls.
- All actions must be keyboard reachable with visible focus.
- Respect reduced-motion preferences.
- Use text plus icon or shape for status; color alone is insufficient.
- Localize date order from the browser while labeling the event timezone.

## PWA

There is one global Sync manifest with `/events` as the start URL. Event branding appears after route entry and does not generate separate installable apps in v1.
