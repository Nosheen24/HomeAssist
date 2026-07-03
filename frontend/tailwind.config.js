/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'ha-bg':            '#F8F5F1',
        'ha-surface':       '#FFFFFF',
        'ha-surface-2':     '#F0EAE3',
        'ha-border':        '#E8DDD5',
        'ha-border-2':      '#D4C9BF',
        'ha-primary':       '#16A34A',
        'ha-primary-hover': '#15803D',
        'ha-accent':        '#F5A623',
        'ha-teal':          '#0D9488',
        'ha-text-1':        '#1A110A',
        'ha-text-2':        '#4A3D35',
        'ha-text-3':        '#8A7A6E',
        'ha-danger':        '#EF4444',
        // Premium dark design system
        'dk-bg':     '#050813',
        'dk-card':   '#0C1222',
        'dk-card-2': '#111827',
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card':       '0 1px 4px 0 rgba(26,17,10,0.07), 0 1px 2px -1px rgba(26,17,10,0.05)',
        'card-hover': '0 8px 24px -4px rgba(26,17,10,0.12), 0 2px 8px -2px rgba(26,17,10,0.06)',
        'float':      '0 20px 40px -8px rgba(26,17,10,0.15)',
      },
      animation: {
        'float':       'float 8s ease-in-out infinite',
        'pulse-ring':  'pulse-ring 2s ease-out infinite',
        'toast-in':    'toast-in 0.25s ease-out',
        'fade-page':   'fade-page 0.15s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(0.85)', opacity: '1' },
          '100%': { transform: 'scale(1.5)',  opacity: '0' },
        },
        'toast-in': {
          '0%':   { transform: 'translateX(110%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        'fade-page': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
