# UI Context

## Component Library

**HeroUI v3** (`@heroui/react` + `@heroui/styles`), built on React Aria Components and Tailwind CSS v4. This is the design system: it is not a starting point that gets overridden.

The standing rule is **no custom UI**. If HeroUI ships a component for the job, use it. Do not hand-roll a button, chip, modal, tab bar, switch, skeleton, avatar or toast. Do not write bespoke CSS for spacing, elevation, focus rings or motion; HeroUI's tokens and BEM classes already carry them.

There are exactly three admitted exceptions, and each is a real anchor or a nav landmark that HeroUI does not cover:

1. `components/ui/link-button.ts` — class strings for anchors (`target="_blank"`, `next/link` navigation) that must read as a Button. Built from HeroUI tokens only.
2. Navigation shells — `bottom-tabs.tsx`, `side-rail.tsx`, `admin-nav.tsx`. These are `<nav>` landmarks of `next/link` elements; HeroUI's Tabs is a tab-panel widget, not routing. Styled with HeroUI tokens only.
3. The QR tile in `connect-card.tsx` — fixed light ground and near-black modules in both themes, because scanners require that contrast. Functional, not decorative.

Anything else that needs a new visual should be assembled from HeroUI parts first.

HeroUI compound components must retain their interactive primitive. In
particular, `Switch.Content` is the clickable label and must wrap both the
visible label content and `Switch.Control`; wrapping only the track leaves the
rest of the row inert. Field-adjacent counters must not use `Typography` inside
a `TextField` because React Aria reserves nested text slots for descriptions and
errors.

**The one exempt screen is the signed-out portal, `app/page.tsx`.** It keeps its ceremonial teal/gold night-sky treatment — starfield, comets, sheened Perandory lockup, city skyline — and uses no HeroUI component. It is a poster, not an interface, and it is the only surface an attendee sees before the app proper. Its styles live in a clearly fenced block at the bottom of `app/globals.css` and are opt-in: brand colours are exposed as their own `--color-*` utilities (`bg-bg-base`, `text-text-primary`, `text-text-muted`, `bg-pastel-yellow`, `text-charcoal`) that no other screen references, and no HeroUI token is redefined. Everything behind sign-in stays monochrome HeroUI.

## Theme

**Neutral surfaces plus a single tint, light and dark, with light mode as the default.**

`next-themes` writes the `dark` class onto `<html>` (`app/providers.tsx`, `defaultTheme="light"`). HeroUI reads it directly; there is no HeroUI provider. `components/theme-switch.tsx` persists the choice and renders a compact Light / Dark toggle beside Account in desktop navigation; Account Settings exposes Light, Dark, and System choices. Mobile navigation remains unchanged.

`app/globals.css` imports Tailwind, then `@heroui/styles`, then re-points HeroUI's own theme variables. Surfaces stay zero-chroma; `--accent` and the status tokens carry HeroUI's stock values. Nothing new is invented; every override is a HeroUI token:

The dark ground follows iOS's grouped palette — true black with cells stepping through systemGray6/5/4 equivalents — so cards read as cells rather than smudges. Light uses iOS's `#F2F2F7` grouped ground for the same reason: white cells need something to sit on.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#f2f2f7` | `oklch(0 0 0)` |
| `--foreground` | `oklch(0.21 0 0)` | `oklch(0.99 0 0)` |
| `--surface` | `oklch(1 0 0)` | `oklch(0.235 0 0)` |
| `--surface-secondary` | `oklch(0.952 0 0)` | `oklch(0.295 0 0)` |
| `--muted` | `oklch(0.552 0 0)` | `oklch(0.705 0 0)` |
| `--default` | `oklch(0.94 0 0)` | `oklch(0.274 0 0)` |
| `--accent` | `#006fee` | `#006fee` |
| `--border` | `oklch(0.9 0 0)` | `oklch(0.29 0 0)` |

The override blocks sit outside `@layer` deliberately: unlayered rules beat the layered defaults `@heroui/styles` ships, which is the override path HeroUI documents.

**One tint, HeroUI's own.** `--accent` is `#006fee` in both themes — the stock HeroUI primary — and `--success` / `--warning` / `--danger` carry HeroUI's stock status palette (`#17c964`, `#f5a524`, `#f31260`). The tint is spent only where iOS spends it: live state, primary chips, the active tab, the bookmark, focus rings. Everything else stays neutral, which is what keeps one accent from becoming a colour scheme.

Status still leans on fill weight as well as hue:

| Meaning | Treatment |
| --- | --- |
| Highest emphasis / live | `Chip variant="primary"` — solid ink |
| Normal | `Chip variant="secondary"` |
| Low | `Chip variant="tertiary"` |
| Faded / archival | `Chip variant="soft"` |

`components/status-badge.tsx` is the single mapping for session status; `alerts-client.tsx` uses the same ladder for alert kinds.

