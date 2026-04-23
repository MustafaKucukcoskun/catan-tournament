# Catan Tournament Hub — Design System

Source of truth for visual language, typography, color, motion, and
anti-patterns. All UI generation (Claude Design, Claude Code, frontend-design
skill, Magic MCP) MUST respect this document.

---

## Mood — Catan Night × Live Tournament Energy

A warm, dimly-lit tournament hall where prestige competition meets
the friendly heat of a great game night. Brass lanterns cast warm
light on a dark wooden table; live broadcast screens pulse with the
energy of ongoing rounds.

The UI lives at the intersection of two moods:
- The **stillness** of a serious tournament (typographic prestige, calm)
- The **kinetic pulse** of live matches (breathing cards, ticking
  timers, spark bursts on score changes)

### This is NOT
- Fantasy RPG, medieval kitsch, chess-federation cold, Bloomberg-terminal
  sterile, SaaS dashboard generic, cartoon-cute board game UI

### This IS
- **Warm-dark first** — deep coffee-bean browns, NOT sterile charcoal
- **Ember-lit accents** — terracotta, gold, seafoam cohabit
- **Kinetic live-states** — pulses, glow rings, gentle breathing on
  active elements
- **Prestige typography with personality** — Fraunces with italic
  moments, dignified but not ascetic
- **Earned celebrations** — brief sparkles and halos at meaningful
  moments (never endless)
- **Alive leaderboard** — information-first, but it breathes

---

## Typography

| Role | Family | Fallback |
|---|---|---|
| Display (h1, hero, podium) | **Fraunces** | Cormorant Garamond, Georgia |
| Body (prose, labels) | **DM Sans** | system-ui |
| Data (tables, VP, timers) | **JetBrains Mono** | Menlo, Consolas |

### Usage notes
- **Fraunces italic** is a signature — use for phase labels, side
  notes, tournament dates, and the occasional emphasized word in a
  headline. Regular weight for most display text.
- **DM Sans** (over IBM Plex) — warmer, slightly rounded, welcoming
  while professional.
- **JetBrains Mono** (over IBM Plex Mono) — friendlier ligatures,
  better small sizes, less "terminal".

### Scale
```
h1: 48px / 56 line-height / 700 / -0.02em tracking
h2: 32px / 40 / 600 / -0.01em
h3: 24px / 32 / 600 / 0
h4: 18px / 28 / 600
body: 15px / 24 / 400
small: 13px / 20 / 400
mono: 14px / 20 / 400 (tabular-nums)
eyebrow: 11px uppercase mono, 0.12em tracking
```

---

## Color Tokens (CSS)

```css
:root {
  /* Background — WARM DARK (brown-based, not charcoal) */
  --bg-deep:     #1A1208;   /* deep coffee bean, page bg */
  --bg-surface:  #2A1E14;   /* cards, panels */
  --bg-elevated: #3A2A1E;   /* hover, modal backdrop, active zones */

  /* Foreground — lantern-warm on dark */
  --fg-primary:  #F2E4CA;   /* warm cream, primary text */
  --fg-muted:    #A89880;   /* aged paper, secondary */
  --fg-subtle:   #5A4A36;   /* borders, faded, placeholder */

  /* Accents — multiple cohabit (layered, not "single dominant") */
  --accent-ember:    #E85D2E;  /* terracotta ember — primary energy */
  --accent-live:     #FF6B35;  /* hot ember — LIVE states, pulsing */
  --accent-gold:     #F4B942;  /* bright mustard gold — podium, highlights */
  --accent-seafoam:  #5EA88F;  /* muted seafoam — rare calming moments */

  /* Resource colors — saturated & alive */
  --resource-wood:    #3B7A52;  /* vivid forest */
  --resource-sheep:   #8CC070;  /* meadow green */
  --resource-wheat:   #E6C64A;  /* golden wheat */
  --resource-brick:   #C8562A;  /* warm terracotta */
  --resource-ore:     #6B7280;  /* slate */
  --resource-desert:  #E0C28E;  /* sand */

  /* Semantic */
  --ok:     #6EE787;
  --warn:   #FFB94D;
  --error:  #F26B5E;
  --info:   #7BB8E8;

  /* Hairlines — warm gold-tinted, not grey */
  --hairline:        rgba(244, 185, 66, 0.10);
  --hairline-strong: rgba(244, 185, 66, 0.20);
  --hairline-focus:  rgba(232, 93, 46, 0.45);

  /* Glow — NEW (for live states and celebrations) */
  --glow-ember:   0 0 20px rgba(255, 107, 53, 0.35);
  --glow-gold:    0 0 24px rgba(244, 185, 66, 0.30);
  --glow-winner:  0 0 32px rgba(244, 185, 66, 0.50);

  /* Typography */
  --font-display: 'Fraunces', 'Cormorant Garamond', Georgia, serif;
  --font-body:    'DM Sans', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', Menlo, Consolas, monospace;

  /* Scale */
  --text-h1:    48px;
  --text-h2:    32px;
  --text-h3:    24px;
  --text-h4:    18px;
  --text-body:  15px;
  --text-small: 13px;
  --text-mono:  14px;

  /* Shape — slightly softer than v1 but disciplined */
  --radius-sm:  4px;   /* badges, chips */
  --radius-md:  6px;   /* cards, buttons, inputs */
  --radius-lg:  10px;  /* modals, feature cards */
  --radius-0:   0;     /* dense tables */

  /* Spacing (4px base) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  24px;
  --space-6:  32px;
  --space-7:  48px;
  --space-8:  64px;

  /* Elevation */
  --shadow-popover: 0 8px 24px rgba(0, 0, 0, 0.48), 0 0 0 1px var(--hairline-strong);
  --shadow-modal:   0 24px 64px rgba(0, 0, 0, 0.64), 0 0 0 1px var(--hairline-strong);
  --shadow-live:    0 0 0 1px var(--accent-live), 0 0 20px rgba(255, 107, 53, 0.35);

  /* Motion */
  --ease-out:         cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast:    150ms;
  --duration-base:    200ms;
  --duration-slow:    300ms;
  --duration-kinetic: 800ms;   /* live-state loops */
  --duration-breath:  3000ms;  /* ambient breathing */
}
```

