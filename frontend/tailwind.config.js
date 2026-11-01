/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background, #FAF7F2)',
        surface: 'var(--surface, #FFFFFF)',
        border: 'var(--border, #E7E1D6)',
        ink: {
          DEFAULT: 'var(--primary, #1B2A4A)',
          dark: 'var(--primary-dark, #14203A)',
          foreground: 'var(--primary-foreground, #FFFFFF)',
        },
        primary: {
          DEFAULT: 'var(--primary, #1B2A4A)',
          foreground: 'var(--primary-foreground, #FFFFFF)',
        },
        accent: {
          DEFAULT: 'var(--accent, #0F9FA8)',
          soft: 'var(--accent-soft, #E3F4F5)',
        },
        muted: {
          DEFAULT: 'var(--text-muted, #6B7280)',
        },
        status: {
          attained: 'var(--status-attained, #059669)',
          borderline: 'var(--status-borderline, #D97706)',
          below: 'var(--status-below, #E11D48)',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(27, 42, 74, 0.04), 0 1px 3px -1px rgba(27, 42, 74, 0.02)',
      },
    },
  },
  plugins: [],
};
