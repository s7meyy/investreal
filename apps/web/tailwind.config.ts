import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-arabic)', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0f1720',
        paper: '#f7f8fa',
        brand: { DEFAULT: '#0d7d6b', dark: '#0a5f52', light: '#e6f3f0' },
        warn: '#b45309',
        danger: '#b42318',
        ok: '#0d7d6b',
      },
    },
  },
  plugins: [],
} satisfies Config;
