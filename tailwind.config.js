/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#1A6B3C',
          'green-light': '#22C55E',
          'green-glow': 'rgba(26,107,60,0.4)',
          orange: '#E67E22',
          'orange-light': '#F39C12',
          'orange-glow': 'rgba(230,126,34,0.35)',
        },
        dark: {
          bg: '#060608',
          surface: '#0d0d10',
          card: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.07)',
          muted: '#334155',
        },
        // Extended palette
        slate: {
          850: '#0f172a',
          925: '#080d1a',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #1A6B3C, #22C55E, #E67E22)',
        'gradient-green': 'linear-gradient(135deg, #1A6B3C, #16a34a)',
        'gradient-orange': 'linear-gradient(135deg, #E67E22, #F39C12)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        'shimmer': 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fade-up 0.4s ease both',
        'fade-in': 'fade-in 0.3s ease both',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.8s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'dot-pulse': 'dot-pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in-left 0.3s ease both',
        'working': 'working-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(26,107,60,0.4)' },
          '50%':       { boxShadow: '0 0 20px rgba(26,107,60,0.4), 0 0 40px rgba(26,107,60,0.2)' },
        },
        'dot-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.5', transform: 'scale(0.85)' },
        },
        'working-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.45' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(26,107,60,0.4)',
        'orange-glow': '0 0 20px rgba(230,126,34,0.35)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
}