**Accent discipline (RELAXED from v1):**
Up to 3 accents can cohabit per screen — `--accent-ember` (primary
emphasis), `--accent-live` (LIVE pulses only), `--accent-gold` (podium
+ achievements). Most chrome stays neutral; only meaningful elements
pick up an accent.

**Resource tokens** remain functional — hex tiles, legend chips,
sparklines. Never for primary chrome or buttons.

---

## Shape Language

- **Radius:** 4-10px range. Still avoid `rounded-2xl`, `rounded-full`
  (except avatars, live dots).
- **Borders:** 1px warm-tinted hairlines (gold at low alpha). Solid
  borders only on inputs and focused elements.
- **Shadows:** reserved for modals + **LIVE STATE GLOW**. Regular
  cards do NOT float, but live match cards glow gently with
  `--shadow-live`.

---

## Motion — Kinetic Layer

### Default transitions
- Hover, focus, tabs: 150-200ms `--ease-out`
- Page transitions: 300ms fade+slide
- Modal open: 250ms `--ease-spring`, scale 0.98 → 1, backdrop blur 8px

### Kinetic live-states (signature of this project)

- **Live match indicator dot:** pulsing ember, 1.2s ease-in-out loop,
  opacity 0.6 → 1 → 0.6. Next to "LIVE" labels, in stats strip
  "Active" tile, on live table cards.
- **Live match card:** very subtle breathing, 3s ease loop, scale
  1.000 → 1.005 → 1.000. Combined with `--shadow-live` ring.
- **Timer display:** each tick, the colon(s) flicker briefly in
  `--accent-gold` for 200ms. Subtle but makes the clock feel alive.
- **Score update:** spring bounce on the changing number (400ms) +
  one-shot gold spark burst on the row (600ms, fades out).
- **Rank swap:** name slide-swap 300ms spring, losing rank briefly
  dims, rising rank briefly brightens.
- **Podium #1 avatar:** continuous gentle gold halo, 2s ease loop
  (pulse between `--glow-gold` and `--glow-winner`).
- **Match finished:** winner card brief triumph flash (1s gold
  ring), then settles into the calm podium halo.
- **Hex hover:** 150ms scale(1.02) + warm glow expand + border
  brightness +30%.
- **Hex flip in / reveal:** 400ms spring, subtle card-flip.

### Forbidden animations
- Scroll-triggered parallax (distraction)
- Continuous shimmer on mounted content (loading ≠ alive)
- Endless confetti / particle systems (celebration is **earned**,
  one-shot only)
- Card tilt on mouse hover (glassmorphism trope)
- "Magic UI" animation on every element (discipline matters)

---

## Layout Grid

- Desktop: 12-column, 1440px max, 48px gutters, 24px row gap
- Tablet: 8-column, 32px gutters
- Mobile: 4-column, 16px gutters, stacked
- Section separators: hairlines OR `--bg-elevated` bands — use either
  depending on emphasis (hairline = subtle, band = major zone change)

---

## Iconography

- **Line-weight:** 1.5-2px Lucide or Iconoir line icons.
- **Selective fills:** winner trophy CAN be filled with `--accent-gold`.
  Live dots ARE filled. Resource icons filled with `--resource-*`.
- **Decorative hex glyphs:** small hexagonal motifs as chrome
  accents (corner decorations, divider ornaments) — minimal,
  no filigree.
- **Trophy / winner:** line icon, but for #1 position fill with
  `--accent-gold` + subtle glow. Not a cartoon golden cup.

---

## Avoid List (UPDATED — less restrictive than v1, still AI-slop-proof)

