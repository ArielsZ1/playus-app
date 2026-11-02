---
name: nexplay-design
description: "This skill should be used when the user explicitly says 'NEXPLAY style', 'NEXPLAY design', '/nexplay-design', or directly asks to use/apply the NEXPLAY design system. NEVER trigger automatically for generic UI or design tasks."
version: 1.0.0
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# nexplay

You are a senior product designer. When this skill is active, every UI decision follows this design language.

**Before starting any design work, declare which fonts are required and how to load them** (see `references/platform-mapping.md`). Never assume fonts are already available. In the Playus repo, Unbounded and Inter already load from `index.html`; NEXPLAY's own `nexplay/index.html` must load Unbounded 500/700/900, Inter 400/500/600/700 and IBM Plex Mono 500.

---

## 1. DESIGN PHILOSOPHY

NEXPLAY is the live sibling of Playus. Playus is the museum where finished fechas rest; NEXPLAY is the play floor where they happen, phone in hand, on a Saturday afternoon among friends. It keeps the Playus night (indigo `#14102A`), the faceted gem cut of `gem-panel` and the round, wide voice of Unbounded, so nobody feels they left home.

What changes is the job of color and motion. In Playus the four gems decorate; in NEXPLAY each gem is a signal with one meaning: **gold** is you at your best (Jugar, tu mejor marca, puesto 1), **sapphire** is live (fecha abierta, tabla que se mueve), **ruby** is time running out or something failed, **emerald** is valid and accepted. And where Playus stays still, NEXPLAY answers the thumb: buttons sink 2px and spring back, scores jump and settle, the ruleta brakes with a small rebound.

The primary tension: **cold jewel precision against warm arcade pulse.** Facets are sharp and exact; the motion is elastic and alive. Lineage: tournament scoreboards, cut gemstones, the Playus intro curtain.

### Principles

1. **One gem, one meaning.** A color only appears when its signal is true. Sapphire on a static element is a bug.
2. **Cut, never round.** Shape comes from diagonal corner cuts (8px or 14px). Rounded corners exist only on dots and avatars.
3. **The thumb comes first.** Every target is at least 48px; the primary action is 56px and lives in the bottom half of the screen.
4. **Numbers are the heroes.** The score of an attempt is the biggest thing on its screen, in Unbounded 900 with tabular figures, in `--text1`; it turns gold only when it is a new personal best.
5. **Only the live thing glows.** Glow is reserved for what is happening now: the open fecha, the attempt in progress, a fresh record.
6. **Motion confirms, it never decorates.** Every animation answers an action or a state change; nothing loops idly except the live pulse.
7. **Same house as Playus.** If a component exists in Playus (`gem-panel`, `gem-panel-sm`, `stat-label`, the gold focus ring), reuse it before inventing.

---

## 2. CRAFT RULES: HOW TO COMPOSE

### 2.1 Hierarchy layers

| Layer | What | Treatment |
|-------|------|-----------|
| 1. Signal | The one thing to do or know now (Jugar, tu puntaje) | Gold fill or `--score` type, bottom half of the screen |
| 2. Context | Where you are (Temporada 11, Fecha 4 de 12, juego) | `--label` uppercase in `--text2` + `--heading` |
| 3. Data | Tables, attempts, ranking | `--body` in `--text1`, tabular numbers, rows 48px |
| 4. Meta | Refresh time, rules, footnotes | `--caption` in `--text3` |

**Squint test:** blur the screen. You must see exactly one gold shape and, if a fecha is open, exactly one sapphire edge. Two golds means two signals fighting.

### 2.2 Typography discipline

- Font budget per screen: Unbounded for at most 3 elements (screen title, game name, score), Inter for everything else, IBM Plex Mono only for codes.
- Unbounded never goes below 16px and never runs as a paragraph.
- Every number that can change uses `font-variant-numeric: tabular-nums` so tables do not jitter on refresh.
- Labels are uppercase `--label` (11px, 600, 0.08em): the Playus `stat-label`.

### 2.3 Spacing semantics

- 8px grid. Inside a panel: `--space-lg` (24px) padding on `gem-panel`, `--space-md` (16px) on `gem-panel-sm`.
- Between panels on a phone: `--space-md`. Between screen sections: `--space-xl`.
- Side gutter on phones: 16px. Content max width on larger screens: 480px for player screens (it is a phone app), 1120px only for admin tables.

### 2.4 Color strategy

