# nexplay: Components

Every component traces to `design-model.yaml`. `observed` = exists in Playus; `derived` = new, justified by the principles in SKILL.md.

All shapes use the gem cut: `--cut` set per component, `clip-path` cuts top-left and bottom-right, the diagonals are redrawn with two `linear-gradient` backgrounds (the `gem-panel` recipe). Radii are 0 unless stated.

## 1. BUTTONS (derived)

Playus has no button component. Justified by principle 2 (cut, never round) and principle 3 (the thumb comes first); gold comes from `gem-panel-gold`.

### Variants

| Variant | Background | Text | Border | Radius | Height |
|---------|-----------|------|--------|--------|--------|
| Primary | `--accent` | `--on-accent` | none | 0px, cut 8px | 56px |
| Secondary | `--surface2` | `--text1` | 1px `--border-visible` | 0px, cut 8px | 48px |
| Ghost | transparent | `--text2` | none | 0px | 40px |
| Destructive | `--error-bg` | `--error` | 1px `--error` | 0px, cut 8px | 48px |

### Specs

| Property | Value |
|----------|-------|
| Height (large) | 56px (primary, one per screen) |
| Height (small) | 40px |
| Padding (large) | 0px 24px |
| Padding (small) | 0px 16px |
| Font | Primary: `Unbounded` 700, 16px, uppercase, 0.04em. Others: `Inter` 600, 15px |
| Min touch target | 48px (NEXPLAY rule, stricter than 44px) |

### States

| State | Change |
|-------|--------|
| **Hover** | Primary `brand.400`; secondary `--surface3`; ghost `--text1` (pointer devices only) |
| **Active / Pressed** | `translateY(2px) scale(.98)` 140ms, spring back 320ms |
| **Disabled** | Opacity .4, no transform, cursor default |
| **Focus** | Inset 2px ring inside the cut: `--on-accent` on primary, `--accent` on the others (an outside outline would be clipped away) |

Loading: the label is replaced by "Enviando…" and the button keeps its width; never a spinner inside the primary button.

---

## 2. CARDS / SURFACES (observed: `gem-panel`)

### Standard Card (`gem-panel`)
- Background: `--surface1`
- Border: 1px `--border` via `--edge`, diagonals redrawn
- Radius: 0px, cut 14px top-left and bottom-right
- Padding: 24px
- Shadow: none (light) / none (dark)

### Featured Card (live panel, derived)
- Background: `--surface1` + `--edge: var(--live)` and a wrapper with `filter: var(--glow-live)`
- Radius: 0px, cut 14px
- Shadow: glow only, see tokens 5

### Compact Card (`gem-panel-sm`)
- Radius: 0px, cut 8px
- Padding: 16px
- Background `--surface2`, same edge as standard

### Content Layout
- Title: `--subheading`, `--text1`
- Description: `--body-sm`, `--text2`
- Metadata: `--caption`, `--text3`
- Internal spacing between elements: `--space-sm`
- Press state: interactive panels take the button press transform and `--edge: var(--border-visible)`

---

## 3. INPUTS (derived)

### Text Field

| Property | Value |
|----------|-------|
| Height | 48px |
| Background | `--surface3` |
| Border (default) | 1px `--border-visible` |
| Border (focus) | 1px `--accent` |
| Border (error) | 1px `--error` |
| Radius | 0px, cut 8px |
| Padding | 0px 16px |
| Font | `Inter`, `--body` |
| Placeholder color | `--text3` |

The invitation code field uses `IBM Plex Mono` 500, uppercase, 0.12em tracking, centered.

### Label
- Position: above field, 8px gap
- Font: `Inter`, `--label`, `--text2` (uppercase)

### States

| State | Treatment |
|-------|-----------|
| **Default** | 1px `--border-visible` |
| **Focus** | 1px `--accent` edge plus an inset 2px `--accent` ring (`box-shadow: inset 0 0 0 2px`) |
| **Error** | 1px `--error`. Error text below in `--error`, `--caption` |
| **Disabled** | Opacity 0.4, no interaction |

