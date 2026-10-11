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
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#b9e0ff',
          300: '#89ccff',
          400: '#52aeff',
          500: '#2b8aff',
          600: '#1367f6',
          700: '#0d50e2',
          800: '#1142b6',
          900: '#143a8f',
          950: '#112557',
        }
      }
    },
  },
  plugins: [],
}
