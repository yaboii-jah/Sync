# UI Context

## Component System

**Local AWS SCD primitives**, built with React Aria Components and Tailwind CSS v4. React Aria owns keyboard interaction, focus management, ARIA semantics, overlays, tabs, switches, and fields; `components/ui/` owns the visual treatment and component composition.

The standing rule is **no route-owned UI primitives**. Use the local components for buttons, cards, chips, dialogs, tabs, switches, skeletons, avatars, and toasts. Global tokens establish the event palette, tonal surfaces, UI typography, and Home focal treatment; individual screens do not invent parallel component styling.

The admitted exceptions cover real anchors, navigation landmarks, functional media, and the standalone maintenance response:

1. `components/ui/link-button.ts` — class strings for anchors (`target="_blank"`, `next/link` navigation) that must read as a Button. Built from local tokens only.
2. Navigation shells — `bottom-tabs.tsx`, `side-rail.tsx`, `admin-nav.tsx`. These are `<nav>` landmarks of `next/link` elements; the local Tabs primitive is a tab-panel widget, not routing. Styled with local tokens only.
3. The QR tile in `connect-card.tsx` — neutral-white ground and dark-ink modules, because scanners require that contrast. Functional, not decorative.
4. The event strip in `components/photo-booth/photo-booth-client.tsx` — fixed photo windows beneath the supplied Sue frame artwork, because live camera frames and canvas output require a fixed 9:16 composition. Functional, not decorative.
5. `lib/maintenance.ts` — standalone HTML/CSS returned directly with HTTP 503 before React or Supabase runs. It mirrors the light role palette and Sync typefaces, with neutral maintenance wording and no event decoration. The normal `/maintenance` page uses server-safe primitives.

Anything else that needs a new visual should be assembled from local primitives first.

Local compound components must retain their interactive primitive. In
particular, `Switch.Content` is the clickable label and must wrap both the
visible label content and `Switch.Control`; wrapping only the track leaves the
rest of the row inert. Field-adjacent counters must not use `Typography` inside
a `TextField` because React Aria reserves nested text slots for descriptions and
errors.

**The signed-out portal, `app/page.tsx`, uses the supplied South Summity 2026 artwork.** This landing-only exception has a white grid canvas, the transparent event logo, a dark Perandory Sync heading, dark readable copy, and a dark Google sign-in action. `app/landing.module.css` scopes its tokens and presentation without changing shared fonts. A server-rendered CSS backdrop recreates the white square grid and colored tiles: 8 columns below 640px, 16 below 1024px, and 24 on larger screens. Smaller layouts use fewer edge clusters, keeping the content readable; squares and grid spacing share one container-based cell size. The background PNG is a retained reference only. CSS recreates the reference video's four corner glows with a five-second, three-pulse loop. An existing local Button controls pause/resume; reduced-motion preferences retain the CSS grid/tiles and a subtle static corner haze, and hide the motion control. The MP4 is a reference asset only. The app-wide theme, PWA identity, social images, and photo frames follow design.md; authentication and event data remain separate boundaries.

## Theme

**Light/dark appearance for authenticated attendee and admin workspaces.** See design.md for the locked palette. First visits follow the device; visible sun/moon buttons in mobile headers and desktop rails save a browser-local light/dark choice. Scoped role overrides adapt shared primitives, menus, dialogs, fields, toasts, and signed-in networking templates together. QR grounds remain white. Landing, maintenance, and anonymous public cards stay light. The landing keeps its pauseable animation; app decoration and theme changes are static.

The table lists public/light defaults; dark app roles are specified in `design.md` and scoped in the shared stylesheet.

| Token | Value | Use |
| --- | --- | --- |
| background | #F7F7FA | Page ground |
| surface / overlay | #FFFFFF | Cards, dialogs |
| foreground / action | #17171C | Text / primary buttons |
| muted | #45454F | Supporting text |
| accent / focus | #742BC0 | Selection / keyboard focus |
| border | #D8DBE2 | Dividers and card edges |
| field-border | #7C808B | Interactive input boundaries |
| success / warning / danger | #087A43 / #8A4B00 / #B42338 | Functional status |

Bright blue, green, violet, orange, and pink are decorative accents sampled from the supplied logo/artwork. Do not use them as small functional text.

Authenticated attendee and admin shells opt into the shared `.app-field--event` canvas: scoped `#F0F3FA` ground, faint grid lines, and sparse static blue/violet/green tiles mixed into that ground. Cells are 48px on phones and 64px from 768px; phones show three tiles, larger screens six. The grid starts after the desktop rail (232px attendee, 256px admin), extends through the document, and never captures pointer events or creates a scroll container. Keep content panels, navigation, fields, dialogs, and functional QR surfaces opaque. The base `.app-field`, global background token, landing poster/animation, maintenance pages, anonymous public-card viewer, and card/photo artwork retain their existing presentation.

