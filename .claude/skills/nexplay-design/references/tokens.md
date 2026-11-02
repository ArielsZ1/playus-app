# nexplay: Tokens

## 0. PRIMITIVES

Raw scales derived from the Playus codebase (`tailwind.config.js`, `src/index.css`). Semantic tokens reference them.

### Color Ramps

**Neutral** (indigo night, cool-violet temperature; four steps are the exact Playus colors)

| Step | Hex | Use |
|------|-----|-----|
| 0 | `#FFFFFF` | Light preview surface |
| 50 | `#F7F5FF` | Light preview background |
| 100 | `#F1EDFF` | Primary text on dark (Playus `ink`) |
| 200 | `#D9D3F2` | Light preview borders |
| 300 | `#B3ABD6` | Secondary text on dark (Playus `muted`) |
| 400 | `#8C84B3` | Tertiary text, placeholders |
| 500 | `#6A6296` | Disabled text |
| 600 | `#4A3F82` | Visible borders, input edges |
| 700 | `#3A3168` | Subtle borders (Playus `line`) |
| 800 | `#2E2560` | Inset surfaces, inputs, wells |
| 900 | `#251D4D` | Small panels (Playus `panel2`) |
| 925 | `#1E1840` | Panels (Playus `panel`) |
| 950 | `#14102A` | Page background (Playus `base`) |

**Brand** (gold, the trophy)

| Step | Hex |
|------|-----|
| 50 | `#FDF7E8` |
| 100 | `#FAEBC7` |
| 200 | `#F5D995` |
| 300 | `#F2CF7F` |
| 400 | `#EDC163` |
| 500 | `#E8B54D`: primary accent (Playus `gold`) |
| 600 | `#CC9632` |
| 700 | `#A47524` |
| 800 | `#7A561C` |
| 900 | `#523A15` |
| 950 | `#2B2018` |

**Status Colors** (each is a Playus gem except amber)

| Color | 50 (bg tint) | 500 (foreground) | 900 (dark tint) |
|-------|-------------|-----------------|-----------------|
| Red (ruby) | `#FDEEEF` | `#E8636F` | `#4A1C26` |
| Green (emerald) | `#ECF8F2` | `#3FAE7A` | `#12352A` |
| Amber | `#FEF4EA` | `#F2994A` | `#4A2A12` |
| Blue (sapphire, live) | `#EEF3FE` | `#4E7FE8` | `#172A55` |

### Spacing Primitives

`0, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96`

### Radii Primitives

`0, 999` (shape comes from the gem cut primitives `8, 14`, applied with `clip-path`)

---

## 1. TYPOGRAPHY

### Font Stack

| Role | Font | Fallback | Weight | Use |
|------|------|----------|--------|-----|
| **Display** | `"Unbounded"` | `system-ui, sans-serif` | 500 / 700 / 900 | Screen titles, game names, scores |
| **Body / UI** | `"Inter"` | `system-ui, -apple-system, sans-serif` | 400 / 500 / 600 / 700 | Body text, tables, labels, buttons copy |
| **Mono / Code** | `"IBM Plex Mono"` | `ui-monospace, Menlo, monospace` | 500 | Invitation codes, IDs in admin and audit |

### Mono Font Rules

**`mono_for_code`: true** · **`mono_for_metrics`: false**

Codes are things people copy and dictate across a table ("NX7K-Q2"), so they get a mono face where 0 and O never get confused. Scores, times and positions stay in Unbounded or Inter with tabular figures: a scoreboard among friends, not a terminal.

- **`mono_for_code: true`:** Use the mono font for code blocks, file paths, shell commands, and inline technical tokens (variable names, CSS properties, API endpoints). Almost every brand with a mono font sets this to `true`.
- **`mono_for_code: false`:** Even code snippets use the body font. Rare, only the most editorial/typographic brands.
- **`mono_for_metrics: true`:** Use the mono font for pricing, counts, timestamps, percentages, ID strings, IP addresses, speeds, file sizes. Common for dev-tool and terminal-aesthetic brands (Linear, Nothing) where data is part of the visual identity.
- **`mono_for_metrics: false`:** Use the body font for all numeric/data values. Mono is reserved for code only. Common for consumer and editorial brands (Apple, mymind, Notion). Many brands use mono for code but NOT for metrics; Cursor uses mono inside IDE screenshots, but `$20` pricing stays in the sans.