### Multiline
- Same styling as text field, min-height 100px, auto-grows

---

## 4. LISTS / DATA ROWS (derived)

### Standard Row

| Property | Value |
|----------|-------|
| Min height | 48px |
| Padding | 12px 16px |
| Divider | 1px `--border` |
| Label font | `Inter`, `--body`, `--text1` |
| Value font | `Inter` 600, `--body`, tabular-nums |
| Accessory | Attempt dots or chevron-right 16px in `--text3` |

### Interaction States

| State | Treatment |
|-------|-----------|
| **Default** | Transparent background |
| **Pressed** | `--surface2` |
| **Selected** | `--surface2` + 2px left bar in `--accent` (your own row) |

### Data Row (Label + Value)
- Left: label in `--text2`
- Right: value in `--text1`, Inter 600 tabular-nums
- Unit/suffix: `--caption`, `--text3`, adjacent to value ("37 pisos")

---

## 5. NAVIGATION / TAB BAR (derived)

### Tab Bar

| Property | Value |
|----------|-------|
| Height | 64px + safe area |
| Background | `--surface1` |
| Border | 1px `--border` top |
| Font | `Inter`, `--caption` |

Four tabs: Sala, Ranking, Practicar, Perfil.

### Tab States

| State | Treatment |
|-------|-----------|
| **Active** | Icon and label `--accent`, 2px gold bar on top edge |
| **Inactive** | `--text3` |
| **Hover** | `--text1` (pointer devices) |

### Navigation Bar
- Title: `--heading`, `--text1`
- Back button: 48px ghost icon button with chevron-left
- Background: `--background`, no border

---

## 6. TAGS / CHIPS (derived)

| Property | Value |
|----------|-------|
| Height | 28px |
| Padding | 0px 10px |
| Radius | 0px, cut 8px |
| Font | `Inter`, `--caption`, 600 |
| Background | `--surface2` |
| Text color | `--text2` |
| Border | 1px `--border` |

### Selected State
- Background: `--accent-subtle`
- Text: `--accent`
- Border: 1px `--accent`

### Status Variants
Use status colors for semantic tags: `--success-bg` + `--success`, `--warning-bg` + `--warning`, `--error-bg` + `--error`. The live chip is `--live-bg` + `--live` with a 6px pulsing dot.

Label lock (same label, same variant, everywhere): EN VIVO = live, VÁLIDO = success, ACEPTADA = success, CERRADA = success, REPETICIÓN = warning, PENDIENTE = warning, FALLADO = error, BLOQUEADA = error, UNDERDOG = live, RÉCORD = accent.

---

## 7. OVERLAYS (derived)

### Modal / Dialog

| Property | Value |
|----------|-------|
| Background | `--surface1` |
| Radius | 0px, cut 14px |
| Shadow | level 3 on the wrapper |
| Backdrop | `rgba(8, 6, 20, 0.72)` |
| Max width | 400px |
| Padding | 24px |
| Close button | 48px ghost icon button, top right |

### Bottom Sheet (preferred over modals on phones)

| Property | Value |
|----------|-------|
| Background | `--surface1` |
| Top radius | 0px, cut 14px top-left only |
| Handle | 32x4px bar `--border-visible`, radius 999 |
| Backdrop | `rgba(8, 6, 20, 0.72)` |
| Dismiss | drag-to-dismiss |

### Dropdown / Popover

| Property | Value |
|----------|-------|
| Background | `--surface1` |
| Radius | 0px, cut 8px |
| Shadow | level 2 on the wrapper |
| Border | 1px `--border-visible` |
| Item height | 48px |
| Selected indicator | check 16px in `--accent` |

---

## 8. STATE PATTERNS

### Empty State
- Layout: centered, generous top padding (64px+)
- Icon/Illustration: 40px Lucide outline in `--text3` inside a `gem-panel-sm`
- Headline: `--subheading`, `--text2`
- Description: `--body`, `--text3`, max 2 lines ("Todavía no hay fecha abierta. Cuando el admin la inicie, aparece acá.")
- CTA: primary button, 24px below description (only if there is something to do, like Practicar)

