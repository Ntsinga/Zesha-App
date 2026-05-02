/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        brand: {
          red: "#C62828",
          lightRed: "#f5c6cb",
          gold: "#f59e0b",
          darkGold: "#d97706",
          bg: "#f5f1ea",
        },
        // You can import from constants/theme.ts for consistency
        // But Tailwind config needs static values, so we define them here
      },
    },
  },
  plugins: [],
};
