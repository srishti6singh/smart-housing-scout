/** Design tokens: Zillow's structure, Airbnb's finish. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Type scale 12 / 14 / 16 / 20 / 28 / 40
    fontSize: {
      xs: ['12px', { lineHeight: '1.5' }],
      sm: ['14px', { lineHeight: '1.5' }],
      base: ['16px', { lineHeight: '1.5' }],
      lg: ['20px', { lineHeight: '1.4' }],
      xl: ['28px', { lineHeight: '1.4' }],
      '2xl': ['40px', { lineHeight: '1.4' }],
    },
    extend: {
      colors: {
        mist: '#F6F8FA',
        midnight: { DEFAULT: '#0B1B2B', 800: '#13283D', 700: '#1C3650', 600: '#2A4866' },
        hairline: '#E3E8EE',
        ink: { DEFAULT: '#0B1B2B', muted: '#4A5A6B', faint: '#6B7A8A' },
        scout: { DEFAULT: '#0E9F6E', dark: '#0B7F58', soft: '#E6F6F0' },
        amber: { DEFAULT: '#F5A524', dark: '#8A5A00', soft: '#FEF4E2' },
        mismatch: { DEFAULT: '#E5484D', dark: '#B42328', soft: '#FDECEC' },
        transit: { DEFAULT: '#2F6FED', dark: '#1F55C4', soft: '#EAF1FE' },
        // Journey Bar segments
        seg: {
          walk: '#0B7F7F',
          wait: '#F5A524',
          ride: '#2F6FED',
          final: '#8DDDD5',
          early: '#C3CCD6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        input: '12px',
        card: '20px',
        img: '16px',
      },
      boxShadow: {
        lift: '0 1px 2px rgba(11,27,43,0.06), 0 8px 24px rgba(11,27,43,0.10)',
        float: '0 2px 6px rgba(11,27,43,0.08), 0 16px 40px rgba(11,27,43,0.16)',
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        grow: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.3)' }, '100%': { transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
      },
      animation: {
        grow: 'grow 600ms cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop 320ms ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
        sheet: 'sheet 240ms ease-out both',
      },
    },
  },
  plugins: [],
};
