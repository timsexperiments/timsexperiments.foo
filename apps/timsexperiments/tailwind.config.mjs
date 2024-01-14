/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#E4FCF7',
          100: '#C9F8EF',
          200: '#92F1DE',
          300: '#5CEBCE',
          400: '#25E4BE',
          500: '#17B897',
          600: '#129178',
          700: '#0E6D5A',
          800: '#09493C',
          900: '#05241E',
          950: '#02120F',
        },
        rhino: {
          50: '#FAFAFA',
          100: '#F4F5F5',
          200: '#E7E9E8',
          300: '#D5D7D6',
          400: '#A3A8A6',
          500: '#727976',
          600: '#545A58',
          700: '#434746',
          800: '#2A2D2C',
          900: '#1B1D1C',
          950: '#0A0B0A',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
