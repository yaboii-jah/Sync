# UI Context

## Theme

Dark only — no light mode. The app carries the event's emerald-city brand into a functional interface, but as a *toned-down, usable translation* of it, not a poster. Page grounds run dark-teal (not near-black — the brand doc is explicit that a near-black ground reads as a different, rejected brand). Primary text is pale-lime on dark. Gold and chartreuse are reserved for emphasis and highlights, never base surfaces.

The full ceremonial treatment (starfield, constellations, comet streaks, glowing crystal city) is reserved for the **Landing/Login screen only** — the one moment the app gets to introduce itself. Everything past sign-in (schedule, notifications, session lists) drops the atmosphere layer entirely and relies on the plain UI palette, generous spacing, and a thin gold hairline border in place of drop shadows for elevation. Data-dense screens are not the place for glow and bloom — legibility wins there.

## Colors

Pulled directly from the brand doc's official UI palette (`--color-*`), which the doc itself marks as authoritative for anything a user reads or clicks — the Atmosphere palette (`--art-*`) is not used here except as noted.

| Role            | CSS Variable       | Value                          |
| --------------- | ------------------ | ------------------------------- |
| Page background | `--bg-base`        | `#024056` (dark-teal)           |
| Surface         | `--bg-surface`     | `#10734F` (jade-green)          |
| Primary text    | `--text-primary`   | `#E6FFC9` (pale-lime)           |
| Muted text      | `--text-muted`     | `#A6D95F` (yellow-green)        |
| Primary accent  | `--accent-primary` | `#176844` (dark-green)          |
| Border          | `--border-default` | `#BC8330` (golden-brown)        |
| Error           | `--state-error`    | `#D9614F` (ember — see note)   |
| Success         | `--state-success`  | `#58DE69` (light-green)         |

**Notes on choices that need a human sign-off, not just an assumption:**

- **`--bg-surface` is only safe for large text.** The brand doc's own contrast testing flags jade-green as a weak ground for anything smaller than large text (pastel-yellow measures 4.31:1, light-green 3.36:1 on it). For actual card content — session titles, notification text, body copy — don't fill the card itself with jade-green. Keep card fills on dark-teal (or a slightly lifted neutral) and use jade-green only for section headers/dividers set in larger type.
- **Cards use a gold hairline border, not a filled gold background.** The doc assigns golden-brown to "card backgrounds, panels, borders" but also states golden-brown is not a text color and untested with light text on top. Rather than guess at that pairing, cards here use a dark-teal fill with pale-lime text and a 1px golden-brown hairline border — which also matches the brand's own stated signature motif ("even the frame on the event-details poster is a 1px glowing hairline").
- **`--state-error` (`#D9614F`, "ember") is not one of the 12 official brand tokens** — none of them read as "something went wrong" without colliding with an existing role (pastel-yellow is already highlights/badges, and there's no red anywhere in either palette). Ember is a warm coral-red pulled toward the same warm register as gold and the comet-streak motifs, rather than a generic SaaS red, so it reads as danger without looking imported from a different brand. Treat this as a pragmatic addition on top of the official palette, not an official brand color — worth a quick sanity check with whoever owns the brand system when there's time, but not a blocker.
- **Icon highlights / secondary hover** can use sky-blue (`#7CD0F7`) per its stated role, even though it's not one of the 8 template slots above.

## Typography

| Role      | Font                     | Variable       |
| --------- | ------------------------ | -------------- |
| UI text   | Lato                     | `--font-sans`  |
| Display   | Perandory SemiCondensed  | `--font-display` |
| Code/mono | Not applicable           | —              |

Lato is the brand doc's own choice for "body, eyebrow, UI" — so it's already the designated interface font, not a substitution. Use it for everything: session titles, body copy, buttons, badges, nav labels.

**Perandory SemiCondensed** (the display serif) is reserved for a handful of large, ceremonial moments only — the app name/lockup on the Landing screen, maybe a section header on "More." It does not belong in list items, cards, or anything read at a glance.

**Amoresa** (the decorative swash) is deliberately left out of the app entirely. The brand doc itself flags its vertical metrics as hazardous at display sizes, requiring careful `line-height: 0` handling — a risk worth taking on a poster, not worth it in a compact mobile UI where it would collide with adjacent lines constantly.

No code or monospace surfaces exist in this app, so `--font-mono` is unused. If that changes, nothing in the brand doc dictates a choice — pick a neutral geometric mono and pair it against Lato rather than trying to force a brand-specific one.

## Border Radius

Nothing in this brand is a hard edge or a flat rectangle, so radii should read as generous and soft rather than sharp:

| Context           | Class            |
| ------------------ | ---------------- |
| Inline / small UI  | `rounded-lg` (~8px) |
| Cards / panels     | `rounded-2xl` (~16px) |
| Modals / overlays  | `rounded-3xl` (~24px), paired with a soft glow ring instead of a hard shadow |

(Framework-agnostic — these assume Tailwind's scale as shorthand since no CSS framework has been finalized yet; the pixel values are what actually matters.)

## Component Library

Not yet decided. If a library is adopted later (e.g. shadcn/ui), its default theme presets won't match this brand at all and every token above will need to be reapplied on top — treat that as a full re-skin, not a config tweak.

## Layout Patterns

- **Landing/Login**: the one screen carrying the full brand treatment — centered, symmetric, starfield/constellation wash, the crystal-city key art, Perandory SemiCondensed lockup. This is the "poster" moment.
- **Home dashboard**: single column, dark-teal ground. The "Happening Now" card is the focal point — treated with a soft gold glow ring behind it (echoing the poster's "glowing arc behind the subject" motif) rather than a bright fill color.
- **Bottom tab navigation**: dark-teal bar with a thin golden-brown hairline top border. Active tab reads via a light-green icon glow, not a filled pill or background block.
- **Lists (schedule, notifications, speakers)**: stacked cards, dark-teal fill, pale-lime text, thin golden-brown hairline border — no drop shadows anywhere in this app, per the brand doc's explicit rejection of "drop-shadow stacks."
- **Modals/overlays** (session detail, networking QR, speaker bio): centered, generously rounded, backdrop blur, a glowing hairline border in place of a hard modal edge.

## Icons

Lucide React, stroke-based only — thin, ungapped strokes are the closest icon language to the brand's own "nothing has a hard edge... fine hairline" instruction. Filled/solid icon sets should be avoided entirely; they'd read as flat fills, which the brand doc calls out directly as foreign to this identity.

- Inline: `h-4 w-4`
- Buttons/nav: `h-5 w-5`
- Active/highlighted state: tint with sky-blue (`#7CD0F7`), per its stated role as icon-highlight color
