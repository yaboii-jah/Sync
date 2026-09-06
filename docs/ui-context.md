# UI Context

## Component System

**Local AWS SCD primitives**, built with React Aria Components and Tailwind CSS v4. React Aria owns keyboard interaction, focus management, ARIA semantics, overlays, tabs, switches, and fields; `components/ui/` owns the visual treatment and component composition.

The standing rule is **no route-owned UI primitives**. Use the local components for buttons, cards, chips, dialogs, tabs, switches, skeletons, avatars, and toasts. Global tokens establish the event palette, tonal surfaces, UI typography, and Home focal treatment; individual screens do not invent parallel component styling.

There are exactly four admitted exceptions, and each is a real anchor, a nav landmark, or a functional media surface that the local primitive set does not cover:

1. `components/ui/link-button.ts` — class strings for anchors (`target="_blank"`, `next/link` navigation) that must read as a Button. Built from local tokens only.
2. Navigation shells — `bottom-tabs.tsx`, `side-rail.tsx`, `admin-nav.tsx`. These are `<nav>` landmarks of `next/link` elements; the local Tabs primitive is a tab-panel widget, not routing. Styled with local tokens only.
3. The QR tile in `connect-card.tsx` — neutral-white ground and dark-teal modules, because scanners require that contrast. Functional, not decorative.
4. The event strip in `components/photo-booth/photo-booth-client.tsx` — layered image windows over the supplied event-background artwork, because live camera frames and canvas output require a fixed 9:16 composition. Functional, not decorative.

Anything else that needs a new visual should be assembled from local primitives first.

Local compound components must retain their interactive primitive. In
particular, `Switch.Content` is the clickable label and must wrap both the
visible label content and `Switch.Control`; wrapping only the track leaves the
rest of the row inert. Field-adjacent counters must not use `Typography` inside
a `TextField` because React Aria reserves nested text slots for descriptions and
errors.

**The signed-out portal, `app/page.tsx`, remains the ceremonial peak of the system.** Its story-sky image, restrained comets, and sheened Perandory lockup are more expressive than the app shell, but use the same teal, off-white, gold, and yellow palette. Portal artwork stays limited to the landing route and the Home focal card; dense attendee and admin routes use quiet dark-teal panels.

## Theme

**Dark only.** The root layout supplies the `dark` class to `<html>`; there is no light, system, or persisted appearance selector. `app/globals.css` imports Tailwind and defines the local AWS SCD tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | deep tonal teal | Page ground with restrained grain |
| `--surface` | quiet dark teal | Standard cards and navigation |
| `--surface-secondary` | lifted dark teal | Live, selected, and supporting surfaces |
| `--foreground` | warm off-white | Primary text |
| `--muted` | cool light teal | Supporting text |
| `--accent` | `#fcdb64` | Primary actions and emphasis |
| `--border` | tonal teal | Quiet structural edges |
| `--success` | `#58de69` | Live and successful states |
| `--warning` | `#fcdb64` | Warnings and upcoming states |
| `--danger` | `#d9614f` | Destructive and error states |
| `--focus` | `#7cd0f7` | Focus and icon highlight |

Standard cards use tonal dark-teal fills without a visible outline. Navigation, fields, separators, and dialogs use restrained tonal edges. Gold is reserved for primary actions, focal Home treatment, selected controls, and deliberate live emphasis.

Status uses semantic hue and emphasis:

| Meaning | Treatment |
| --- | --- |
| Ongoing / success | green |
| Upcoming / warning | yellow |
| Finished / archival | muted teal |
| Error / destructive | ember |

`components/status-badge.tsx` is the single mapping for session status; `alerts-client.tsx` uses the same ladder for alert kinds.

Live state is the one signal allowed a dot: `live-mini-bar.tsx`, the hero eyebrow and the `/home` time headers pair a green dot with a ping that collapses under `motion-reduce`. It marks real state — a session is running now.

## iOS conventions on /home

`/home` is the one screen tuned deliberately toward a native-app read, using local primitives throughout:

- **One dramatic surface.** The hero is a luminous dark-teal focal panel with a selective gold edge, layered jade/gold atmosphere, a green live dot, a `ProgressBar` and a ticking countdown. Every other card stays a quiet tonal panel.
- **Squircles.** `corner-shape: squircle` via the `.squircle` utility on hero, cells, capsule and dialog. Progressive enhancement — browsers without it keep the plain radius.
- **Grouped time blocks.** The program list uses one time heading per start-time block and stacks concurrent choices beneath it. The old continuous progress rail is omitted because a single day-progress line is misleading when sessions run in parallel.
- **Parallel hero choices.** Happening Now and Up Next show every live session or every session in the earliest upcoming time block; each choice opens its own detail dialog.
- **Event theme placement.** `event.theme` is centered at the top of every hero state, including the pre-event countdown; it is not repeated beneath the program date.
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

