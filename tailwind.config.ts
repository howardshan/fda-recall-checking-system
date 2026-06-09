import type { Config } from "tailwindcss";

// Design tokens from stitch_fda_notification_monitor/clinical_clarity/DESIGN.md
// — a Material 3 "warm clinical" palette with Merriweather (display) +
// Fira Sans (body) typography. Deep teal authority, warm coral CTA, and
// three-tier severity colors (Class I crimson / II amber / III slate).

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Merriweather', 'Georgia', 'serif'],
        sans: ['"Fira Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '60px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-md': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-sm': ['22px', { lineHeight: '30px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      colors: {
        // Surfaces — teal-50 tinted background
        surface: {
          DEFAULT: '#f0fdfa',
          dim: '#ccfbf1',
          bright: '#f0fdfa',
          'container-lowest': '#ffffff',
          'container-low': '#f0fdfa',
          container: '#ccfbf1',
          'container-high': '#99f6e4',
          'container-highest': '#5eead4',
          variant: '#ccfbf1',
          tint: '#0d9488',
        },
        'on-surface': {
          DEFAULT: '#0f172a',
          variant: '#475569',
        },
        'inverse-surface': '#0f172a',
        'inverse-on-surface': '#f0fdfa',
        outline: {
          DEFAULT: '#5eead4',
          variant: '#ccfbf1',
        },
        // Primary — brand teal (#0D9488)
        primary: {
          DEFAULT: '#0d9488',
          container: '#0f766e',
          fixed: '#ccfbf1',
          'fixed-dim': '#99f6e4',
          inverse: '#2dd4bf',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#ccfbf1',
          fixed: '#134e4a',
          'fixed-variant': '#115e59',
        },
        // Secondary — CTA orange (#F97316)
        secondary: {
          DEFAULT: '#f97316',
          container: '#ea580c',
          fixed: '#ffedd5',
          'fixed-dim': '#fed7aa',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#ffffff',
          fixed: '#7c2d12',
          'fixed-variant': '#9a3412',
        },
        // Tertiary — slate neutrals
        tertiary: {
          DEFAULT: '#334155',
          container: '#475569',
          fixed: '#e2e8f0',
          'fixed-dim': '#cbd5e1',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#cbd5e1',
          fixed: '#0f172a',
          'fixed-variant': '#334155',
        },
        // Error — Class I crimson (unchanged)
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        background: '#f0fdfa',
        'on-background': '#0f172a',
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '48px',
      },
      maxWidth: {
        container: '1120px',
      },
    },
  },
  plugins: [],
};

export default config;
