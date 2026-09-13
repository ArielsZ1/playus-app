/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#14102A',
        panel: '#1E1840',
        panel2: '#251D4D',
        line: '#3A3168',
        ink: '#F1EDFF',
        muted: '#9C93C0',
        gold: '#E8B54D',
        ruby: '#D14E5A',
        emerald: '#3FAE7A',
        sapphire: '#4E7FE8',
      },
      fontFamily: {
        display: ['"Unbounded"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      clipPath: {
        gem: 'polygon(12% 0%, 88% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%)',
      },
    },
  },
  plugins: [],
}
