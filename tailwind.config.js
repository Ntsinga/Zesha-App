/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        brand: {
          red: "#C62828",
          lightRed: "#FFEBEE",
          gold: "#FDD835",
          darkGold: "#FBC02D",
        },
        // You can import from constants/theme.ts for consistency
        // But Tailwind config needs static values, so we define them here
      },
    },
  },
  plugins: [],
};
