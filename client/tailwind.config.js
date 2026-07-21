/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C3CF0',
          dark: '#4C22B6',
          light: '#9A7CFF',
        },
        secondary: {
          DEFAULT: '#64748B',
          dark: '#475569',
          light: '#94A3B8',
        },
        success: '#20BF8F',
        warning: '#F3C928',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
    },
  },
  plugins: [],
}