The event canvas also has four fixed, pointer-transparent corner washes: blue top-left, pink top-right, violet bottom-left, green bottom-right. Their bounds exclude desktop rails and remain anchored to the viewport while document content scrolls. Phones use smaller/softer washes. A shared appearance boundary gives React Aria overlays a themed portal host without changing positioning, focus ownership, or scroll containment.

## iOS conventions on /home

`/home` is the one screen tuned deliberately toward a native-app read, using local primitives throughout:

- **One dramatic surface.** The hero is an opaque focal panel (white in light mode, navy-charcoal in dark) with a restrained static grid and corner tiles, a green live dot, a `ProgressBar` and a ticking countdown. Every other card stays a quiet tonal panel. Finished sessions keep readable text rather than reducing the entire card opacity.
- **Squircles.** `corner-shape: squircle` via the `.squircle` utility on hero, cells, capsule and dialog. Progressive enhancement — browsers without it keep the plain radius.
- **Grouped time blocks.** The program list uses one time heading per start-time block and stacks concurrent choices beneath it. A Manila date heading sits above the first group and above every group whose Manila calendar date differs from the group above it, so consecutive same-day groups state their date once and two groups sharing a clock time on different days are still told apart. The old continuous progress rail is omitted because a single day-progress line is misleading when sessions run in parallel.
- **Parallel hero choices.** Happening Now and Up Next show every live session or every session in the earliest upcoming time block; each choice opens its own detail dialog.
- **Manual live status.** Badges and live/next choices use stored admin-controlled state. Planned progress/countdowns remain informational, with scheduled-end wording and an overtime label. An overdue Not Started card says “Awaiting admin start”; unfinished sessions remain visible after the event's scheduled end.
- **Undo End.** Finished sessions with a manual end timestamp offer an outlined Undo End action. Confirmation explains resetting to Not Started, clearing the current actual start/end timestamps, and requiring another manual Start. Original timing remains in audit history. Earlier alerts and removed bookmarks remain unchanged. Notify attendees stays off until deliberately selected. Draft Delete is hidden for sessions with manual lifecycle history, independently enforced in the database.
- **Event theme placement.** `event.theme` is centered at the top of every hero state, including the pre-event countdown; it is not repeated beneath the program date.
- **Venue placement.** The pre-event countdown hero states the venue as a map link at every breakpoint, with a live companion map in the desktop hero column. Both use the trimmed active `event.venue` through the shared map-link helper; the displayed name, accessibility text, external destination, and embedded map always agree. Full venue names wrap. A null/blank venue shows “Venue to be announced” in the countdown hero and omits the map and map links. There is no previous-event fallback or invented street address. The program column carries no venue text; other hero states keep their present content.
- **Conflict feedback.** My Flow permits overlapping bookmarks, warns on save, and marks every involved saved card with a warning chip.
- **Press feedback.** `active:scale-[0.98]` on cards and the capsule, `active:scale-95` on tabs, all collapsing under `motion-reduce`.
- **Safe areas.** The tab bar pads by `env(safe-area-inset-bottom)`.
- **Dialogs are centred**, capped at `85dvh` with `scroll="inside"` so a long session scrolls internally instead of overflowing.

## Typography

Geist is the application-wide interface font through `--font-sans` and `--font-display`. Perandory SemiCondensed is available through `--font-identity` and is reserved for the `Sync` landing and navigation wordmarks only. Local `Typography` primitives provide the shared type scale.

- Page titles: `<Typography.Heading level={1}>` via `components/page-header.tsx`
- Section titles: `<Typography.Heading level={2} className="text-base">`
- Body: `<Typography type="body-sm">`, muted variants with `color="muted"`
- Numbers in metrics and countdowns: `tabular-nums`
- Session-card durations and relative times use the short vocabulary `min`, `hr`, `d`. The longer wording (`5 hours ago`) belongs to Alerts, the admin console, and the session detail modal

## Shape, spacing, elevation

Local tokens provide `--radius` for controls and cards, `--field-radius` for inputs, and overlay shadows. Cards use a generous radius and tonal separation; focal surfaces may use static grid/tile accents; dialogs use neutral elevation.

## Icons

`lucide-react`, stroke only, sized with Tailwind's `size-*`:

- Inline: `size-4`
- Buttons and nav: `size-5`

Icons never carry colour of their own; they inherit `currentColor`.

## Layout patterns

