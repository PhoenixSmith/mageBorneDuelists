/** @type {import('tailwindcss').Config} */
export default {
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Paper: the surface everything is printed on ---------------------
        parchment: {
          50: '#fbf6ea',
          100: '#f3ead8',
          200: '#e8dcc3',
          300: '#d9c9a8',
          400: '#c4b18f',
          500: '#a8946f',
        },
        // --- Ink: text, rules, hand-drawn borders ---------------------------
        ink: {
          950: '#1c140e',
          900: '#2b201a',
          800: '#3d2f24',
          700: '#5a4634',
          600: '#6f5a45',
          // 4.7:1 on parchment-100 — the lightest ink allowed to carry text
          500: '#786351',
        },
        // --- Wood & leather: chrome, bars, frames ---------------------------
        wood: {
          900: '#2f1e12',
          800: '#3f2a1a',
          700: '#523622',
          600: '#6b4a2f',
          500: '#7d5a3a',
          400: '#96714c',
        },
        oxblood: {
          900: '#3f1712',
          800: '#54201a',
          700: '#7a3b2e',
          600: '#8f4a3a',
          500: '#a45a48',
        },
        // --- Antique brass: highlights, active state, the player -------------
        brass: {
          900: '#6b4c07',
          800: '#8a6209',
          700: '#b8860b',
          600: '#c9a227',
          500: '#d8b64d',
          400: '#e7d089',
          300: '#f0e2b4',
        },
        // --- Night: the dark oak table the almanac rests on ------------------
        night: {
          900: '#120d09',
          800: '#1a1410',
          700: '#241c14',
          600: '#31261c',
        },
        // --- Elements (warmed) ----------------------------------------------
        ember: { DEFAULT: '#c0392b', deep: '#8b2418', wash: '#f2dfd6' },
        tide: { DEFAULT: '#2e6f8e', deep: '#1d4a61', wash: '#dbe7ec' },
        gale: { DEFAULT: '#4a9ebf', deep: '#2c6c86', wash: '#dcecf1' },
        loam: { DEFAULT: '#7a5c2e', deep: '#523c1c', wash: '#eae0c8' },
        // --- Hybrid schools (blended hues) ----------------------------------
        magma: { DEFAULT: '#a8511e', deep: '#743310', wash: '#f0e0cf' },
        levin: { DEFAULT: '#c08a1e', deep: '#8a5f0d', wash: '#f2e7c9' },
        vapor: { DEFAULT: '#7c8b90', deep: '#54606a', wash: '#e2e7e7' },
        tempest: { DEFAULT: '#5a5f9e', deep: '#3a3d70', wash: '#e1e1ef' },
        // --- Verdigris: success / quills / seals ------------------------------
        moss: { DEFAULT: '#4e7a45', deep: '#31512c', wash: '#dfe8d8' },
      },
      fontFamily: {
        display: ["'Iowan Old Style'", "'Palatino Linotype'", 'Palatino', "'Book Antiqua'", 'Georgia', 'serif'],
        body: ['Optima', 'Candara', "'Segoe UI'", "'Avenir Next'", "'Trebuchet MS'", 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // 11px floor — nothing smaller ships
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }],
      },
      borderRadius: {
        seal: '9999px',
      },
      boxShadow: {
        // A printed almanac page: white fiber highlight, inked hairline, cast shadow
        page: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 24px rgba(140,110,70,0.16), 0 6px 16px -8px rgba(0,0,0,0.75)',
        // A small pasted card
        card: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 5px -2px rgba(0,0,0,0.55)',
        // Carved wood / brass chrome
        carved: 'inset 0 1px 0 rgba(255,222,175,0.22), inset 0 -2px 4px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.6)',
        pressed: 'inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,222,175,0.12)',
        // Wax seal: domed
        seal: 'inset 0 2px 3px rgba(255,255,255,0.32), inset 0 -3px 5px rgba(0,0,0,0.38), 0 2px 4px -1px rgba(0,0,0,0.55)',
        // Brass glow for the current / active thing
        gilt: '0 0 0 2px rgba(201,162,39,0.55), 0 0 14px -2px rgba(216,182,77,0.7)',
      },
    },
  },
  plugins: [],
}