Unbounded is the Playus display face: wide, round, a little toy-like, which is exactly the arcade half of the tension. Inter is the Playus body face and carries the dense tables. Both are observed in the codebase, not invented.

### Type Scale

| Token | Size | Line Height | Letter Spacing | Weight | Use |
|-------|------|-------------|----------------|--------|-----|
| `--display` | 32px | 1.1 | -0.01em | 700 | Screen titles, game name on the instructions screen |
| `--score` | 56px | 1 | -0.02em | 900 | Attempt result, tu mejor marca |
| `--heading` | 22px | 1.2 | -0.005em | 700 | Section headings, game name in the sala |
| `--subheading` | 16px | 1.3 | 0 | 500 | Panel titles, button labels of the primary action |
| `--body` | 15px | 1.5 | 0 | 400 | Body text, table rows |
| `--body-sm` | 13px | 1.45 | 0 | 400 | Rules text, secondary rows |
| `--caption` | 12px | 1.4 | 0.01em | 500 | Refresh time, footnotes, chips |
| `--label` | 11px | 1.2 | 0.08em | 600 | Uppercase micro-labels (Playus `stat-label`) |

### Typographic Rules

- `font-variant-numeric: tabular-nums` on every score, timer, position and count.
- Unbounded only at 16px or more, never more than 3 elements per screen.
- Labels are uppercase; everything else is sentence case. Game names are uppercase because they are proper nouns of the arcade (TOWER STACK, COUNT!).
- Max line length for rules and instructions: 60ch.

---

## 2. COLOR SYSTEM (Semantic Tokens)

Semantic tokens reference the primitives above. Components use semantic tokens, never primitives directly.

### Primary Mode (Dark, the product)

| Token | Primitive | Hex | Role |
|-------|-----------|-----|------|
| `--background` | `{neutral.950}` | `#14102A` | Page background |
| `--bg` | n/a | `var(--background)` | Shorthand alias for `--background` |
| `--surface1` | `{neutral.925}` | `#1E1840` | Panels (`gem-panel`) |
| `--surface2` | `{neutral.900}` | `#251D4D` | Small panels (`gem-panel-sm`), rows hover |
| `--surface3` | `{neutral.800}` | `#2E2560` | Inputs, wells, table refresh flash |
| `--border` | `{neutral.700}` | `#3A3168` | Panel edges, dividers |
| `--border-visible` | `{neutral.600}` | `#4A3F82` | Inputs, secondary buttons, empty attempt dots |
| `--text1` | `{neutral.100}` | `#F1EDFF` | Primary text |
| `--text2` | `{neutral.300}` | `#B3ABD6` | Labels, descriptions |
| `--text3` | `{neutral.400}` | `#8C84B3` | Placeholders, refresh time |
| `--text4` | `{neutral.500}` | `#6A6296` | Disabled |
| `--accent` | `{brand.500}` | `#E8B54D` | Jugar, puesto 1, récord personal nuevo, focus |
| `--accent-subtle` | `{brand.950}` | `#2B2018` | Gold tinted chips (récord) |
| `--on-accent` | `{neutral.950}` | `#14102A` | Text on gold |
| `--live` | `{blue.500}` | `#4E7FE8` | Live signal |
| `--live-bg` | `{blue.900}` | `#172A55` | Live chip background |
| `--success` | `{green.500}` | `#3FAE7A` | Valid, accepted, closed |
| `--warning` | `{amber.500}` | `#F2994A` | Repetition mark, pending review |
| `--error` | `{red.500}` | `#E8636F` | Failed, blocked, last seconds |

### Secondary Mode (Light, previews only)

