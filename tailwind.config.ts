import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#181b23',
          dark: '#0f1117',
          light: '#1f2330',
          hover: '#252a36',
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
