/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        /**
         * TELEBA DESIGN SYSTEM
         * ====================
         * Primary: Bright Blue #1E6091 - Trust, stability, banking (lighter & brighter)
         * Secondary: Teal/Cyan #1CB5BD - Connectivity, data flow, modern fintech
         * Accent: Soft Gold #F2C94C - Value, money, success (used sparingly)
         * Terracotta: #D97706 - Warmth, urgency, reddish-gold highlights
         * Dark Neutral: #0F172A (slate/almost black)
         * Light Neutral: #F8FAFC (clean white)
         */
        brand: {
          // Primary - Vibrant Blue (trust, stability) - Much brighter!
          primary: "#2563EB",
          "primary-light": "#3B82F6",
          "primary-dark": "#1D4ED8",

          // Secondary - Teal (connectivity, fintech)
          secondary: "#1CB5BD",
          "secondary-light": "#4DD4DB",
          "secondary-dark": "#148F95",

          // Accent - Soft Gold (money, success)
          accent: "#F2C94C",
          "accent-light": "#F7DC8C",
          "accent-dark": "#D4A83A",

          // Terracotta - Reddish Gold (warmth, urgency)
          terracotta: "#D97706",
          "terracotta-light": "#F59E0B",
          "terracotta-dark": "#B45309",

          // Neutrals
          dark: "#0F172A",
          light: "#F8FAFC",
        },

        // Dark mode specific colors
        dark: {
          bg: "#020617",
          card: "#0F172A",
          border: "#1E293B",
          text: "#E5E7EB",
          "text-secondary": "#9CA3AF",
        },
      },
      backgroundImage: {
        // Teleba gradient (vibrant blue → teal)
        "teleba-gradient": "linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)",
        "teleba-gradient-dark":
          "linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)",
      },
    },
  },
  plugins: [],
};
