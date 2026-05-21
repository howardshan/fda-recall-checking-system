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
        // Surfaces
        surface: {
          DEFAULT: '#f4faff',
          dim: '#c0dfee',
          bright: '#f4faff',
          'container-lowest': '#ffffff',
          'container-low': '#e6f6ff',
          container: '#d9f2ff',
          'container-high': '#ceedfd',
          'container-highest': '#c9e7f7',
          variant: '#c9e7f7',
          tint: '#29695b',
        },
        'on-surface': {
          DEFAULT: '#001f2a',
          variant: '#3f4945',
        },
        'inverse-surface': '#163440',
        'inverse-on-surface': '#e0f4ff',
        outline: {
          DEFAULT: '#707975',
          variant: '#bfc9c4',
        },
        // Primary — deep teal authority
        primary: {
          DEFAULT: '#00342b',
          container: '#004d40',
          fixed: '#afefdd',
          'fixed-dim': '#94d3c1',
          inverse: '#94d3c1',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#7ebdac',
          fixed: '#00201a',
          'fixed-variant': '#065043',
        },
        // Secondary — warm coral CTA
        secondary: {
          DEFAULT: '#a43c12',
          container: '#fe7e4f',
          fixed: '#ffdbcf',
          'fixed-dim': '#ffb59c',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#6b1f00',
          fixed: '#380c00',
          'fixed-variant': '#822800',
        },
        // Tertiary — neutral charcoal
        tertiary: {
          DEFAULT: '#2e2e29',
          container: '#44443f',
          fixed: '#e5e2db',
          'fixed-dim': '#c9c6c0',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#b3b1ab',
          fixed: '#1c1c18',
          'fixed-variant': '#474742',
        },
        // Error — Class I crimson
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        background: '#f4faff',
        'on-background': '#001f2a',
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
