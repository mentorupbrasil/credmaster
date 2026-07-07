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
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      colors: {
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          subtle: '#94A3B8',
          faint: '#CBD5E1',
        },
        surface: {
          DEFAULT: '#F6F8FC',
          muted: '#EEF2F8',
          elevated: '#FFFFFF',
        },
        sidebar: {
          DEFAULT: '#030712',
          elevated: '#0A0F1C',
          border: 'rgba(255,255,255,0.06)',
          muted: 'rgba(255,255,255,0.45)',
        },
        accent: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          glow: 'rgba(99, 102, 241, 0.35)',
        },
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
        },
        success: {
          DEFAULT: '#059669',
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#059669',
          700: '#047857',
        },
        danger: {
          DEFAULT: '#E11D48',
          50: '#FFF1F2',
          100: '#FFE4E6',
          600: '#E11D48',
          700: '#BE123C',
        },
        warning: {
          DEFAULT: '#D97706',
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#D97706',
          700: '#B45309',
        },
        border: {
          DEFAULT: 'rgba(15, 23, 42, 0.08)',
          strong: 'rgba(15, 23, 42, 0.12)',
          subtle: 'rgba(15, 23, 42, 0.04)',
        },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
        card: '0 0 0 1px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.02), 0 12px 32px -12px rgba(15, 23, 42, 0.12)',
        'card-hover':
          '0 0 0 1px rgba(15, 23, 42, 0.06), 0 4px 8px rgba(15, 23, 42, 0.04), 0 24px 48px -16px rgba(15, 23, 42, 0.16)',
        glow: '0 0 0 1px rgba(99, 102, 241, 0.12), 0 8px 32px -8px rgba(99, 102, 241, 0.35)',
        'glow-sm': '0 0 20px -4px rgba(99, 102, 241, 0.25)',
        sidebar: 'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 40px -8px rgba(0,0,0,0.45)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 0% 0%, rgba(99,102,241,0.06) 0, transparent 50%), radial-gradient(at 100% 0%, rgba(16,185,129,0.04) 0, transparent 45%), radial-gradient(at 50% 100%, rgba(99,102,241,0.04) 0, transparent 50%)',
        'mesh-sidebar':
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.18) 0, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(79,70,229,0.08) 0, transparent 50%)',
        'btn-primary': 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
