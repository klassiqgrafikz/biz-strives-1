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
          bg: '#f4f6fb',
          surface: '#ffffff',
          surface2: '#eef1f8',
          border: '#e2e7f0',
          text: '#0f172a',
          muted: '#62718f',
          pink: '#4169E6',
          pinkDark: '#3558cc',
          pinkSoft: '#eaf0fc',
          lime: '#16a34a',
          limeDark: '#15803d',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)',
        lift: '0 8px 24px rgba(65,105,230,.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}