- **Landing / login**: responsive CSS white grid/tile poster, supplied logo, dark Sync identity and Google action. Only the landing has pauseable decorative motion.
- **Public networking card**: `/c/[token]` is a focused, noindex card page outside the authenticated navigation shell. It uses local surfaces and link-button styles, shows the active attendee identity and social destinations, and gives malformed, unknown, linkless, and inactive tokens the same unavailable state. The owner may append `?preview=1` to inspect their own active card without changing its resolution; only a verified owner preview receives a Back to Connect control.
- **Connect scanner**: `/connect` places a prominent Scan attendee QR action above the owner's card. It opens a dismissible camera modal only after explicit user action, prefers the rear camera, offers a QR screenshot picker, and decodes only local `/c/<UUID>` networking-card paths. Camera tracks and image data remain in browser memory, and arbitrary QR destinations are never followed.
- **Home**: sticky hero pane (~38%) beside the schedule list at `≥1024px`; single column below. The hero is a `Card`; the All / My Flow filter uses local `Tabs`.
- **Lists**: stacked tonal `Card`s where hierarchy needs separation. Program Flow uses grouped time headings with stacked session cards; Alerts, audit, attendees, deliveries, and notification history use one surface with `Separator` rows rather than a border on every row.
- **Overlays**: `Modal` for detail (session, person, push explainer), `AlertDialog` for anything destructive or irreversible (sign out, live session control, notification send). Dialog panels are always opaque `--overlay` surfaces; only the backdrop is translucent.
- **Overlay dismissal**: every idle `Modal` and `AlertDialog` closes when the backdrop outside its container is clicked; submission states disable outside dismissal until the action settles.
- **Install prompt**: Home offers a dismissible, opaque floating install card above the mobile navigation and at the desktop bottom-right after a short delay. It has no decorative download icon, never blocks the page or uses a backdrop, and reflows from an inline action to a second-row full-width action below 360px. It also waits for the first-run push dialog. The card is held from the moment that dialog begins its permission check and is released once the dialog reaches a terminal state, including a permission denial, so the two first-run prompts are never on screen together.
- **Sign-out confirmation**: uses the same medium-width AlertDialog treatment as event controls — a plain left-aligned heading/body, neutral `Cancel`, and accent `Confirm` action without a decorative leading icon.
- **Admin session editing**: schedule fields are labeled `(PHT)` and use the event's Asia/Manila wall-clock timezone. Deleting a draft always opens a destructive confirmation dialog.
- **Admin access**: attendee details include an Admin access section with Attendee, Admin, or Protected admin status. Make admin and Remove admin access use a local AlertDialog naming the target and explaining their permissions. Protected/self accounts show explanatory text without a removal action. Submission blocks confirmation dismissal and parent-detail dismissal; errors remain in the confirmation for an idempotent retry. The detail body scrolls inside an `85dvh` cap. Both themes use existing tokens and primitives.
- **Admin raffle export**: the Attendees heading offers a full-width-on-mobile `Export raffle names` action. Its modal fetches the complete eligible snapshot on demand, provides a read-only one-line-per-entry preview plus Copy and plain-text Download actions, and widens at desktop widths. Its footer keeps Close left of the action group on desktop and stacks Copy, Download, then Close on mobile. Numbered duplicate labels are clickable only inside the protected modal, where they open the existing attendee-detail dialog for private confirmation.
- **Bottom tabs** (`<1024px`) and a **fixed labeled sidebar** (`232px`, `≥1024px`) for attendees; the attendee profile menu owns Account, Admin, and Sign out in both presentations. `/admin` keeps a compact mobile utility header above a fixed icon-and-label bottom bar and uses a **256px rail** on desktop. All use white grounds, neutral edges, and dark labels with violet active states.
- **App identity assets**: browser/PWA/notification/share images are generated from the supplied event logo, with white safe-area padding for installed icons and a monochrome notification badge.
- **More**: Quick Links always appear above the complete speaker responsive lineup, starting with the built-in Photo Booth link even when configured links are empty. A configured link to the same booth route is deduplicated. Quick-link cards use one column on phones and two from 640px, with visible keyboard focus. Desktop speakers use a portrait-led grid; narrow widths collapse to compact rows. Missing portraits use branded initials, and the bio modal omits unavailable optional content gracefully.
- **Photo Booth**: keep the attendee shell, three photo slots, local-only camera/image-picker capture, countdowns, review/retakes, and 1080x1920 JPEG export. Use only the supplied `SS2026 Photobooth Frame.png` Sue frame, optimized by the frame generator; there is no frame picker. Photos render beneath its navy ground, colored tiles, logo, title, and mascot edges. Shared window coordinates align preview and export. Preserve the supplied “South Summit 2026” lettering without changing the event data spelling. Artwork is independent of app appearance; camera/async ownership invariants are unchanged.
- **Empty states**: one component, `components/empty-states.tsx` — icon, what is missing, what to do about it.
- **Loading**: local `Skeleton` shaped like the content it replaces, per route `loading.tsx`.

## States

Every interactive surface ships loading, empty and error states. Errors are local `Alert status="danger"` or `FieldError` inside the owning field; transient confirmations are toasts via `useToast()` (`components/toast/toast-provider.tsx`). The toast region is mounted once in `app/providers.tsx`.