Live state is the one signal allowed a dot: `live-mini-bar.tsx`, the hero eyebrow and the `/home` time headers each pair an accent dot with a ping that collapses under `motion-reduce`. It marks real state — a session is running now.

## iOS conventions on /home

`/home` is the one screen tuned deliberately toward a native-app read, using HeroUI parts throughout:

- **One dramatic surface.** The hero is a saturated accent gradient (`#00369c → #0072f5`, solid — no translucency) carrying white text, a live dot, a `ProgressBar` and a ticking countdown. Every other card stays a quiet grouped cell. Apple's deference principle: exactly one element may be loud.
- **Squircles.** `corner-shape: squircle` via the `.squircle` utility on hero, cells, capsule and dialog. Progressive enhancement — browsers without it keep the plain radius.
- **Grouped time blocks.** The program list uses one time heading per start-time block and stacks concurrent choices beneath it. The old continuous progress rail is omitted because a single day-progress line is misleading when sessions run in parallel.
- **Parallel hero choices.** Happening Now and Up Next show every live session or every session in the earliest upcoming time block; each choice opens its own detail dialog.
- **Event theme placement.** `event.theme` is centered at the top of every hero state, including the pre-event countdown; it is not repeated beneath the program date.
- **Conflict feedback.** My Flow permits overlapping bookmarks, warns on save, and marks every involved saved card with a HeroUI warning chip.
- **Press feedback.** `active:scale-[0.98]` on cards and the capsule, `active:scale-95` on tabs, all collapsing under `motion-reduce`.
- **Safe areas.** The tab bar pads by `env(safe-area-inset-bottom)`.
- **Dialogs are centred**, capped at `85dvh` with `scroll="inside"` so a long session scrolls internally instead of overflowing.

## Typography

HeroUI's built-in type scale, through the `Typography` component, on every authenticated screen — no custom fonts there. `/home` sets two iOS-scale exceptions in the header and section title (28px and 22px, bold, tight tracking) so the screen opens with a large title the way a native app does.

Lato and Perandory are loaded in `app/layout.tsx` solely for the portal: it sets Lato inline on its `<main>` and reaches Perandory through the `font-display` utility. Neither is the app-wide `--font-sans`, so HeroUI's own type stack is untouched.

- Page titles: `<Typography.Heading level={1}>` via `components/page-header.tsx`
- Section titles: `<Typography.Heading level={2} className="text-base">`
- Body: `<Typography type="body-sm">`, muted variants with `color="muted"`
- Numbers in metrics and countdowns: `tabular-nums`

## Shape, spacing, elevation

All from HeroUI: `--radius` (0.5rem) for controls and cards, `--field-radius` for inputs, `--surface-shadow` for cards, `--overlay-shadow` for overlays. Do not introduce a second radius scale or hand-written shadows.

## Icons

`lucide-react`, stroke only, sized with Tailwind's `size-*`:

- Inline: `size-4`
- Buttons and nav: `size-5`

Icons never carry colour of their own; they inherit `currentColor`.

## Layout patterns

- **Landing / login**: a single centred `Card` with the wordmark, one line of description and one primary action. The previous starfield, comet shower, gradient lockup, grain overlay and skyline SVG are all removed.
- **Public networking card**: `/c/[token]` is a focused, noindex card page outside the authenticated navigation shell. It uses HeroUI surfaces and link-button styles, shows the active attendee identity and social destinations, and gives malformed, unknown, linkless, and inactive tokens the same unavailable state. The owner may append `?preview=1` to inspect their own active card without changing its resolution.
- **Home**: sticky hero pane (~38%) beside the schedule list at `≥1024px`; single column below. The hero is a `Card`; the All / My Flow filter is HeroUI `Tabs`.
- **Lists**: stacked `Card`s. Program Flow uses grouped time headings with stacked session cards; long same-shaped lists (audit, attendees, deliveries) use one `Card` with `Separator` between rows rather than a border on every row.
- **Overlays**: `Modal` for detail (session, person, push explainer), `AlertDialog` for anything destructive or irreversible (sign out, live session control, notification send).
- **Admin session editing**: schedule fields are labeled `(PHT)` and use the event's Asia/Manila wall-clock timezone. Deleting a draft always opens a destructive confirmation dialog.
- **Bottom tabs** (`<1024px`) and a **transparent horizontal top navigation** (`≥1024px`) for attendees; **256px rail** plus a scrolling chip row for `/admin`.
- **Directory**: the people filters include a dedicated Facilitators category for workshop leaders.
- **Empty states**: one component, `components/empty-states.tsx` — icon, what is missing, what to do about it.
- **Loading**: HeroUI `Skeleton` shaped like the content it replaces, per route `loading.tsx`.

## States

Every interactive surface ships loading, empty and error states. Errors are HeroUI `Alert status="danger"` or `FieldError` inside the owning field; transient confirmations are toasts via `useToast()` (`components/toast/toast-provider.tsx`), which wraps HeroUI's imperative `toast()`. The toast region is mounted once in `app/providers.tsx`.