### Loading
- Inline: `--caption` text in `--text3` ("Actualizando…")
- Full screen: a 32px gem spinner (rotating cut square outline in `--accent`) with "Cargando la sala…"
- Content appearance: fade 120ms, no shimmer

### Error
- Inline (field): `--error` text in `--caption` below element
- Screen-level: `gem-panel-sm` with `--edge: var(--error)` and `--fill: var(--error-bg)` (the Playus error panel)
- Tone: says what happened and what to do: "No se pudo guardar el intento. Revisá la conexión y tocá Reintentar."

### Disabled
- Opacity 0.4, no interaction, maintains layout
- Borders fade to `--border` default
- No hover/focus states

---

## 9. TOGGLE / SWITCH (derived)

### Specs

| Property | Value |
|----------|-------|
| Track width | 48px |
| Track height | 28px |
| Track radius | 0px, cut 8px |
| Thumb size | 20px |
| Thumb radius | 0px, cut 4px (a small gem) |
| Thumb offset (from edge) | 4px |
| Label position | left, switch on the right edge of the row |
| Label gap | 16px |
| Label font | `Inter`, `--body`, `--text1` |

### States

| State | Track Background | Thumb |
|-------|-----------------|-------|
| **Off (default)** | `--surface3` | `--text3` |
| **On** | `--accent` | `--on-accent` |
| **Hover** | track edge `--border-visible` | n/a |
| **Disabled** | Opacity 0.4, no interaction | n/a |
| **Focus** | 2px gold ring, 2px offset | n/a |

---

## 10. CHECKBOX (derived)

### Specs

| Property | Value |
|----------|-------|
| Size | 20px |
| Border (unchecked) | 1.5px `--border-visible` |
| Radius | 0px, cut 4px |
| Checked fill | `--accent` |
| Checkmark color | `--on-accent` |
| Checkmark stroke | 2px |
| Label gap | 12px |
| Label font | `Inter`, `--body`, `--text1` |

### Variants

| Variant | Treatment |
|---------|-----------|
| Unchecked | 1.5px `--border-visible`, transparent fill |
| Checked | `--accent` fill, `--on-accent` checkmark |
| Indeterminate | `--accent` fill, horizontal dash in `--on-accent` |

### States

| State | Treatment |
|-------|-----------|
| **Default** | 1.5px `--border-visible` |
| **Hover** | border `--text2` |
| **Active** | scale .92 140ms |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | 2px gold ring, 2px offset |

---

## 11. RADIO (derived)

### Specs

| Property | Value |
|----------|-------|
| Size | 20px |
| Border | 1.5px `--border-visible` |
| Radius | 50% (circle) |
| Selected indicator | 10px dot in `--accent` |
| Selected border | 1.5px `--accent` |
| Label gap | 12px |
| Label font | `Inter`, `--body`, `--text1` |

### States

| State | Treatment |
|-------|-----------|
| **Default** | 1.5px `--border-visible`, transparent fill |
| **Selected** | 1.5px `--accent`, inner dot `--accent` |
| **Hover** | border `--text2` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | 2px gold ring, 2px offset |

---

## 12. SLIDER / RANGE (derived)

Used in admin only (cantidad de fechas 1 a 21).

### Specs

| Property | Value |
|----------|-------|
| Track height | 4px |
| Track radius | 999px |
| Track background (unfilled) | `--surface3` |
| Track background (filled) | `--accent` |
| Thumb width | 20px |
| Thumb height | 20px |
| Thumb radius | 0px, rotated 45deg square (a gem) |
| Thumb background | `--accent` |
| Thumb border | 2px `--background` |
| Step marks | 3px dots in `--border-visible` at each integer |
| Value label | Unbounded 700 16px above thumb, `--text1` |

### States

| State | Treatment |
|-------|-----------|
| **Default** | As specced |
| **Hover** | thumb scale 1.1 |
| **Active / Dragging** | thumb scale 1.2 + `--glow-gold` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | 2px gold ring around the thumb |

---

## 13. SELECT / DROPDOWN TRIGGER (derived)

