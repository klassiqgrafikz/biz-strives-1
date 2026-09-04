/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0a0f',
          surface: '#13131c',
          surface2: '#1c1c29',
          border: '#2a2a3a',
          text: '#e8e8ee',
          muted: '#9a9ab0',
          pink: '#ff2d78',
          lime: '#c6ff2e',
        },
      },
    },
  },
  plugins: [],
}