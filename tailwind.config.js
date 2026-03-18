export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        card: {
          DEFAULT: 'var(--card-bg)',
          opaque: 'var(--card-bg-opaque)',
          hover: 'var(--card-hover)',
        },
        stroke: 'var(--stroke)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },
        success: {
          DEFAULT: 'var(--success)',
          muted: 'var(--success-muted)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          muted: 'var(--warn-muted)',
        },
        error: {
          DEFAULT: 'var(--error)',
          muted: 'var(--error-muted)',
        },
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-tertiary': 'var(--text-tertiary)',
        placeholder: 'var(--placeholder)',
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      fontSize: {
        headline: ['var(--text-headline)', { lineHeight: 'var(--leading-tight)' }],
        title: ['var(--text-title)', { lineHeight: 'var(--leading-tight)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-normal)' }],
        caption: ['var(--text-caption)', { lineHeight: 'var(--leading-normal)' }],
        small: ['var(--text-small)', { lineHeight: 'var(--leading-normal)' }],
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
      },
      borderRadius: {
        input: 'var(--radius-input)',
        card: 'var(--radius-card)',
        'card-lg': 'var(--radius-lg)',
        'card-xl': 'var(--radius-xl)',
        'card-2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        'glass-sm': 'var(--shadow-sm)',
        card: 'var(--shadow-card)',
        'glass-md': 'var(--shadow-md)',
        'glass-lg': 'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
      backdropBlur: {
        glass: 'var(--blur-glass)',
        'glass-sm': 'var(--blur-glass-sm)',
        'glass-lg': 'var(--blur-glass-lg)',
      },
      ringColor: {
        accent: 'var(--ring)',
      },
    },
  },
  plugins: [],
}
