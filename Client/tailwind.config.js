/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",   // Important
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
    colors: {
      primary: "#22C55E",
      darkBg: "#0B1220",
      cardBg: "#111827",
    },

    },
  },
  plugins: [],
};