| Gem | Token | Allowed on | Never on |
|-----|-------|-----------|----------|
| Gold | `--accent` | Jugar button, puesto 1, récord (chip or a new personal best), focus ring | Secondary buttons, headings, used attempt dots, a score that is not a record |
| Sapphire | `--live` | Open fecha edge, "en vivo" badge, refresh indicator, current attempt dot | Anything static or historical |
| Ruby | `--error` | Last 5 seconds of a countdown, failed attempt, blocked account, destructive action | Normal timers above 5s |
| Emerald | `--success` | Valid attempt, accepted account, closed fecha | Generic "ok" decoration |

Max two chromatic gems per screen, plus neutrals. Backgrounds of status chips use the matching `--*-bg` tint.

### 2.5 Composition

- Player screens are a single column. The order is fixed: context on top, the live panel in the middle, the primary action under it, the data (tabla, ranking) below.
- One `gem-panel` per idea. Do not nest a `gem-panel` inside another; nest `gem-panel-sm` once at most.
- The live panel gets `--edge: var(--live)` and a wrapper with `filter: var(--glow-live)`, because `clip-path` clips `box-shadow`.

### 2.6 Motion choreography

| Moment | Motion |
|--------|--------|
| Press any button | `translateY(2px) scale(.98)` in 140ms, spring back in 320ms |
| Attempt result | Score counts up, overshoots 4% and settles (450ms spring) |
| Record nuevo | Gold destello like the Playus intro, once, plus the gold glow for 2s |
| Ruleta | Spins, decelerates, rebounds 6° past the winner and settles |
| Table refresh | Changed rows flash `--surface3` for 320ms; rows that move slide to their new place |
| `prefers-reduced-motion` | No transforms, no keyframes; changes fade in 120ms or appear instantly |

---

## 3. ANTI-PATTERNS: WHAT TO NEVER DO

- No `border-radius` above 0 on panels, buttons, inputs, chips or modals. Use the gem cut.
- No `box-shadow` on clipped elements; it is invisible and wasted. Glow lives on a wrapper with `filter: drop-shadow`.
- No sapphire on anything that is not live right now.
- No more than one gold action and one gold number per screen; puesto 1 in a table and the record chip are the only extra golds.
- No Unbounded below 16px and no Unbounded paragraphs.
- No light mode in the shipped app. The light tokens exist only for previews.
- No touch target under 48px, and no action that depends on hover.
- No skeleton shimmer. Loading is a short line of `--text3` copy ("Cargando la sala…") or a gem spinner.
- No toast for a game result. Results are full-screen moments; toasts are for side effects (código copiado).
- No idle looping animation except the 2s live pulse dot.
- No proportional numerals in tables, scores or timers.
- No new ad-hoc panel styles when `gem-panel`, `gem-panel-sm` or `stat-label` already fit.
- No outside `outline` focus ring on a gem-cut element: `clip-path` hides it. Use `box-shadow: inset 0 0 0 2px var(--accent)` (`--on-accent` on gold). The Playus global `ring` on `:focus-visible` has the same problem on `gem-panel` buttons.
- No `border: none` or `background: transparent` on an element that also carries `gem-panel` / `gem-panel-sm`: the reset has the same specificity, wins by order and erases the gem fill and edge. Reset only the variants that are not gems (primary, ghost).

---

## 4. WORKFLOW

1. **Declare fonts**: check `references/platform-mapping.md` for loading instructions
2. **Set tokens**: apply variables from `references/tokens.md`
3. **Build components**: use specs from `references/components.md`
4. **Check hierarchy**: squint test, one gold and at most one sapphire
5. **Verify the dark mode**: it is the product; light is only a preview check
6. **Test extremes**: long apodos, 0 attempts, 4 attempts (Underdog), 21 fechas, 7 players and 1 player, no open fecha
7. **Platform-adapt**: consult `references/platform-mapping.md` (Tailwind in the Playus repo)

---

## 5. REFERENCE FILES

| File | Contains |
|------|----------|
| `references/tokens.md` | Fonts, type scale, color system (dark + light), spacing, cuts, elevation, motion, iconography |
| `references/components.md` | Buttons, panels, inputs, lists, navigation, chips, overlays, game-specific pieces, state patterns |
| `references/platform-mapping.md` | HTML/CSS, SwiftUI, React/Tailwind for the Playus repo |
| `design-model.yaml` | Single source of truth for every value above |
| `preview.html`, `component-library.html`, `landing-page.html`, `app-screen.html` | Visual proofs of the language |
