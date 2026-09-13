# Archived Network Card Theme System
## Student Community Day — Mega Manila 2026

read `AGENTS.md` before executing this file.

> **Purpose:** This file is a design-system specification for an AI coding agent.
> It defines a reusable, dynamic network/profile-card system with **4 interchangeable
> frontend templates**. The agent should be able to switch the visual template by
> changing a variant/theme value rather than rewriting the component structure.
>
> **Important:** Do not hard-code one visual design. The same data and component
> should dynamically render four different card treatments through CSS classes,
> CSS variables, conditional decorative elements, and reusable SVG/image assets.

---

## 1. Design Direction

The visual identity is inspired by the **Student Community Day — Mega Manila 2026**
pubmat.

Core visual ideas:

- Dark, atmospheric teal / deep navy foundation
- Emerald and aqua environmental glow
- Soft mint / cream highlights
- Crystal formations as the primary decorative motif
- Stars, constellation points, moon/crescent details
- Elegant editorial serif/script typography for event branding
- Modern sans-serif typography for application UI
- Glassmorphism used selectively
- Thin luminous borders rather than heavy shadows
- Spacious, premium, community-oriented appearance
- Technology + creativity + exploration feeling
- The card should feel like part of an event ecosystem, not a generic social card

The design should remain practical for a real web application.

### Visual priority

1. Person / avatar
2. Name
3. Organization / community
4. Short description
5. Social connection actions
6. Optional decorative/event elements

Decorations must never overpower the profile information.

---

# 2. Card System Architecture

Use **one reusable NetworkCard component**.

The component should accept data and a visual variant.

Example conceptual API:

```tsx
<NetworkCard
  variant="glass"
  profile={profile}
/>
```

Supported variants:

```ts
type NetworkCardVariant =
  | "solid"
  | "glass"
  | "crystal"
  | "event";
```

The exact implementation can differ depending on the project's framework.

### Data model

The card should work with a generic profile object:

```ts
type NetworkProfile = {
  name: string;
  organization?: string;
  role?: string;
  avatar?: string;
  bio?: string;

  linkedin?: string;
  instagram?: string;

  badge?: string;
  badgeTone?: "default" | "success" | "accent";

  eventLabel?: string;
  eventSubtitle?: string;

  decorativeImage?: string;
};
```

Do not make the component dependent on Albert's actual name or AWS-specific content.

---

# 3. Shared Layout

Every template should contain the same semantic information:

```text
Card
 ├── Header
 │    ├── Avatar
 │    ├── Name
 │    ├── Organization / Role
 │    └── Optional Badge
 │
 ├── Bio
 │
 ├── Social Actions
 │    ├── LinkedIn
 │    └── Instagram
 │
 └── Optional Decorative Layer
```

The content should remain consistent while the **visual treatment changes**.

Do not duplicate the entire component four times.

---

# 4. Theme Tokens

Define shared CSS variables.

Example:

```css
:root {
  --network-bg: #063943;
  --network-bg-deep: #032b34;

  --network-surface: #0a424c;
  --network-surface-soft: rgba(255, 255, 255, 0.055);

  --network-border: rgba(142, 239, 225, 0.28);
  --network-border-strong: rgba(177, 249, 218, 0.5);

  --network-text: #f4f8ed;
  --network-text-muted: rgba(244, 248, 237, 0.72);

  --network-mint: #dff7bd;
  --network-aqua: #6ce6d1;
  --network-cyan: #65d9ff;
  --network-green: #77d68a;

  --network-gold: #f1d77a;

  --network-radius: 18px;
  --network-radius-sm: 12px;

  --network-shadow:
    0 18px 50px rgba(0, 0, 0, 0.22);

  --network-transition:
    180ms ease;
}
```

The actual values can be adjusted to match the existing application theme.

Do not introduce many unrelated colors.

---

# 5. Typography

Use two typography categories.

### UI typography

Use the application's existing sans-serif font.

Used for:

- Name
- Organization
- Bio
- Buttons
- Badges
- Labels

Recommended hierarchy:

```text
Name:
  1.05rem – 1.35rem
  font-weight: 600–700

Organization:
  0.82rem – 0.95rem
  font-weight: 400–500

Bio:
  0.85rem – 0.95rem
  line-height: 1.55

Button:
  0.78rem – 0.9rem
  font-weight: 500–600
```