### Specs

| Property | Value |
|----------|-------|
| Height | 48px (inherits from Inputs) |
| Background | `--surface3` |
| Border | 1px `--border-visible` |
| Radius | 0px, cut 8px |
| Padding | 0px 16px |
| Font | `Inter`, `--body`, `--text1` |
| Placeholder color | `--text3` |
| Chevron icon | Lucide chevron-down |
| Chevron color | `--text3` |
| Chevron size | 16px |

### States

| State | Treatment |
|-------|-----------|
| **Default** | 1px `--border-visible`, chevron pointing down |
| **Hover** | border `--text3` |
| **Open** | 1px `--accent`, chevron rotated 180deg. Dropdown menu per Overlays > Dropdown |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | 1px `--accent`. Plus the 2px gold focus ring |
| **Error** | 1px `--error` |

On phones, the open state is a bottom sheet list, not a floating menu.

---

## 14. TEXTAREA (derived)

Inherits all styling from **Inputs > Text Field** with these overrides:

| Property | Value |
|----------|-------|
| Min height | 100px |
| Resize behavior | vertical only |
| Line height | 1.5 |
| Padding | 12px |
| Character count position | bottom right, outside the field |
| Character count font | `Inter`, `--caption`, `--text3` |

Used for "motivo" in admin actions (corregir, cancelar, bloquear). Max 280 characters.

### States

Same as Inputs (default, focus, error, disabled).

---

## 15. DATA TABLE: TABLA PROVISORIA (derived)

### Header Row

| Property | Value |
|----------|-------|
| Height | 32px |
| Background | transparent |
| Font | `Inter`, `--caption`, 600, `--text2` |
| Text transform | uppercase, 0.08em |
| Cell padding | 8px 12px |
| Sort indicator | none (the order is the ranking) |
| Border bottom | 1px `--border` |

### Body Row

| Property | Value |
|----------|-------|
| Height | 48px |
| Font | `Inter`, `--body`, `--text1` |
| Cell padding | 12px 12px |
| Row divider | 1px `--border` |
| Column alignment | Puesto right-aligned 24px, jugador left, mejor right tabular, intentos right |

Columns: Puesto, Jugador, Mejor, Intentos (dots), mark (REPETICIÓN chip if any).

### Row States

| State | Treatment |
|-------|-----------|
| **Default** | Transparent background |
| **Hover** | `--surface2` (pointer devices) |
| **Selected** | Your row: `--surface2` + 2px left bar `--accent` |
| **Striped (optional)** | not used |
| **Refreshed** | Changed rows flash `--surface3` for 320ms |
| **Puesto 1** | Puesto number in `--accent`, crown 16px |

---

## 16. TABS (derived)

### Specs

| Property | Value |
|----------|-------|
| Bar height | 48px |
| Tab padding | 12px 16px |
| Font | `Inter`, `--body-sm`, 600 |
| Gap between tabs | 4px |
| Active indicator | 2px bar `--accent`, full tab width, bottom |
| Bar border | 1px `--border` bottom |
| Transition | indicator slides 320ms spring |

Used for Tabla provisoria / Ranking de la temporada inside the sala.

### States

| State | Treatment |
|-------|-----------|
| **Active** | `--text1`, 2px bar `--accent` |
| **Inactive** | `--text3` |
| **Hover** | `--text2` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | 2px gold ring inset |

---

## 17. BREADCRUMB (derived, admin only)

### Specs

| Property | Value |
|----------|-------|
| Font | `Inter`, `--body-sm` |
| Link color | `--text2` |
| Link hover | `--text1` + underline 1px |
| Separator glyph | chevron-right 12px |
| Separator color | `--text3` |
| Separator spacing | 6px each side |
| Current page | `--text1`, 600, not a link |

---

## 18. AVATAR (derived)

### Sizes

| Size | Dimensions | Font (initials) |
|------|-----------|-----------------|
| Small | 24px | `--caption` |
| Medium | 32px | `--body-sm` |
| Large | 48px | `--body` |

### Specs