| Token | Primitive | Hex | Role |
|-------|-----------|-----|------|
| `--background` | `{neutral.50}` | `#F7F5FF` | Page background |
| `--bg` | n/a | `var(--background)` | Shorthand alias for `--background` |
| `--surface1` | `{neutral.0}` | `#FFFFFF` | Panels |
| `--surface2` | `{neutral.100}` | `#F1EDFF` | Small panels |
| `--surface3` | `{neutral.200}` | `#D9D3F2` | Inputs, wells |
| `--border` | `{neutral.200}` | `#D9D3F2` | Panel edges |
| `--border-visible` | `{neutral.300}` | `#B3ABD6` | Inputs, secondary buttons |
| `--text1` | `{neutral.950}` | `#14102A` | Primary text |
| `--text2` | `{neutral.600}` | `#4A3F82` | Secondary text |
| `--text3` | `{neutral.500}` | `#6A6296` | Tertiary text |
| `--text4` | `{neutral.400}` | `#8C84B3` | Disabled text |
| `--accent` | `{brand.700}` | `#A47524` | Primary accent |
| `--accent-subtle` | `{brand.50}` | `#FDF7E8` | Tinted backgrounds for accent |
| `--on-accent` | `{neutral.0}` | `#FFFFFF` | Text on gold |
| `--live` | `{blue.500}` | `#4E7FE8` | Live signal |
| `--live-bg` | `{blue.50}` | `#EEF3FE` | Live chip background |
| `--success` | `{green.500}` | `#3FAE7A` | Positive states |
| `--warning` | `{amber.500}` | `#F2994A` | Caution states |
| `--error` | `{red.500}` | `#E8636F` | Negative states |

### Accent & Status Tints

| Token | Primary | Secondary | Usage |
|-------|---------|-----------|-------|
| `--accent-subtle` | `#2B2018` | `#FDF7E8` | Récord chip, puesto 1 row |
| `--success-bg` | `#12352A` | `#ECF8F2` | Válido, aceptada |
| `--warning-bg` | `#4A2A12` | `#FEF4EA` | Repetición, pendiente |
| `--error-bg` | `#4A1C26` | `#FDEEEF` | Fallado, bloqueada |

### Color Usage Rules

- One gem, one meaning (see SKILL.md 2.4). Never pick a gem for looks.
- Text on gold is always `--on-accent`; gold text on dark is allowed only at `--subheading` size or larger, or for numbers.
- Contrast on `--background`: `--text1` 16.4:1, `--text2` 8.5:1, `--text3` 5.3:1 (all AA), `--text4` 3.4:1 (disabled only).
- The body keeps the Playus halos: `radial-gradient(circle at 15% 10%, rgba(78,127,232,.10), transparent 40%)` and `radial-gradient(circle at 85% 0%, rgba(232,181,77,.08), transparent 35%)`, fixed.

---

## 3. SPACING

### Scale (8px base)

| Token | Value | Use |
|-------|-------|-----|
| `--space-2xs` | 2px | Press offset, optical nudges |
| `--space-xs` | 4px | Gap between attempt dots, icon to label |
| `--space-sm` | 8px | Chip padding, gaps inside rows |
| `--space-md` | 16px | Phone gutter, gap between panels, `gem-panel-sm` padding |
| `--space-lg` | 24px | `gem-panel` padding |
| `--space-xl` | 32px | Between screen sections |
| `--space-2xl` | 48px | Above the result score |
| `--space-3xl` | 64px | Empty state top padding |
| `--space-4xl` | 96px | Landing section rhythm |

---

## 4. BORDERS & RADII

### Radii Scale (Semantic → Primitive)

| Token | Value | Primitive | Use |
|-------|-------|-----------|-----|
| `--radius-element` | 0px | `{radii[0]}` | Checkboxes, small controls |
| `--radius-control` | 0px | `{radii[0]}` | Buttons, inputs (shape comes from `--cut-sm`) |
| `--radius-component` | 0px | `{radii[0]}` | Panels (shape comes from `--cut-lg`) |
| `--radius-container` | 0px | `{radii[0]}` | Modals, sheets |
| `--radius-pill` | 999px | `{radii[1]}` | Attempt dots, avatars, live pulse only |

### Gem cuts

| Token | Value | Use |
|-------|-------|-----|
| `--cut-sm` | 8px | Buttons, inputs, chips, `gem-panel-sm` |
| `--cut-lg` | 14px | `gem-panel`, sheets, modals |

The cut takes the top-left and bottom-right corners, like `gem-panel`: `clip-path: polygon(0 var(--cut), var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%)`, with the diagonal edge redrawn by two `linear-gradient` backgrounds.

