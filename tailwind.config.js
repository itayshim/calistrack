/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080b0d',
        panel: '#111619',
        elevated: '#171e22',
        line: '#263035',
        brand: '#b7f36b',
        accent: '#ffb454',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(0,0,0,.28)',
        glow: '0 0 0 1px rgba(183,243,107,.18), 0 18px 50px rgba(183,243,107,.08)',
      },
      borderRadius: { '3xl': '1.75rem', '4xl': '2.25rem' },
    },
  },
  plugins: [],
};
