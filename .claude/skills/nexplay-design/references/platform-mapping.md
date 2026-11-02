# nexplay: Platform Mapping

The real target is section 3 (React + Tailwind in the Playus repo). Sections 1 and 2 are kept for completeness.

## 1. HTML / CSS / WEB

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
```

### CSS Custom Properties: Primary Mode (dark)

```css
:root {
  /* Colors */
  --background: #14102A;
  --bg: var(--background);
  --surface1: #1E1840;
  --surface2: #251D4D;
  --surface3: #2E2560;
  --border: #3A3168;
  --border-visible: #4A3F82;
  --text1: #F1EDFF;
  --text2: #B3ABD6;
  --text3: #8C84B3;
  --text4: #6A6296;
  --accent: #E8B54D;
  --accent-subtle: #2B2018;
  --on-accent: #14102A;
  --live: #4E7FE8;
  --live-bg: #172A55;
  --success: #3FAE7A;
  --success-bg: #12352A;
  --warning: #F2994A;
  --warning-bg: #4A2A12;
  --error: #E8636F;
  --error-bg: #4A1C26;

  /* Fonts */
  --font-display: "Unbounded", system-ui, sans-serif;
  --font-body: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;

  /* Type Scale */
  --text-display: 32px;
  --text-score: 56px;
  --text-heading: 22px;
  --text-subheading: 16px;
  --text-body: 15px;
  --text-body-sm: 13px;
  --text-caption: 12px;
  --text-label: 11px;

  /* Spacing */
  --space-2xs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;

  /* Radii + gem cuts */
  --radius-cards: 0px;
  --radius-buttons: 0px;
  --radius-buttons-sm: 0px;
  --radius-inputs: 0px;
  --radius-tags: 0px;
  --radius-modals: 0px;
  --radius-pill: 999px;
  --cut-sm: 8px;
  --cut-lg: 14px;

  /* Motion */
  --ease-fast: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-medium: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-slow: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 140ms;
  --duration-medium: 320ms;
  --duration-slow: 450ms;

  /* Shadows (only on unclipped wrappers) + glows */
  --shadow-1: none;
  --shadow-2: 0 12px 32px rgba(8, 6, 20, 0.55);
  --shadow-3: 0 24px 64px rgba(8, 6, 20, 0.70);
  --glow-live: drop-shadow(0 0 14px rgba(78, 127, 232, 0.45));
  --glow-gold: drop-shadow(0 0 16px rgba(232, 181, 77, 0.45));
}

/* The gem cut, same recipe as Playus gem-panel */
.gem {
  --cut: var(--cut-lg);
  --edge: var(--border);
  --fill: var(--surface1);
  clip-path: polygon(0 var(--cut), var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
  border: 1px solid var(--edge);
  background:
    linear-gradient(to bottom right, transparent calc(50% - 1px), var(--edge) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) left top / var(--cut) var(--cut) no-repeat border-box,
    linear-gradient(to bottom right, transparent calc(50% - 1px), var(--edge) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) right bottom / var(--cut) var(--cut) no-repeat border-box,
    var(--fill);
}
/* clip-path also clips outline: focus goes inside the cut */
.gem:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--accent); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 120ms !important; transition-property: opacity, color, background-color, border-color !important; }
}
```

### Secondary Mode (light, previews only)

```css
@media (prefers-color-scheme: light) {
  :root[data-preview-light] {
    --background: #F7F5FF;
    --bg: var(--background);
    --surface1: #FFFFFF;
    --surface2: #F1EDFF;
    --surface3: #D9D3F2;
    --border: #D9D3F2;
    --border-visible: #B3ABD6;
    --text1: #14102A;
    --text2: #4A3F82;
    --text3: #6A6296;
    --text4: #8C84B3;
    --accent: #A47524;
    --accent-subtle: #FDF7E8;
    --on-accent: #FFFFFF;
    --live: #4E7FE8;
    --live-bg: #EEF3FE;
    --success: #3FAE7A;
    --success-bg: #ECF8F2;
    --warning: #F2994A;
    --warning-bg: #FEF4EA;
    --error: #E8636F;
    --error-bg: #FDEEEF;
    --shadow-1: none;
    --shadow-2: 0 12px 32px rgba(20, 16, 42, 0.12);
    --shadow-3: 0 24px 64px rgba(20, 16, 42, 0.18);
  }
}