| Property | Value |
|----------|-------|
| Border radius | 50% |
| Fallback background | `--surface3` |
| Fallback text color | `--text1` |
| Fallback font weight | 600 |
| Border | 1px `--border-visible` |
| Status dot size | 8px |
| Status dot position | bottom-right, -1px |
| Status dot border | 2px `--background` |

Initials come from the player's apodo (2 letters max). Google photos are not shown: the apodo is the identity in Playus.

### Status Dot Colors

| Status | Color |
|--------|-------|
| Online (jugando ahora) | `--live` |
| Away | `--warning` |
| Offline | `--text3` |
| Busy | `--error` |

---

## 19. BADGE / STATUS DOT (derived)

### Specs

| Property | Value |
|----------|-------|
| Height | 20px |
| Min width | 20px |
| Padding | 0px 6px |
| Radius | 0px, cut 4px |
| Font | `Inter`, `--caption`, 700 |
| Position relative to parent | top-right, translate(40%, -40%) |

### Semantic Variants

| Variant | Background | Text |
|---------|-----------|------|
| Neutral | `--surface3` | `--text2` |
| Success | `--success-bg` | `--success` |
| Warning | `--warning-bg` | `--warning` |
| Error | `--error-bg` | `--error` |
| Info | `--live-bg` | `--live` |

### Status Dot (icon-only)
- Size: 8px
- Same semantic color mapping, no text
- Border: 2px `--background`

### Attempt dots (NEXPLAY-specific)
- 10px circles, 4px gap, one per attempt (3, or 4 with Underdog)
- Used: `--text2` fill (neutral, so gold stays rare). In progress: `--live` fill with pulse. Empty: transparent + 1.5px `--border-visible`
- The 4th Underdog dot is outlined in `--live` until used

---

## 20. TOOLTIP (derived)

### Specs

| Property | Value |
|----------|-------|
| Background | `--surface3` |
| Text color | `--text1` |
| Font | `Inter`, `--caption` |
| Radius | 0px, cut 4px |
| Padding | 6px 10px |
| Max width | 240px |
| Arrow | none |
| Delay (show) | 400ms |
| Delay (hide) | 0ms |
| Placement | top, flips to bottom |
| Shadow | level 2 |

Phones have no hover: tooltips only explain icons on desktop admin. On phones, use an inline `--caption` line instead.

---

## 21. ALERT / BANNER (observed: Playus error panel)

### Specs

| Property | Value |
|----------|-------|
| Radius | 0px, cut 8px (`gem-panel-sm`) |
| Padding | 12px 16px |
| Icon size | 20px |
| Icon gap | 12px |
| Font (title) | `Inter`, `--body-sm`, 600 |
| Font (description) | `Inter`, `--body-sm`, `--text2` |
| Dismiss button | 40px ghost icon button, only for info alerts |
| Layout | icon left, text, optional action right |

### Semantic Variants

| Variant | Background | Border | Icon color | Text color |
|---------|-----------|--------|-----------|------------|
| Info | `--live-bg` | 1px `--live` | `--live` | `--text1` |
| Success | `--success-bg` | 1px `--success` | `--success` | `--text1` |
| Warning | `--warning-bg` | 1px `--warning` | `--warning` | `--text1` |
| Error | `--error-bg` | 1px `--error` | `--error` | `--text1` |

---

## 22. TOAST / NOTIFICATION (derived)

### Specs

| Property | Value |
|----------|-------|
| Position | bottom center, above the tab bar |
| Max width | 360px |
| Background | `--surface3` |
| Text color | `--text1` |
| Radius | 0px, cut 8px |
| Padding | 12px 16px |
| Shadow | level 2 on the wrapper |
| Font | `Inter`, `--body-sm` |
| Auto-dismiss | 3000ms |
| Animation | rises 8px with the 320ms spring |
| Dismiss button | none, tap to dismiss |
| Max stack | 1 |

Toasts are only for side effects ("Código copiado", "Link de invitación listo"). Never for game results.

### Semantic Variants

| Variant | Accent / Icon color |
|---------|-------------------|
| Neutral | `--text2` |
| Success | `--success` |
| Warning | `--warning` |
| Error | `--error` |

