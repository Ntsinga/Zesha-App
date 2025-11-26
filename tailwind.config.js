/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#C62828",
          lightRed: "#FFEBEE",
          gold: "#FDD835",
          darkGold: "#FBC02D",
        },
      },
    },
  },
  plugins: [],
};