### Event typography

The decorative Student Community Day branding may use:

- elegant serif
- high-contrast serif
- script accent

Only use this for event/decorative labels.

Do **not** use decorative typography for important user information.

---

# 6. Shared Avatar

The avatar should remain consistent across templates unless a variant explicitly
changes its treatment.

Default:

```css
.network-card__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
```

Allow responsive sizing:

```text
Desktop: 56–72px
Tablet: 52–64px
Mobile: 48–60px
```

Optional treatments:

- thin mint ring
- subtle glow
- double border
- glass ring

Avoid excessive avatar effects.

---

# 7. Shared Social Buttons

The social buttons must be reusable.

Required actions:

- LinkedIn
- Instagram

Desktop default:

```text
[ icon ] Connect on LinkedIn
[ icon ] Connect on Instagram
```

Mobile:

```text
[ LinkedIn icon ]
[ Instagram icon ]
```

The component should support either:

```text
full
```

or:

```text
icon-only
```

depending on the template.

Buttons should have:

- accessible labels
- visible focus state
- hover state
- active state
- disabled state if no URL exists

Do not rely on color alone to communicate state.

---

# 8. Decorative Asset System

Decorations are optional layers.

The card should support:

```tsx
decorativeImage
```

and/or:

```tsx
showCrystal
showStars
showMoon
showEventBranding
```

Decorations must not affect the card's semantic content.

Recommended DOM structure:

```html
<article class="network-card network-card--glass">

  <div class="network-card__decoration" aria-hidden="true">
    ...
  </div>

  <div class="network-card__content">
    ...
  </div>

</article>
```

Use:

```css
.network-card__decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
```

Content should sit above it:

```css
.network-card__content {
  position: relative;
  z-index: 1;
}
```

---

# 9. SVG Support

## Yes — SVG images are fully feasible.

SVG should be treated as a **reusable decorative asset**, not baked into each
card implementation.

Possible assets:

```text
/crystal-outline.svg
/crystal-filled.svg
/stars.svg
/constellation.svg
/moon.svg
/scd-mark.svg
```

They can be rendered as:

```tsx
<img src="/assets/crystal-outline.svg" alt="" aria-hidden="true" />
```

or imported as an SVG component if the framework supports it.

For decorative assets:

```html
aria-hidden="true"
```

should be used.

If the SVG communicates important information, provide an appropriate accessible
label instead.

---

# 10. SVG Placement Rules

SVG decorations should be positioned absolutely.

Example:

```css
.network-card__crystal {
  position: absolute;
  right: -12px;
  bottom: -18px;

  width: 150px;
  opacity: 0.7;

  pointer-events: none;
}
```

The exact placement can change per variant.

Possible placements:

### Bottom right

Best for:

- glass
- solid
- minimal

### Right side

Best for:

- crystal
- event

### Left side

Best for:

- split layout
- vertical layout

### Background center

Use only with low opacity.

Never place an opaque SVG over:

- name
- avatar
- buttons
- important text

---

# 11. Template 01 — SOLID

## Purpose

The safest default card.

Use when:

- readability is most important
- the background is already visually busy
- accessibility is prioritized
- the card appears in a dense grid

### Structure

```text
┌─────────────────────────────────┐
│  ○ Avatar       Name            │
│                 Organization    │
│                                 │
│  Bio                            │
│                                 │
│  [ LinkedIn ] [ Instagram ]     │
└─────────────────────────────────┘
```

### Styling

- Deep teal surface
- Thin aqua border
- Very subtle shadow
- No strong background image
- Optional low-opacity crystal SVG
- Optional tiny star accents

Recommended:

```css
.network-card--solid {
  background: var(--network-surface);
  border: 1px solid var(--network-border);
  box-shadow: var(--network-shadow);
}
```

### Decoration

Use:

```text
crystal-outline.svg
```

at approximately:

```text
opacity: 0.08–0.18
```

This is the most production-safe template.

---

# 12. Template 02 — GLASS

## Preferred Style

This is the primary recommended template because it most closely matches the
visual language of the provided Student Community Day pubmat.

## Purpose

Create a premium, atmospheric card.

### Structure

