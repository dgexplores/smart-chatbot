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
          DEFAULT: '#7047F5',
          dark: '#4D2FC1',
          light: '#9E83FF',
        },
        secondary: {
          DEFAULT: '#64748B',
          dark: '#475569',
          light: '#94A3B8',
        },
        success: '#38D7B4',
        warning: '#F8D447',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
