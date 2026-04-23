# Catan Tournament Hub — Design System

This document is the source of truth for visual language, typography,
color tokens, motion, and anti-patterns. All UI generation (Claude Design,
Claude Code, frontend-design skill, Magic MCP) MUST respect it.

---

## Mood

Tournament-grade tactical dashboard. Olympic scoreboard density meets
editorial magazine typography with war-room restraint.

**This is NOT:** fantasy RPG, medieval kitsch, cozy board-game-room,
Dribbble-tier game UI, parchment-and-swords cliché.

**This IS:**
- A prestige competition platform — like a chess federation's national
  championship website, rendered in Catan's material palette.
- Information-first: leaderboards, live tables, bracket progression
  are the primary visual citizens. Decoration is minimal.
- Spectator-friendly from 3 meters away (TV mode) and 30 centimeters
  (phone mode) alike.

---

## Typography

| Role | Family | Fallback |
|---|---|---|
| Display (h1, podium names, hero) | **Fraunces** | Cormorant Garamond |
| Body (prose, labels, UI text) | **IBM Plex Sans** | system-ui |
| Data (tables, VP, timers, seeds) | **IBM Plex Mono** | Menlo, Consolas |

### Scale

```
h1: 48px / 56 line-height / 700 weight / -0.02em tracking
h2: 32px / 40 / 600 / -0.01em
h3: 24px / 32 / 600 /  0
h4: 18px / 28 / 600
body: 15px / 24 / 400
small: 13px / 20 / 400
mono: 14px / 20 / 400 (tabular-nums)
```

---

## Color Tokens (CSS)

```css
:root {
  /* Background layers */
  --bg-deep:     #0B0D0F;  /* near-black, subtle green undertone */
  --bg-surface:  #12151A;  /* cards, panels */
  --bg-elevated: #1A1F26;  /* hover, modal backdrop */

  /* Foreground text */
  --fg-primary:  #E8DCC0;  /* parchment-warm on dark, main text */
  --fg-muted:    #8B8470;  /* secondary text, labels */
  --fg-subtle:   #4A4A40;  /* borders, dividers, placeholder */

  /* Accents — USE SPARINGLY */
  --accent:      #B23A28;  /* tournament red — SINGLE DOMINANT */
  --accent-alt:  #D4A84B;  /* brass / wheat — secondary highlights only */

  /* Resource colors — functional, muted oil-painting palette */
  --resource-wood:    #2D5A3D;  /* deep emerald */
  --resource-sheep:   #7BA05B;  /* aged grass */
  --resource-wheat:   #D4A84B;  /* mustard gold */
  --resource-brick:   #A0522D;  /* terracotta */
  --resource-ore:     #4A5568;  /* slate */
  --resource-desert:  #C9B078;  /* sand beige */

  /* Semantic */
  --ok:     #4ADE80;
  --warn:   #F59E0B;
  --error:  #EF4444;
  --info:   #60A5FA;
}
```

**Accent discipline:** `--accent` appears at most once per screen as
dominant color (hero underline, active state, winner halo). Never more.

**Resource tokens** are used for hex tiles, small legend chips, and
sparkline highlights — NEVER for chrome, buttons, or backgrounds.

---

## Shape Language

- **Radius:** 2-4px maximum. Use `0` for tables and dense data grids.
  **NEVER** `rounded-xl`, `rounded-2xl`, `rounded-full` (except avatars).
- **Borders:** 1px hairlines using `rgba(232, 220, 192, 0.08)` on dark.
  Solid borders only on inputs and focused elements.
- **Shadows:** reserved for modals/popovers. Card surfaces do NOT float.
  If a component needs depth, use a hairline border and `--bg-elevated`.

---

## Motion

- **Default transition:** 150–250ms `ease-out`. Not spring by default.
- **Score update (dice roll feel):** one-shot spring on the changing
  number, 400ms, `damping: 20`. Used only on VP changes and rank swaps.
- **Winner halo:** 1-second pulse of `--accent-alt` ring, then calm.
- **Modal open:** 250ms spring scale from 0.98 → 1, backdrop blur 8px.
- **Hex hover:** 150ms `scale(1.02)` + border brightness +20%.