```text
┌─────────────────────────────────┐
│ ○ Avatar    Name          Badge │
│            Organization         │
│                                 │
│ Bio                             │
│                                 │
│ [ LinkedIn ] [ Instagram ]      │
│                         ◇       │
└─────────────────────────────────┘
```

### Styling

Use:

- translucent surface
- backdrop blur
- gradient background
- soft green/blue glow
- thin border
- crystal SVG
- stars/moon as optional decorations

Example:

```css
.network-card--glass {
  background:
    linear-gradient(
      135deg,
      rgba(25, 111, 128, 0.52),
      rgba(22, 91, 72, 0.34)
    );

  border: 1px solid rgba(180, 250, 224, 0.34);

  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

Add an atmospheric pseudo-element or background layer.

Avoid making the background too bright.

The profile content must remain the visual priority.

### Recommended decoration

```text
crystal-filled.svg
stars.svg
moon.svg
```

Use them with low-to-medium opacity.

---

# 13. Template 03 — CRYSTAL OUTLINE

## Purpose

A more artistic variant using the provided line-art crystal material.

### Visual direction

- dark transparent background
- thin cream/mint crystal outline
- constellation details
- tiny stars
- optional crescent moon
- event branding as a small footer

### Structure

```text
┌─────────────────────────────────┐
│ Event label                     │
│                                 │
│ ○ Avatar     Name               │
│             Organization        │
│                                 │
│ Bio                             │
│                                 │
│ [ LinkedIn ] [ Instagram ]      │
│                          ◇◇◇    │
└─────────────────────────────────┘
```

### Decoration

Use:

```text
crystal-outline.svg
stars.svg
moon.svg
```

The crystal can occupy approximately:

```text
25–38% of card width
```

but must not cover the content.

### Styling

```css
.network-card--crystal {
  background: rgba(3, 43, 52, 0.94);
  border: 1px solid rgba(154, 239, 222, 0.42);
}
```

The crystal should feel like an illustration printed into the card.

Avoid a heavy glow.

---

# 14. Template 04 — EVENT

## Purpose

A more expressive card for featured people, organizers, speakers, ambassadors,
or special community members.

This should visually connect the network section directly to the event pubmat.

### Structure

```text
┌─────────────────────────────────┐
│      STUDENT COMMUNITY DAY      │
│          MEGA MANILA            │
│                                 │
│ ○ Avatar     Name               │
│             Organization        │
│                                 │
│ Bio                             │
│                                 │
│ [ LinkedIn ] [ Instagram ]      │
│                                 │
│        BUILD · FORGE · REPEAT   │
└─────────────────────────────────┘
```

### Styling

Use:

- atmospheric gradient
- event branding
- crystal illustration
- star field
- soft green/yellow glow
- stronger visual framing

Do not turn the card into a literal event poster.

The person must still be the primary subject.

### Suggested background

```css
.network-card--event {
  background:
    radial-gradient(
      circle at 85% 15%,
      rgba(233, 205, 108, 0.24),
      transparent 28%
    ),
    radial-gradient(
      circle at 15% 80%,
      rgba(56, 205, 170, 0.25),
      transparent 34%
    ),
    var(--network-bg-deep);
}
```

---

# 15. Variant Comparison

| Variant | Visual intensity | Best use | SVG | Glass |
|---|---:|---|---|---|
| Solid | Low | Default / many cards | Optional | No |
| Glass | Medium | Main network cards | Recommended | Yes |
| Crystal | Medium-high | Artistic community profiles | Strong | Optional |
| Event | High | Featured profiles | Strong | Optional |

Recommended default:

```ts
variant = "glass";
```

---

# 16. Dynamic Theme Configuration

Instead of hard-coding styles throughout the component, define configuration.

Example:

```ts
const networkCardThemes = {
  solid: {
    className: "network-card--solid",
    showCrystal: false,
    showStars: false,
    showMoon: false,
    showEventBranding: false,
    socialMode: "full",
  },

  glass: {
    className: "network-card--glass",
    showCrystal: true,
    showStars: true,
    showMoon: true,
    showEventBranding: false,
    socialMode: "full",
  },

  crystal: {
    className: "network-card--crystal",
    showCrystal: true,
    showStars: true,
    showMoon: true,
    showEventBranding: true,
    socialMode: "full",
  },

  event: {
    className: "network-card--event",
    showCrystal: true,
    showStars: true,
    showMoon: true,
    showEventBranding: true,
    socialMode: "full",
  },
};
```

The actual implementation can use a different structure, but the principle is:

> **One component. Four visual configurations.**

---

# 17. CSS Architecture

Recommended class hierarchy:

```text
.network-card
.network-card__decoration
.network-card__content

