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
      colors: {
        brand: {
          green: '#1A6B3C',
          'green-light': '#22893E',
          orange: '#E67E22',
          'orange-light': '#F39C12',
        },
        dark: {
          bg: '#0A0A0A',
          surface: '#111111',
          card: '#1A1A1A',
          border: '#2A2A2A',
          muted: '#3A3A3A',
        }
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