**Forbidden animations:**
- Scroll-triggered parallax
- Continuous shimmer / skeleton on mounted content
- Endless confetti, dragon breath, mystical particles
- Card tilt on mouse (glassmorphism trope)

---

## Layout Grid

- Desktop: 12-column, 1440px max, 48px gutters, 24px row gap
- Tablet: 8-column, 32px gutters
- Mobile: 4-column, 16px gutters, stacked
- Sections use full-width rules (1px hairline) instead of oversized
  whitespace to separate zones — editorial magazine pattern.

---

## Iconography

- **Line-weight:** 1.5px Lucide or Iconoir line icons.
- **No filled icons**, no medieval/fantasy imagery.
- Resource icons: custom SVG, simplified (hexagon + glyph), matched
  to `--resource-*` tokens.
- Trophy / winner: simple brass line icon, not a filled golden cup.

---

## Avoid List (CRITICAL — AI-slop attractors on this project)

**Fonts (never use):**
- Inter, Roboto, Space Grotesk, Poppins, Montserrat, Cinzel, Uncial Antiqua,
  any display font marketed as "medieval" or "fantasy"

**Gradients (never use):**
- Purple → pink, blue → purple, rainbow, neon
- "AI brand" gradients (Stripe/Vercel copies)
- Soft pastel gradients

**Effects (never use):**
- Glassmorphism (frosted glass backdrop-blur on cards)
- Neumorphism (soft shadows both sides)
- Heavy backdrop-blur on non-modal surfaces
- Animated starfields, particle systems

**Textures (never use):**
- Wood grain, parchment paper, stone, fabric, leather
- Noise overlays beyond 2% opacity
- Painted "painted by AI" brush textures on backgrounds

**Iconography (never use):**
- Swords, shields, castles, dragons, filigree scrolls
- Hand-drawn "cute" game icons
- Emoji as primary icons in admin UI

**SaaS clichés (never use):**
- Giant hero card with stats bar below
- Emoji-heavy CTAs ("🚀 Get Started")
- Rounded-2xl white cards with drop shadows
- "AI gradient" brand marks
- Pill-shaped buttons larger than 40px tall
- Card tilt on mouse hover

---

## Mood Anchors (inspire from abstractly, do not mimic)

- **Olympic scoreboard**: legible at distance, numeric-dense, status clarity
- **Editorial magazine** (NY Times, Monocle, The Atlantic redesigns):
  serif display + mono data, wide margins, hairline rules
- **Tactical / war-room UI** (Bloomberg terminal, SIGINT dashboards):
  sharp rectangles, hairline borders, info-first, zero decoration
- **Chess federation websites** (FIDE, USCF): tournament prestige,
  restrained typography, data as art

---

## Component Conventions (Do's)

- **Card:** `--bg-surface`, 1px hairline border, 2-4px radius, no shadow.
- **Table:** zero radius, 1px hairline rows, zebra only on hover.
- **Button:**
  - Primary: `--accent` fill, `--fg-primary` text, 4px radius, 36px tall.
  - Secondary: transparent fill, 1px `--accent` border, `--accent` text.
  - Ghost: transparent, `--fg-muted` text, hover `--bg-elevated` fill.
- **Input:** `--bg-deep`, 1px `--fg-subtle` border, 4px radius, focus ring
  in `--accent` 20% opacity.
- **Badge:** 2px radius, 11px text, tabular-nums, subtle bg tint based on
  semantic token.
- **Hex tile (SVG):** flat fill with `--resource-*` token, 1px hairline
  border `--fg-subtle`, number token in IBM Plex Mono with optional
  `--accent-alt` glow ring for 6 and 8 values.

---

## Output Formats Acceptable

- React + TypeScript (primary, for Next.js 16 + Tailwind 4)
- Static HTML + CSS (for Claude Design export previews)
- Design tokens JSON (matching this file's structure)

Tailwind 4 convention: define tokens in `@theme` directive, not
`tailwind.config.ts`. Use CSS variables for dynamic values.

---

## Authoritative

When tools (Claude Design, Magic MCP, frontend-design skill) produce
anything that conflicts with this document, THIS DOCUMENT WINS.
If a tool proposes a better convention, propose the update to this
document first, then apply.