.network-card__header
.network-card__identity
.network-card__avatar
.network-card__name
.network-card__organization
.network-card__badge

.network-card__bio

.network-card__actions
.network-card__social-button
.network-card__social-icon

.network-card__event-label
.network-card__crystal
.network-card__stars
.network-card__moon

.network-card--solid
.network-card--glass
.network-card--crystal
.network-card--event
```

Avoid:

```text
.albert-card
.aws-card
.student-card-1
.card-new
.card-final-final
```

The component is a reusable system, not a one-off design.

---

# 18. Responsive Behavior

Cards should work at:

```text
Mobile
Tablet
Desktop
Large desktop
```

### Desktop

Recommended:

```text
width: 100%
min-height: 260px
```

depending on the surrounding grid.

### Mobile

Use:

```text
single column
full-width social buttons
reduced decoration
smaller crystal
```

Example:

```css
@media (max-width: 640px) {
  .network-card {
    min-height: auto;
  }

  .network-card__actions {
    grid-template-columns: 1fr;
  }

  .network-card__crystal {
    width: 110px;
    opacity: 0.45;
  }
}
```

Do not simply shrink every element proportionally.

---

# 19. Accessibility

All templates must preserve accessibility.

Requirements:

- Semantic `<article>` for the card
- Real heading for the person's name
- Descriptive link labels
- Keyboard focus states
- Sufficient text contrast
- Decorative SVGs marked `aria-hidden="true"`
- Do not communicate information only through color
- Respect reduced motion

Example:

```css
@media (prefers-reduced-motion: reduce) {
  .network-card,
  .network-card * {
    transition: none !important;
    animation: none !important;
  }
}
```

---

# 20. Hover Interaction

Keep interaction subtle.

Possible hover behavior:

```text
Card:
  translateY(-2px)

Border:
  slightly brighter

Crystal:
  opacity + 0.05

Shadow:
  slightly stronger
```

Avoid:

- large rotations
- excessive scaling
- flashing
- aggressive glow
- moving decorations across the card

The site should feel premium, not game-like.

---

# 21. SVG vs Raster Assets

Prefer SVG when the asset is:

- line art
- crystal illustration
- stars
- moon
- constellation
- decorative logo
- simple geometric artwork

Prefer PNG/WebP when the asset is:

- photograph
- complex texture
- generated artwork
- photographic background

SVG is especially useful because:

1. It scales cleanly.
2. It works at different card sizes.
3. It can be reused across all four templates.
4. It can be recolored if designed appropriately.
5. It avoids creating four copies of the same artwork.

---

# 22. Performance Rules

Decorations should not hurt page performance.

Do not load every decorative asset if the current variant does not use it.

Conceptually:

```tsx
{theme.showCrystal && <CrystalDecoration />}
{theme.showStars && <StarsDecoration />}
{theme.showMoon && <MoonDecoration />}
```

Avoid rendering hidden assets unnecessarily.

For many network cards:

- use optimized images
- lazy-load non-critical images
- avoid large background raster images
- prefer small SVG decorations
- avoid excessive backdrop-filter layers

---

# 23. Recommended Network Grid

For desktop:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Network Card │ │ Network Card │ │ Network Card │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Network Card │ │ Network Card │ │ Network Card │
└──────────────┘ └──────────────┘ └──────────────┘
```

Example:

```css
.network-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

@media (max-width: 1024px) {
  .network-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .network-grid {
    grid-template-columns: 1fr;
  }
}
```

---

# 24. Theme Switching

The application should make changing templates easy.

Example:

```tsx
const [variant, setVariant] =
  useState<NetworkCardVariant>("glass");
```

Then:

```tsx
<NetworkCard
  variant={variant}
  profile={profile}
/>
```

A developer/admin preview can expose:

```text
Solid
Glass
Crystal
Event
```

as a selector.

This makes the component useful as a live design-preview system.

---

# 25. Design Preview Mode

If the application has a development/design mode, create:

```text
NetworkCardPreview
```