/* Class-based toggle alternative */
.theme-light {
  --background: #F7F5FF;
  --bg: var(--background);
  --surface1: #FFFFFF;
  --surface2: #F1EDFF;
  --surface3: #D9D3F2;
  --border: #D9D3F2;
  --border-visible: #B3ABD6;
  --text1: #14102A;
  --text2: #4A3F82;
  --text3: #6A6296;
  --text4: #8C84B3;
  --accent: #A47524;
  --accent-subtle: #FDF7E8;
  --on-accent: #FFFFFF;
  --live: #4E7FE8;
  --live-bg: #EEF3FE;
  --success: #3FAE7A;
  --success-bg: #ECF8F2;
  --warning: #F2994A;
  --warning-bg: #FEF4EA;
  --error: #E8636F;
  --error-bg: #FDEEEF;
  --shadow-1: none;
  --shadow-2: 0 12px 32px rgba(20, 16, 42, 0.12);
  --shadow-3: 0 24px 64px rgba(20, 16, 42, 0.18);
}
```

---

## 2. SWIFTUI / iOS

### Font Registration

Not a target today. If it ever is: bundle Unbounded, Inter and IBM Plex Mono `.ttf` files, list them under `UIAppFonts` in Info.plist and use `Font.custom`.

### Color Extension

```swift
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

extension Color {
    static let nxBackground = Color(hex: "14102A")
    static let nxSurface1 = Color(hex: "1E1840")
    static let nxSurface2 = Color(hex: "251D4D")
    static let nxSurface3 = Color(hex: "2E2560")
    static let nxBorder = Color(hex: "3A3168")
    static let nxBorderVisible = Color(hex: "4A3F82")
    static let nxText1 = Color(hex: "F1EDFF")
    static let nxText2 = Color(hex: "B3ABD6")
    static let nxText3 = Color(hex: "8C84B3")
    static let nxText4 = Color(hex: "6A6296")
    static let nxAccent = Color(hex: "E8B54D")
    static let nxAccentSubtle = Color(hex: "2B2018")
    static let nxLive = Color(hex: "4E7FE8")
    static let nxSuccess = Color(hex: "3FAE7A")
    static let nxWarning = Color(hex: "F2994A")
    static let nxError = Color(hex: "E8636F")
}
```

### Font Extension

```swift
extension Font {
    static func nxDisplay(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .custom("Unbounded", size: size).weight(weight)
    }
    static func nxBody(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Inter", size: size).weight(weight)
    }
    static func nxMono(_ size: CGFloat, weight: Font.Weight = .medium) -> Font {
        .custom("IBM Plex Mono", size: size).weight(weight)
    }

    static let nxDisplayLarge = nxDisplay(32, weight: .bold)
    static let nxScore = nxDisplay(56, weight: .black)
    static let nxHeading = nxDisplay(22, weight: .bold)
    static let nxSubheading = nxDisplay(16, weight: .medium)
    static let nxBodyText = nxBody(15)
    static let nxBodySmall = nxBody(13)
    static let nxCaption = nxBody(12, weight: .medium)
    static let nxLabel = nxBody(11, weight: .semibold)
    static let nxCode = nxMono(13)
}
```

### Spacing & Radius Constants

```swift
enum NXSpacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
    static let xxxl: CGFloat = 64
    static let xxxxl: CGFloat = 96
}

