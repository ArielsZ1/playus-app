---
name: Playus + NEXPLAY
description: One gem family on an indigo night. Playus keeps the finished season; NEXPLAY is the phone-first floor where the fechas are played live.
colors:
  base: "#14102A"
  panel: "#1E1840"
  panel2: "#251D4D"
  surface3: "#2E2560"
  line: "#3A3168"
  border-visible: "#4A3F82"
  ink: "#F1EDFF"
  muted: "#B3ABD6"
  text3: "#8C84B3"
  text4: "#6A6296"
  gold: "#E8B54D"
  gold-bright: "#EDC163"
  accent-subtle: "#2B2018"
  sapphire: "#4E7FE8"
  live-bg: "#172A55"
  emerald: "#3FAE7A"
  success-bg: "#12352A"
  ruby: "#E8636F"
  error-bg: "#4A1C26"
  amber: "#F2994A"
  warning-bg: "#4A2A12"
typography:
  display:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  score:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "56px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  heading:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  subheading:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0em"
  button:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "0.04em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  stat-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.05em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
rounded:
  none: "0px"
  pill: "999px"
spacing:
  2xs: "2px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  gem-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  gem-panel-sm:
    backgroundColor: "{colors.panel2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px"
  stat-label:
    textColor: "{colors.muted}"
    typography: "{typography.stat-label}"
  nav-link:
    textColor: "{colors.muted}"
    padding: "8px 12px"
  nav-link-active:
    textColor: "{colors.gold}"
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.base}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.gold-bright}"
  button-secondary:
    backgroundColor: "{colors.panel2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.surface3}"
  button-ghost:
    textColor: "{colors.muted}"
    padding: "0 16px"
    height: "40px"
  button-destructive:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.ruby}"
    rounded: "{rounded.none}"
    height: "48px"
  input:
    backgroundColor: "{colors.surface3}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  input-code:
    backgroundColor: "{colors.surface3}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    height: "48px"
  chip:
    backgroundColor: "{colors.panel2}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    padding: "0 10px"
    height: "28px"
  chip-record:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.gold}"
  chip-live:
    backgroundColor: "{colors.live-bg}"
    textColor: "{colors.sapphire}"
  chip-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.emerald}"
  chip-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.amber}"
  chip-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.ruby}"
  score:
    textColor: "{colors.ink}"
    typography: "{typography.score}"
  score-record:
    textColor: "{colors.gold}"
  tab-bar:
    backgroundColor: "{colors.panel}"
    typography: "{typography.caption}"
    height: "64px"
  tab-active:
    textColor: "{colors.gold}"
  tab-inactive:
    textColor: "{colors.text3}"
---

# Design System: Playus + NEXPLAY

## Overview

**Creative North Star: "The Cut Gem at Night"**

Playus and NEXPLAY are one gem family. Both live on the same indigo night, both shape every surface with the same faceted corner cut, both speak in Unbounded for the few loud words and Inter for everything else. Playus is the museum where finished fechas rest: a desktop-friendly season tracker with dense tables, a podium and a curtain intro. NEXPLAY is the play floor where those fechas happen, phone in hand: one column, big thumb targets, a live table and a ruleta that picks the game.

What NEXPLAY adds is a job for color and motion. In Playus the four gems mostly decorate and mark the winner. In NEXPLAY each gem is a signal with exactly one meaning, and the interface answers the thumb with a short elastic spring. The tension is cold jewel precision against warm arcade pulse: the facets are sharp and exact, the motion is alive.

The shipped product is dark only. Light tokens exist solely so the design previews can be checked on paper-white; they are carried in the sidecar, never in the app. Depth is tonal (three stepped indigo surfaces and a 1px edge), not shadowed; the only thing that glows is the thing happening now.

**Open decision (2026-11-02).** The user said they liked the light preview more, but chose to keep the app dark. A possible future tweak is shifting the indigo base toward near-black. It is not applied; do not apply it without the user asking.

**Key Characteristics:**
- One dark indigo night with two soft radial halos (sapphire top-left, gold top-right), fixed behind the page.
- Every panel, button, input and chip is cut on two opposite corners, never rounded.
- Four gems plus amber, each meaning one thing; neutrals carry everything else.
- Unbounded for titles, game names and scores; Inter for data; IBM Plex Mono only for codes.
- Flat by default; glow only on what is live or a fresh record.
- NEXPLAY: 48px minimum touch targets, a 56px gold primary action, playful spring on press.

## Colors

A cool violet-indigo night, lit by one warm trophy gold and three cold jewel signals.

