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
          DEFAULT: '#E61919',
          dark: '#A80F0F',
          light: '#FF4A4A',
        },
        secondary: {
          DEFAULT: '#64748B',
          dark: '#475569',
          light: '#94A3B8',
        },
        success: '#147A46',
        warning: '#B55B00',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        display: ['Arial Black', 'Arial', 'Helvetica', 'sans-serif'],
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
