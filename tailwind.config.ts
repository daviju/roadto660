import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'th-bg': 'var(--bg-main)',
        'th-card': 'var(--bg-card)',
        'th-input': 'var(--bg-input)',
        'th-hover': 'var(--bg-hover)',
        'th-hover-subtle': 'var(--bg-hover-subtle)',
        'th-text': 'var(--text-primary)',
        'th-secondary': 'var(--text-secondary)',
        'th-muted': 'var(--text-muted)',
        'th-faint': 'var(--text-faint)',
        'th-border': 'var(--border-color)',
        'th-border-strong': 'var(--border-strong)',
        surface: {
          DEFAULT: 'var(--bg-card)',
          dark: 'var(--bg-input)',
          light: 'var(--bg-card-light)',
          hover: 'var(--bg-hover)',
        },
        accent: {
          green: '#34d399',
          red: '#f87171',
          amber: '#fbbf24',
          purple: '#a78bfa',
          orange: '#fb923c',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config