### Primary
- **Trophy Gold** (gold): the one action and the one number that matter on a screen. In Playus: the active nav link, puesto 1, gemas totals, the gold panel edge (`gem-panel-gold`) on the season summary and the player card, and the focus ring. In NEXPLAY: the Jugar button, a new personal best, puesto 1, the RÉCORD chip. Text on gold is always the base indigo.
- **Bright Gold** (gold-bright): the hover step of the primary button, pointer devices only.
- **Ember Gold Tint** (accent-subtle): the background of gold-tinted chips (RÉCORD).

### Secondary
- **Live Sapphire** (sapphire): in NEXPLAY, "happening now": the open fecha edge, the EN VIVO chip, the refresh indicator, the attempt in progress, the Underdog fourth dot. In Playus it only tints the top-left body halo.
- **Deep Sapphire Tint** (live-bg): background of the live chip and info alerts.

### Tertiary
- **Ruby** (ruby) with **Ruby Tint** (error-bg): failure and time running out: the last 5 seconds of a countdown, a failed attempt, a blocked account, destructive actions.
- **Emerald** (emerald) with **Emerald Tint** (success-bg): valid and accepted: a valid attempt, an accepted account, a closed fecha.
- **Amber** (amber) with **Amber Tint** (warning-bg): a NEXPLAY addition so warnings never borrow gold: REPETICIÓN, PENDIENTE.

### Neutral
- **Indigo Night** (base): the page background and the text color on gold.
- **Panel Indigo** (panel): the large panel fill, tab bar, modals and sheets.
- **Raised Indigo** (panel2): small panels, secondary buttons, chips, hovered and selected rows.
- **Well Indigo** (surface3): NEXPLAY inputs, wells, toasts, tooltips and the table-refresh flash.
- **Facet Line** (line): panel edges and dividers.
- **Visible Facet** (border-visible): NEXPLAY input edges, secondary button edges, empty attempt dots.
- **Moonlight** (ink): primary text.
- **Lavender Mist** (muted): secondary text, labels, descriptions, inactive nav.
- **Dim Lavender** (text3): placeholders, refresh times, inactive tabs, meta copy.
- **Faint Lavender** (text4): disabled text only (3.4:1 on base).

### Named Rules
**The One Gem, One Meaning Rule.** A gem color appears only when its signal is true. Gold is you at your best, sapphire is live, ruby is failure or the last seconds, emerald is valid. Sapphire on a static or historical element is a bug.

**The One Gold Rule.** At most one gold action and one gold number per screen. Puesto 1 in a table and the RÉCORD chip are the only extra golds allowed. Squint: you should see one gold shape and, if a fecha is open, one sapphire edge.

## Typography

**Display Font:** Unbounded (with sans-serif), weights 500 / 700 / 900
**Body Font:** Inter (with sans-serif), weights 400 / 500 / 600 / 700
**Label/Mono Font:** IBM Plex Mono 500 (with ui-monospace, monospace), NEXPLAY only, for invitation codes and admin or audit IDs

**Character:** Unbounded is wide, round and a little toy-like, the arcade half of the family; Inter is the quiet workhorse that carries dense tables. Mono exists so a code dictated across a table never confuses 0 and O; scores stay in Unbounded with tabular figures.

### Hierarchy
The tokens above are the NEXPLAY scale. Playus ships on Tailwind's default sizes with the same faces: page titles in Unbounded at 30px rising to 36px from 640px up, section headings in Unbounded 20px, card names in Unbounded 18px, data in Inter 14px to 16px.
- **Score** (900, 56px, 1): the attempt result and tu mejor marca, the biggest thing on its screen, in Moonlight; gold only when it is a new personal best.
- **Display** (700, 32px, 1.1): NEXPLAY screen titles, the game name on the instructions screen and after the ruleta.
- **Heading** (700, 22px, 1.2): section headings, the game name in the sala, the countdown.
- **Subheading** (500, 16px, 1.3): panel titles; the smallest Unbounded may go in NEXPLAY.
- **Body** (400, 15px, 1.5): body text and table rows; rules and instructions max 60ch.
- **Body small** (400, 13px, 1.45): rules text, secondary rows, alerts.
- **Caption** (500, 12px, 1.4): refresh time, footnotes, chips, tab labels.
- **Label** (600, 11px, 0.08em, uppercase): NEXPLAY data and field labels.
- **Stat label** (500, 12px, 0.05em, uppercase, Lavender Mist): the shipped Playus `stat-label`, naming a stat value or a table column.

