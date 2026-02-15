import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f0fa',
          100: '#ebe0f5',
          200: '#d4b8eb',
          300: '#b98ddb',
          400: '#9f68c9',
          500: '#854AAF',
          600: '#7340a0',
          700: '#5e3485',
          800: '#4a2969',
          900: '#371f4f',
        },
        accent: {
          50: '#fdf8e8',
          100: '#faefc5',
          200: '#f5df8a',
          300: '#eece50',
          400: '#e4bc20',
          500: '#D4A017',
          600: '#b88812',
          700: '#966d0e',
          800: '#75550b',
          900: '#5a4109',
        },
      },
    },
  },
  plugins: [],
};

export default config;
