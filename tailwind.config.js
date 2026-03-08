/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand fuchsia — anchored on #CE21FB at 500
        primary: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f3c6fe',
          300: '#e98ffc',
          400: '#db58fb',
          500: '#CE21FB',
          600: '#a518cb',
          700: '#8312a0',
          800: '#640d7a',
          900: '#470957',
          950: '#2a0535',
        },
        // Warm gold — stars, achievements, leaderboard highlights
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50:  '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
