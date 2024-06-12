/**
 * Sets up keyframes for the slide animation.
 *
 * @param {{direction: 'forwards' | 'backwards', axis: 'x' | 'y' } | undefined} options
 */
const slideAnimationKeyframes = (options) => {
  const { direction = 'forwards', axis = 'x' } = options ?? {};
  const tranlationAxis = axis === 'x' ? 'translateX' : 'translateY';
  return {
    '30%, 100%': {
      opacity: 0,
      transform: `${tranlationAxis}(calc(${direction === 'forwards' ? 1 : -1}% * var(--animate-slide-start)))`,
    },
    '0%': {
      opacity: 0,
      transform: `${tranlationAxis}(calc(${direction === 'forwards' ? -1 : 1}% * var(--animate-slide-end)))`,
    },
    '10%': {
      opacity: 1,
    },
  };
};

/** @type {import('tailwindcss').Config} */
export default {
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
      fontFamily: {
        display: [
          'Urbanist',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
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
        slide: slideAnimationKeyframes(),
        'slide-reverse': slideAnimationKeyframes({ direction: 'backwards' }),
        'slide-up': slideAnimationKeyframes({
          direction: 'backwards',
          axis: 'y',
        }),
        'slide-down': slideAnimationKeyframes({
          axis: 'y',
        }),
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        slide: 'slide 3s ease-in-out',
        'slide-reverse': 'slide-reverse 3s ease-in-out',
        'slide-up': 'slide-up 3s ease-in-out',
        'slide-down': 'slide-down 3s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