### Named Rules
**The Tabular Rule.** Every number that can change (scores, gemas, puestos, timers, counts) uses tabular figures, so tables do not jitter on refresh.

**The Three Loud Words Rule.** In NEXPLAY, Unbounded appears on at most three elements per screen (title, game name, score), never below 16px and never as a paragraph.

## Layout

Playus is a single centered column capped at 1152px with a 16px side gutter, 32px top and 96px bottom padding; inside it, grids open to two, three or four columns from 640px and 1024px up. NEXPLAY player screens are one column capped at 480px (it is a phone app) with a 16px gutter; only admin tables use a wide layout.

Spacing runs on an 8px grid with 2px and 4px steps for optical work. Panels sit 16px apart on phones; screen sections are 32px apart. NEXPLAY screen order is fixed: context on top, the live panel in the middle, the primary action under it in the bottom half of the screen, then the data (tabla, ranking). Data rows are at least 48px tall.

**The Thumb Rule.** In NEXPLAY no target is under 48px, the primary action is 56px, and no action depends on hover.

## Elevation & Depth

Flat plus live glow. Panels never cast shadows: depth comes from stepping the surface (Indigo Night, Panel Indigo, Raised Indigo, Well Indigo) and from the 1px facet edge. Because `clip-path` swallows `box-shadow`, every glow and shadow is applied to an unclipped wrapper with `filter: drop-shadow` (as the Playus podium already does for first place). Lifted shadows exist only for overlays: menus and popovers at level 2, modals and bottom sheets at level 3. Exact values live in the sidecar.

### Shadow Vocabulary
- **Level 2** (`box-shadow: 0 12px 32px rgba(8, 6, 20, 0.55)`): menus, popovers, toasts, tooltips, on the wrapper.
- **Level 3** (`box-shadow: 0 24px 64px rgba(8, 6, 20, 0.70)`): modals and bottom sheets, on the wrapper.
- **Live glow** (`filter: drop-shadow(0 0 14px rgba(78, 127, 232, 0.45))`): the open fecha panel.
- **Gold glow** (`filter: drop-shadow(0 0 16px rgba(232, 181, 77, 0.45))`): a fresh record, for 2s; a dragged slider thumb.

### Named Rules
**The Only the Live Thing Glows Rule.** Glow is reserved for what is happening now: the open fecha, the attempt in progress, a fresh record. Nothing static glows.

## Shapes

Facets replace rounding. The shape primitive is the gem cut: `clip-path` takes the top-left and bottom-right corners, and the cut diagonal is redrawn by two thin linear-gradient backgrounds so the 1px edge stays continuous. Edge and fill are set per element through `--edge` and `--fill`, which is how hover edges (gold), the gold variant and the live variant work without new classes. Two cut sizes: 14px for large panels, sheets and modals; 8px for small panels, buttons, inputs and chips (4px on tiny pieces like badges, checkbox and toggle thumb). Radius is 0 everywhere except true circles (attempt dots, avatars, the live pulse dot, progress tracks), which take 999px.

**The Cut, Never Round Rule.** No border-radius above 0 on panels, buttons, inputs, chips or modals. Use the gem cut.

## Components

### Buttons
Tactile gems that sink under the thumb.
- **Shape:** gem cut 8px, no radius.
- **Primary:** Trophy Gold fill, Indigo Night text, Unbounded 700 16px uppercase at 0.04em, 56px tall, 24px side padding; one per screen.
- **Hover / Focus:** hover lifts to Bright Gold on pointer devices. Press is `translateY(2px) scale(0.98)` in 140ms, springing back in 320ms. Focus is an inset 2px ring inside the cut (Indigo Night on gold, gold on the others).
- **Secondary:** Raised Indigo fill, Moonlight text, 1px Visible Facet edge, 48px, Inter 600 15px; hover to Well Indigo.
- **Ghost:** no fill, Lavender Mist text, 40px; hover to Moonlight.
- **Destructive:** Ruby Tint fill, Ruby text and 1px Ruby edge, 48px.
- **Disabled:** opacity 0.4, no transform. Loading swaps the label for "Enviando…" and keeps the width.

### Chips
- **Style:** 28px tall, 10px side padding, gem cut 8px, Inter caption 600, Raised Indigo fill, Lavender Mist text, 1px Facet Line edge.
- **State:** selected takes Ember Gold Tint, gold text and a gold edge. Status chips pair a gem with its own tint, and labels are locked: EN VIVO and UNDERDOG are live (with a 6px pulsing dot), VÁLIDO, ACEPTADA and CERRADA are success, REPETICIÓN and PENDIENTE are warning, FALLADO and BLOQUEADA are error, RÉCORD is gold.