---

## 23. PROGRESS BAR (derived)

### Specs

| Property | Value |
|----------|-------|
| Height | 6px |
| Track radius | 999px |
| Track background | `--surface3` |
| Fill color | `--accent` |
| Fill radius | 999px |
| Label position | above right, "Fecha 4 de 12" |
| Label font | `Inter`, `--caption`, `--text2` |
| Indeterminate animation | none (NEXPLAY never shows unknown progress) |

Season progress uses 12 to 21 segments separated by 2px gaps instead of one bar: closed fechas `--success`, open fecha `--live`, upcoming `--surface3`, cancelled `--error` at .5 opacity.

### Semantic Fill Colors

| Variant | Fill |
|---------|------|
| Default | `--accent` |
| Success | `--success` |
| Warning | `--warning` |
| Error | `--error` |

---

## 24. SPINNER (derived)

### Specs

| Property | Value |
|----------|-------|
| Size (small) | 16px |
| Size (medium) | 24px |
| Size (large) | 32px |
| Stroke width | 2px |
| Color | `--accent` |
| Track color | `--surface3` |
| Animation | outlined gem (square rotated 45deg) spins 360deg in 900ms linear; reduced motion: static with "Cargando…" |

---

## 25. SKELETON (not used)

### Specs

| Property | Value |
|----------|-------|
| Background | not used |
| Shimmer color | not used |
| Radius | Match target component radius |
| Animation | not used: loading is copy or the gem spinner (anti-pattern list) |
| Animation duration | 0ms |

### Common Shapes

| Shape | Dimensions | Radius |
|-------|-----------|--------|
| Text line | not used | n/a |
| Heading | not used | n/a |
| Circle (avatar) | 32px | 50% |
| Rectangle (card) | not used | 0px |
| Thumbnail | not used | n/a |

---

## 26. ACCORDION (derived)

Used for the rules of a game on the instructions screen.

### Specs

| Property | Value |
|----------|-------|
| Header height | 48px |
| Header padding | 12px 16px |
| Header font | `Inter`, `--body`, 600, `--text1` |
| Chevron size | 16px |
| Chevron color | `--text3` |
| Chevron rotation (open) | 180deg |
| Content padding | 0 16px 16px |
| Content font | `Inter`, `--body`, `--text2` |
| Divider | 1px `--border` |
| Background | transparent inside a `gem-panel` |
| Radius | 0px |

### States

| State | Treatment |
|-------|-----------|
| **Closed** | Chevron pointing down, content hidden |
| **Open** | Chevron rotated 180deg, content visible |
| **Hover** | header `--surface2` |
| **Disabled** | Opacity 0.4, no interaction |
| **Focus** | 2px gold ring inset |

---

## 27. NEXPLAY-SPECIFIC PIECES (derived)

### Score display
- `--score` (Unbounded 900, 56px), tabular, `--text1`; `--accent` when it is a new personal best
- Unit below in `--caption` `--text2` ("pisos", "ms", "aciertos")
- Count-up over 450ms with the emphasis spring; reduced motion shows the final number

### Live panel
- `gem-panel` with `--edge: var(--live)`, wrapper `filter: var(--glow-live)`
- Top row: EN VIVO chip + game name in `--heading`
- Holds attempt dots, tu mejor marca and the Jugar button

### Ruleta facetada
- Octagonal wheel of 8 facets, alternating `--surface2` and `--surface3`, the four gem colors on four facets as accents
- Gold pointer on top, a cut triangle
- Spin: 3 to 4 turns, decelerate 2.4s, rebound 6deg past the winner, settle 320ms; the winning facet then gets the gold edge and the name appears in `--display`
- Reduced motion: no spin, the chosen game fades in

### Countdown
- Unbounded 700, 22px, tabular, `--text1`; turns `--error` in the last 5 seconds with a 1px scale pulse per second (none in reduced motion)

### Underdog badge
- Chip `--live-bg` + `--live` with the swords icon: "UNDERDOG · 4º intento"
