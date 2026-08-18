/** @type {import('tailwindcss').Config} */
export default {
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fire: { 50: '#fff7ed', 500: '#ef4444', 900: '#7f1d1d' },
        water: { 50: '#f0f9ff', 500: '#3b82f6', 900: '#1e3a5f' },
        wind: { 50: '#f0fdf4', 500: '#22c55e', 900: '#14532d' },
        earth: { 50: '#fafaf9', 500: '#a16207', 900: '#451a03' },
      },
    },
  },
  plugins: [],
}
