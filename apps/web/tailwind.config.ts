import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },
      colors: {
        ink: {
          DEFAULT: '#111827',
          muted: '#4B5563',
          subtle: '#6B7280',
          faint: '#9CA3AF',
        },
        surface: {
          DEFAULT: '#F9FAFB',
          muted: '#F3F4F6',
          elevated: '#FFFFFF',
        },
        sidebar: {
          DEFAULT: '#FFFFFF',
          border: '#E5E7EB',
          muted: '#6B7280',
          active: '#EEF2FF',
        },
        accent: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          600: '#4F46E5',
          700: '#4338CA',
        },
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          600: '#4F46E5',
          700: '#4338CA',
        },
        success: {
          DEFAULT: '#059669',
          50: '#ECFDF5',
          700: '#047857',
        },
        danger: {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          700: '#B91C1C',
        },
        warning: {
          DEFAULT: '#D97706',
          50: '#FFFBEB',
          700: '#B45309',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong: '#D1D5DB',
          subtle: '#F3F4F6',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