### Fonts (never use)
- Inter, Roboto, Space Grotesk, Poppins, Montserrat
- Cinzel, Uncial Antiqua, Blackletter / "medieval" display fonts
- Papyrus-family anything

### Gradients (never use)
- Purple → pink, blue → purple, rainbow, neon
- "AI brand" gradients (Stripe/Vercel clones)
- Rainbow-shift animated button gradients
- (Warm subtle radial gradients on hex tiles ARE allowed — see Hex tile)

### Effects (never use)
- Glassmorphism (frosted glass backdrop-blur on cards)
- Neumorphism (soft-shadow both-sides)
- Heavy backdrop-blur on non-modal surfaces
- Continuous animated starfields / particle systems
  (one-shot sparks ARE allowed)

### Textures (never use)
- Wood grain, parchment, stone, fabric, leather as surface textures
- Noise overlays beyond 3% opacity
- "Painted by AI" brush textures on backgrounds

### Iconography (never use)
- Swords, shields, castles, dragons, filigree scrolls
- Cartoon dice-with-faces as primary iconography
- Emoji as primary icons in admin UI
  (tasteful single emoji in empty states OK)

### SaaS clichés (never use)
- Giant hero card with stats bar below
- Gradient hero backgrounds
- Rounded-2xl white cards with drop shadows
- "AI gradient" brand marks
- Pill-shaped buttons over 44px tall
- Card tilt on mouse hover

---

## Mood Anchors (inspire from abstractly — do NOT mimic)

- **Evening jazz club + tournament broadcast hybrid** — warm lamps,
  polished typography, people-oriented, performative
- **Esports tournament live broadcast** — kinetic info panels, live
  state emphasis, BUT info-dense not cartoon-flashy
- **Editorial magazine, evening edition** — Fraunces + JetBrains
  Mono + warm palette (not cold modernist)
- **Premium board game box art (selectively)** — rich colors,
  elegant composition, BUT digital native not printed-emulation

---

## Component Conventions

### Card (standard)
`--bg-surface` fill · 1px `--hairline` border · 6px radius · no shadow.

### Live match card
Same as card + `--shadow-live` glow + gentle breathing animation
(3s loop). Pulsing ember dot in corner. "LIVE" eyebrow label.

### Table
4px radius on container · 0 on cells · 1px `--hairline` rows ·
zebra on hover · tabular-nums mono font for numeric columns.

### Button
- **Primary:** `--accent-ember` fill, `--fg-primary` text, 6px radius,
  40px tall, subtle `--glow-ember` on hover.
- **Secondary:** transparent fill, 1px `--accent-ember` border,
  `--accent-ember` text.
- **Ghost:** transparent, `--fg-muted` text, hover `--bg-elevated` fill.
- **Destructive:** `--error` text, transparent fill, red border.

### Input
`--bg-deep` fill · 1px `--fg-subtle` border · 6px radius ·
focus ring `--hairline-focus` (ember 45%) · 40px tall.

### Badge
4px radius · 11px text · tabular-nums · subtle bg tint based on
semantic (ok / warn / error / info / neutral).

### Hex tile (SVG)
- Flat fill with `--resource-*` token as base
- **Subtle radial gradient** — brighter center (+3% L), darker edges
  (this is the "emboss" we allow — NOT heavy, just dimensional)
- 1px hairline border `--fg-subtle`
- Number token centered in JetBrains Mono
- For 6 and 8 tokens: `--accent-gold` glow ring around the number
- On hover: 150ms scale(1.02) + warm glow

### Podium avatar
- **#1:** Large circular avatar, 2px `--accent-gold` border,
  `--glow-winner` continuous slow pulse (2s loop).
- **#2 / #3:** Standard avatar, 1px subtle accent border (silver /
  bronze hint via opacity on gold).

### Stat tile
`--bg-surface` · 1px hairline · 6px radius · eyebrow label (mono
uppercase) + large number (mono tabular) + optional delta/sparkline.
If showing LIVE metric (active matches), add pulsing ember dot.

---

## Decorative Elements (subtle Catan-ness)

Hex-based motifs appear as:
- **Corner glyphs** on feature cards (8px hex, `--fg-subtle` color)
- **Divider ornaments** between major sections (single hex dot, not rule)
- **Empty state illustrations** (large single hex + text, centered)
- **Page background watermark** (optional, very faint hex lattice
  at 2% opacity, bg-elevated level)

These whisper "Catan" without shouting. Never larger than 40px,
never as primary visual element.

---

## Output Formats Acceptable

- React + TypeScript (primary for Next.js 16 + Tailwind 4)
- Static HTML + CSS (for Claude Design preview exports)
- Design tokens JSON (mirroring this file's structure)

Tailwind 4 convention: define tokens in `@theme` directive, NOT
`tailwind.config.ts`. Use CSS variables for dynamic values.

---

## Authoritative

When any tool produces output conflicting with this document,
THIS DOCUMENT WINS. If a tool proposes a better convention,
update this document first, then apply.