### Border Treatment

| Element | Border |
|---------|--------|
| Cards / Surfaces | 1px `--border` via `--edge`, diagonals redrawn |
| Buttons | Primary none; secondary 1px `--border-visible` |
| Inputs | 1px `--border-visible`, gold on focus |
| Tags / Chips | 1px matching status color at the chip's own tint |
| Modals / Sheets | 1px `--border-visible` |

Corner philosophy: sharp, cut like a jewel. Nothing is rounded except true circles.

---

## 5. ELEVATION & SHADOWS

| Level | Light Mode | Dark Mode | Use |
|-------|-----------|----------|-----|
| **0** | None | None | Everything in the page flow |
| **1** | None | None | Panels: depth comes from surface step + edge |
| **2** | `0 12px 32px rgba(20,16,42,.12)` | `0 12px 32px rgba(8,6,20,.55)` | Menus, popovers (on an unclipped wrapper) |
| **3** | `0 24px 64px rgba(20,16,42,.18)` | `0 24px 64px rgba(8,6,20,.70)` | Modals, bottom sheets |

**Glow (signals, not depth):** `--glow-live: drop-shadow(0 0 14px rgba(78,127,232,.45))` and `--glow-gold: drop-shadow(0 0 16px rgba(232,181,77,.45))` in dark; 12px at .30 in light. Always applied with `filter` on a wrapper, because `clip-path` swallows `box-shadow`.

---

## 6. MOTION & INTERACTION

### Personality

Playful. Short springs that overshoot a little and settle, always in answer to a touch or a state change. Inherited from the Playus intro: destellos and trazos, but faster.

### Timing

| Type | Duration | Easing | Use |
|------|----------|--------|-----|
| **Micro** | 140ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Press, color change, focus |
| **Standard** | 320ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Release spring, row move, chip appear |
| **Emphasis** | 450ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Score count-up, sheet present, ruleta settle |

### Interaction States

| State | Treatment |
|-------|-----------|
| Hover (pointer devices only) | Fill one step lighter (`brand.400` on primary, `--surface3` on secondary) |
| Pressed | `translateY(2px) scale(.98)`, 140ms |
| Focus visible | Uncut elements: 2px gold outline, 2px offset (Playus rule). Gem-cut elements: `clip-path` also clips `outline`, so focus is `box-shadow: inset 0 0 0 2px var(--accent)`; on gold fills the inset ring is `--on-accent` |
| Disabled | Opacity .4, no transform |
| Reduced motion | No transforms; 120ms opacity only |

---

## 7. ICONOGRAPHY

> **⚠ Fallback disclosure.** The icons rendered in the generated preview come from a freely-licensed kit selected as the closest match to the Playus icons. In the React app, draw icons as inline SVG like `src/components/IconoPremio.jsx`.

### Observed style (the Playus icons)

| Attribute | Value |
|-----------|-------|
| Description | Hand-built inline SVG on a 24 grid: trophy, gem, medal |
| Stroke weight | regular (1.75px) |
| Corner treatment | soft (round caps and joins) |
| Fill style | outline |
| Form language | geometric |
| Visual density | minimal |

### Fallback kit (what the preview actually renders)

- **Kit:** Lucide
- **Weight / variant:** default (2px)
- **Match score:** high
- **Why this kit:** Lucide matches the geometric construction, round caps and minimal density of the Playus SVGs; its 2px stroke is a hair heavier than 1.75px, which suits a thumb-first UI. Phosphor regular was second, but its humanist curves fight the faceted shapes.
- **CDN:** `https://unpkg.com/lucide-static@0.454.0/font/lucide.css`
- **Usage:** `<i class="icon icon-trophy"></i>`

### Sizes

| Context | Size |
|---------|------|
| Inline with body text | 16px |
| Buttons | 20px |
| Navigation | 24px |

### Color rule

Icons inherit `currentColor`. An icon takes a gem color only when it carries that gem's signal (timer in ruby during the last 5 seconds, radio in sapphire when live).

### Don't

- Never use filled or duotone icons; NEXPLAY icons are outlines.
- Never claim these are the brand's real icons; they are a best-match fallback.
