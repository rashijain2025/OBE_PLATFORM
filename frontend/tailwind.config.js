/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Surfaces */
        background: 'var(--background, #FAF7F2)',
        surface: 'var(--surface, #FFFFFF)',
        border: 'var(--border, #E7E1D6)',

        /* Primary — Navy */
        ink: {
          DEFAULT: 'var(--primary, #1B2A4A)',
          dark: 'var(--primary-dark, #14203A)',
          foreground: 'var(--primary-foreground, #FFFFFF)',
        },
        primary: {
          DEFAULT: 'var(--primary, #1B2A4A)',
          foreground: 'var(--primary-foreground, #FFFFFF)',
        },

        /* Accent — Teal */
        accent: {
          DEFAULT: 'var(--accent, #0F9FA8)',
          soft: 'var(--accent-soft, #E3F4F5)',
        },

        /* Text */
        muted: {
          DEFAULT: 'var(--text-muted, #6B7280)',
        },

        /* Status colours (results only, never brand) */
        status: {
          attained: 'var(--status-attained, #059669)',
          'attained-soft': 'var(--status-attained-soft, #ECFDF5)',
          borderline: 'var(--status-borderline, #D97706)',
          'borderline-soft': 'var(--status-borderline-soft, #FFFBEB)',
          below: 'var(--status-below, #E11D48)',
          'below-soft': 'var(--status-below-soft, #FFF1F2)',
        },

        /* Chart palette */
        chart: {
          1: 'var(--chart-1, #1B2A4A)',
          2: 'var(--chart-2, #0F9FA8)',
          3: 'var(--chart-3, #6366F1)',
          4: 'var(--chart-4, #94A3B8)',
          target: 'var(--chart-target, #E11D48)',
        },
      },

      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      borderRadius: {
        '2xl': '1rem',
      },

      boxShadow: {
        soft: '0 2px 10px -2px rgba(27, 42, 74, 0.04), 0 1px 3px -1px rgba(27, 42, 74, 0.02)',
        card: '0 2px 10px -2px rgba(27, 42, 74, 0.04), 0 1px 3px -1px rgba(27, 42, 74, 0.02)',
      },

      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
