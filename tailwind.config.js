/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './nexplay/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#14102A',
        panel: '#1E1840',
        panel2: '#251D4D',
        line: '#3A3168',
        ink: '#F1EDFF',
        muted: '#B3ABD6',
        gold: '#E8B54D',
        ruby: '#E8636F',
        emerald: '#3FAE7A',
        sapphire: '#4E7FE8',
        // NEXPLAY (skill nexplay-design): solo claves nuevas, Playus no cambia
        panel3: '#2E2560',
        line2: '#4A3F82',
        faint: '#8C84B3',
        ghost: '#6A6296',
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
        heading: ['22px', { lineHeight: '1.2', letterSpacing: '-0.005em' }],
        body: ['15px', { lineHeight: '1.5' }],
        'body-sm': ['13px', { lineHeight: '1.45' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
      },
      clipPath: {
        gem: 'polygon(12% 0%, 88% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%)',
      },
    },
  },
  plugins: [],
}