enum NXRadius {
    static let cards: CGFloat = 0
    static let cardsFeatured: CGFloat = 0
    static let buttons: CGFloat = 0
    static let buttonsSmall: CGFloat = 0
    static let inputs: CGFloat = 0
    static let tags: CGFloat = 0
    static let modals: CGFloat = 0
    static let cutSmall: CGFloat = 8
    static let cutLarge: CGFloat = 14
}
```

### Dark/Light Mode

NEXPLAY is dark only. Force `.preferredColorScheme(.dark)` at the root. Build the gem cut with a custom `Shape` that draws the 6-point polygon.

---

## 3. REACT / TAILWIND (the Playus repo)

The repo already defines `base`, `panel`, `panel2`, `line`, `ink`, `muted`, `gold`, `ruby`, `emerald`, `sapphire` and the fonts `display` and `body`. **Keep those names** (Playus pages use them) and extend with what NEXPLAY adds. Do not add the CSS-variable layer below to the Playus tailwind config unless NEXPLAY needs the light preview, which it does not.

### tailwind.config.js (extend the existing file)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './nexplay/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#14102A',
        panel: '#1E1840',
        panel2: '#251D4D',
        panel3: '#2E2560',
        line: '#3A3168',
        line2: '#4A3F82',
        ink: '#F1EDFF',
        muted: '#B3ABD6',
        faint: '#8C84B3',
        ghost: '#6A6296',
        gold: '#E8B54D',
        ruby: '#E8636F',
        emerald: '#3FAE7A',
        sapphire: '#4E7FE8',
        amber: '#F2994A',
        'gold-subtle': '#2B2018',
        'live-bg': '#172A55',
        'success-bg': '#12352A',
        'warning-bg': '#4A2A12',
        'error-bg': '#4A1C26',
      },
      fontFamily: {
        display: ['"Unbounded"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        score: ['56px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        heading: ['22px', { lineHeight: '1.2', letterSpacing: '-0.005em' }],
        subheading: ['16px', { lineHeight: '1.3', letterSpacing: '0' }],
        body: ['15px', { lineHeight: '1.5', letterSpacing: '0' }],
        'body-sm': ['13px', { lineHeight: '1.45', letterSpacing: '0' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        label: ['11px', { lineHeight: '1.2', letterSpacing: '0.08em' }],
      },
      spacing: {
        '2xs': '2px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },
      borderRadius: {
        cards: '0px',
        buttons: '0px',
        'buttons-sm': '0px',
        inputs: '0px',
        tags: '0px',
        modals: '0px',
      },
      transitionTimingFunction: {
        fast: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        medium: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        slow: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        fast: '140ms',
        medium: '320ms',
        slow: '450ms',
      },
      boxShadow: {
        1: 'none',
        2: '0 12px 32px rgba(8, 6, 20, 0.55)',
        3: '0 24px 64px rgba(8, 6, 20, 0.70)',
      },
      dropShadow: {
        live: '0 0 14px rgba(78, 127, 232, 0.45)',
        gold: '0 0 16px rgba(232, 181, 77, 0.45)',
      },
    },
  },
  plugins: [],
}
```

Careful: overriding `spacing.sm/md/lg/xl` changes `p-sm`-style classes only; Tailwind's numeric scale (`p-4`) is untouched, so existing Playus pages keep working. Check with `npm run build` after editing.

### Component classes (src/index.css, next to gem-panel)

```css
@layer components {
  .gem-panel-live { --edge: theme('colors.sapphire'); }
  .nx-btn {
    --cut: 8px;
    clip-path: polygon(0 var(--cut), var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
    @apply inline-flex items-center justify-center gap-sm min-h-[48px] px-lg font-semibold transition duration-fast ease-fast;
  }
  .nx-btn:active { transform: translateY(2px) scale(0.98); }
  .nx-btn-primary { @apply nx-btn h-14 bg-gold text-[#14102A] font-display font-bold uppercase tracking-wide hover:bg-[#EDC163]; }
  .nx-btn-secondary { @apply nx-btn bg-panel2 text-ink border border-line2 hover:bg-panel3; }
  .nx-num { font-variant-numeric: tabular-nums; }
}
```

### Font Loading

Load via the Google Fonts `<link>` in `nexplay/index.html` (Section 1). Do not add `@fontsource` packages: the repo already loads Unbounded and Inter from Google Fonts in `index.html`, keep one mechanism.

### CSS Variables

Not needed in the app: Tailwind classes map straight to the hex values above, like the rest of Playus. The `:root` block in Section 1 is for the standalone previews.