### Cards / Containers
- **Corner Style:** gem cut 14px (large panel) or 8px (small panel); radius 0.
- **Background:** Panel Indigo for the large panel, Raised Indigo for the small one.
- **Shadow Strategy:** none; see Elevation & Depth. The live panel swaps its edge to sapphire and glows through its wrapper.
- **Border:** 1px Facet Line via `--edge`; gold for featured winners (`gem-panel-gold`); gold on hover for clickable panels.
- **Internal Padding:** 24px on the large panel, 16px on the small one. One panel per idea: never nest a large panel in another, and nest a small one only once.

### Inputs / Fields
- **Style:** 48px, Well Indigo fill, 1px Visible Facet edge, gem cut 8px, 16px side padding, Inter body; placeholder in Dim Lavender. Label above in the uppercase label style, 8px gap.
- **Focus:** the edge turns gold plus an inset 2px gold ring.
- **Error / Disabled:** 1px Ruby edge with a Ruby caption below; disabled at opacity 0.4. The invitation code field is IBM Plex Mono 500, uppercase, 0.12em tracking, centered.

### Navigation
- **Playus top nav:** Inter 14px 500 links, 8px by 12px padding, Lavender Mist at rest, Moonlight on hover, gold text with a 2px gold bottom bar when active.
- **NEXPLAY tab bar:** 64px plus safe area, Panel Indigo with a 1px Facet Line top edge, four tabs (Sala, Ranking, Practicar, Perfil) in caption type; active is gold with a 2px gold bar on the top edge, inactive is Dim Lavender.

### Attempt Dots (signature, NEXPLAY)
Ten-pixel circles, 4px apart, one per attempt (three, four with Underdog). Used dots are Lavender Mist so gold stays rare; the attempt in progress is sapphire with a pulse; empty dots are a 1.5px Visible Facet ring; the fourth Underdog dot is ringed in sapphire until used.

### Score Display (signature, NEXPLAY)
The score type in Moonlight with its unit below in caption Lavender Mist ("pisos", "ms"). It counts up over 450ms with the emphasis spring, overshooting about 4% and settling; it turns gold with the gold glow only for a new personal best. Reduced motion shows the final number.

### Motion
Playus moves once, at the curtain intro; NEXPLAY answers every touch with a short spring (140ms micro, 320ms standard, 450ms emphasis; values in the sidecar). Motion always answers an action or a state change; the only idle loop is the 2s live pulse dot. Under `prefers-reduced-motion` every transform and keyframe drops away and changes fade in 120ms at most.

## Do's and Don'ts

### Do:
- **Do** reuse `gem-panel`, `gem-panel-sm`, `gem-panel-gold` and `stat-label` before inventing a panel or label style; change color through `--edge` and `--fill`.
- **Do** put focus on gem-cut elements inside the cut: `box-shadow: inset 0 0 0 2px` in gold, or in Indigo Night on a gold fill.
- **Do** put glows and overlay shadows on an unclipped wrapper with `filter: drop-shadow`.
- **Do** use tabular figures on every number that can change.
- **Do** keep NEXPLAY targets at 48px or more and the single gold primary action at 56px in the bottom half of the screen.
- **Do** keep the two fixed body halos on the indigo night in both apps.
- **Do** show loading as one short line of Dim Lavender copy ("Cargando la sala…") or the gem spinner.

### Don't:
- **Don't** use a gem color for looks; one gem, one meaning, and no sapphire on anything that is not live right now.
- **Don't** show more than one gold action and one gold number per screen, beyond puesto 1 and the RÉCORD chip.
- **Don't** round panels, buttons, inputs, chips or modals.
- **Don't** put an outside `outline` or offset ring on a clip-path element; the cut hides it.
- **Don't** set `border: none` or `background: transparent` on an element that also carries `gem-panel` or `gem-panel-sm`; the reset wins by order and erases the gem fill and edge. Reset only the non-gem variants (primary, ghost).
- **Don't** put an outer `box-shadow` (shadow or glow) on a clipped element; it is invisible. Only the inset focus ring goes on the element itself.
- **Don't** ship light mode; the light tokens are for previews only.
- **Don't** use skeleton shimmer, idle looping animation (beyond the live pulse) or a toast for a game result.
- **Don't** set Unbounded below 16px or as a paragraph in NEXPLAY.