that renders the same profile using all four variants.

Example:

```tsx
const variants = [
  "solid",
  "glass",
  "crystal",
  "event",
];

return (
  <div className="network-preview-grid">
    {variants.map((variant) => (
      <NetworkCard
        key={variant}
        variant={variant}
        profile={profile}
      />
    ))}
  </div>
);
```

This is preferable to maintaining four separate implementations.

---

# 26. Implementation Constraints

The agent should follow these rules:

### DO

- Reuse the existing NetworkCard component.
- Refactor CSS rather than duplicate components.
- Use CSS variables.
- Use variant classes.
- Keep data separate from styling.
- Reuse SVG assets.
- Keep decorative layers optional.
- Preserve existing functionality.
- Preserve existing links.
- Preserve responsive behavior.
- Preserve accessibility.
- Make the four variants visually distinct.

### DO NOT

- Create four separate card components.
- Hard-code profile names.
- Hard-code AWS content.
- Replace working social links.
- introduce a new framework just for styling
- add unnecessary dependencies
- rebuild the page architecture
- convert SVG assets into huge raster backgrounds
- place decorations over readable content
- sacrifice accessibility for visual effects
- make every card use heavy glassmorphism
- make every card look like a literal event poster

---

# 27. Priority Order When Making Tradeoffs

When the design conflicts with implementation, prioritize:

```text
1. Functionality
2. Accessibility
3. Readability
4. Responsive behavior
5. Consistent component architecture
6. Event visual identity
7. Decorative effects
```

The card must still be a good UI component even if every decorative asset is removed.

---

# 28. Final Visual Goal

The four templates should feel like they belong to the same family:

```text
SOLID
Reliable
        ↓
GLASS
Atmospheric
        ↓
CRYSTAL
Artistic
        ↓
EVENT
Featured
```

They should **not** feel like four unrelated websites.

Shared:

- typography
- spacing
- avatar
- content hierarchy
- buttons
- colors
- border language
- event motifs

Different:

- background treatment
- decoration placement
- visual density
- glass usage
- crystal usage
- event branding
- social-button treatment

---

# 29. Recommended Default

For the actual production network section:

```ts
variant = "glass";
```

Use the **Glass** template as the default because it best matches the provided
Student Community Day Mega Manila 2026 pubmat while remaining practical as a
frontend-only component.

Use:

```text
Solid   → fallback / dense lists
Glass   → default
Crystal → special visual variation
Event   → featured members / organizers
```

---

# 30. Agent Instruction

When implementing this specification:

> First inspect the existing NetworkCard component and its current CSS.
>
> Do not immediately rewrite the component.
>
> Identify the existing structure, preserve its data flow and functionality,
> then refactor the styling into a shared base + four variant classes.
>
> Add decorative SVG/image support as optional layers.
>
> Implement the four variants:
>
> `solid`, `glass`, `crystal`, `event`.
>
> Keep the markup mostly shared.
>
> The result must allow the visual design to change by changing:
>
> ```tsx
> variant="glass"
> ```
>
> to:
>
> ```tsx
> variant="solid"
> ```
>
> or:
>
> ```tsx
> variant="crystal"
> ```
>
> or:
>
> ```tsx
> variant="event"
> ```
>
> without changing the profile data or rebuilding the component.
>
> After implementation, verify:
>
> - desktop layout
> - mobile layout
> - hover states
> - keyboard focus
> - missing social links
> - missing avatar
> - long names
> - long organization names
> - long bios
> - SVG decorations
> - reduced-motion behavior
> - dark background contrast
>
> Keep the implementation production-ready and frontend-only.

---

## Quick Reference

```text
NETWORK CARD
│
├── Shared Component
│
├── Shared Data
│
├── Shared Typography
│
├── Shared Actions
│
├── Shared Accessibility
│
└── Visual Variant
    │
    ├── solid
    ├── glass       ← preferred
    ├── crystal
    └── event
```

### Asset philosophy

```text
Profile Photo
     ↓
Data

Crystal / Stars / Moon / Event Mark
     ↓
Reusable SVG / Image Assets
     ↓
Optional Decorative Layer
     ↓
Variant CSS
     ↓
Same NetworkCard Component
```

This keeps the system flexible enough to change the visual direction later without
rewriting the network feature.