## Shape, spacing, elevation

Local tokens provide `--radius` for controls and cards, `--field-radius` for inputs, and overlay shadows. Cards use a generous radius and tonal separation; focal or modal surfaces may use a restrained teal glow.

## Icons

`lucide-react`, stroke only, sized with Tailwind's `size-*`:

- Inline: `size-4`
- Buttons and nav: `size-5`

Icons never carry colour of their own; they inherit `currentColor`.

## Layout patterns

- **Landing / login**: the landing remains the event poster: `story-sky.webp`, restrained comet motion, gradient lockup, grain overlay, and pale-yellow primary action. The full image is limited to the portal; authenticated shells keep the simplified tonal field.
- **Public networking card**: `/c/[token]` is a focused, noindex card page outside the authenticated navigation shell. It uses local surfaces and link-button styles, shows the active attendee identity and social destinations, and gives malformed, unknown, linkless, and inactive tokens the same unavailable state. The owner may append `?preview=1` to inspect their own active card without changing its resolution; only a verified owner preview receives a Back to Connect control.
- **Connect scanner**: `/connect` places a prominent Scan attendee QR action above the owner's card. It opens a dismissible camera modal only after explicit user action, prefers the rear camera, offers a QR screenshot picker, and decodes only local `/c/<UUID>` networking-card paths. Camera tracks and image data remain in browser memory, and arbitrary QR destinations are never followed.
- **Home**: sticky hero pane (~38%) beside the schedule list at `≥1024px`; single column below. The hero is a `Card`; the All / My Flow filter uses local `Tabs`.
- **Lists**: stacked tonal `Card`s where hierarchy needs separation. Program Flow uses grouped time headings with stacked session cards; Alerts, audit, attendees, deliveries, and notification history use one surface with `Separator` rows rather than a border on every row.
- **Overlays**: `Modal` for detail (session, person, push explainer), `AlertDialog` for anything destructive or irreversible (sign out, live session control, notification send). Dialog panels are always opaque `--overlay` surfaces; only the backdrop is translucent.
- **Overlay dismissal**: every idle `Modal` and `AlertDialog` closes when the backdrop outside its container is clicked; submission states disable outside dismissal until the action settles.
- **Install prompt**: Home offers a dismissible, opaque floating install card above the mobile navigation and at the desktop bottom-right after a short delay. It has no decorative download icon, never blocks the page or uses a backdrop, and reflows from an inline action to a second-row full-width action below 360px.
- **Sign-out confirmation**: uses the same medium-width AlertDialog treatment as event controls — a plain left-aligned heading/body, neutral `Cancel`, and accent `Confirm` action without a decorative leading icon.
- **Admin session editing**: schedule fields are labeled `(PHT)` and use the event's Asia/Manila wall-clock timezone. Deleting a draft always opens a destructive confirmation dialog.
- **Bottom tabs** (`<1024px`) and a **fixed labeled sidebar** (`232px`, `≥1024px`) for attendees; the attendee profile menu owns Account, Admin, and Sign out in both presentations. `/admin` keeps a compact mobile utility header above a fixed icon-and-label bottom bar and uses a **256px rail** on desktop. All use dark-teal grounds, tonal edges, and readable off-white labels.
- **App identity assets**: browser tabs and notification thumbnails use the transparent compact mascot crop; installed app icons use the transparent full seal or a padded teal maskable variant; notification badges use a dedicated monochrome crystal mark.
- **More**: Quick Links remain above the complete speaker responsive lineup. Desktop uses a portrait-led grid; narrow widths collapse to compact rows. Missing portraits use branded initials, and the bio modal omits unavailable optional content gracefully.
- **Photo Booth**: `/more/photo-booth` retains the attendee shell and local controls. Its functional capture stage is a single 9:16 event-branded story-strip background with three landscape photo windows, not a generic camera mockup. Before permission, it explains local-only processing; capture uses three separate countdowns with front/rear switching where available and a normal image-picker fallback. During capture, the live camera is clipped into the selected photo window while the frame and completed slots remain fixed in place. Review exposes Download plus individual slot retakes. A history-aware Back control falls back to `/more`. The media composition is canvas output, held only in browser memory; stale camera work is invalidated and camera tracks stop outside active capture. The supplied event-background artwork is treated as content, not as a new authenticated-screen color system.
- **Empty states**: one component, `components/empty-states.tsx` — icon, what is missing, what to do about it.
- **Loading**: local `Skeleton` shaped like the content it replaces, per route `loading.tsx`.

## States

Every interactive surface ships loading, empty and error states. Errors are local `Alert status="danger"` or `FieldError` inside the owning field; transient confirmations are toasts via `useToast()` (`components/toast/toast-provider.tsx`). The toast region is mounted once in `app/providers.tsx`.
