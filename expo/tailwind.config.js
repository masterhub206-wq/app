/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./providers/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        flash: {
          ink: "#0D0D12",
          surface: "#16161E",
          pink: "#FF007A",
          cyan: "#00F0FF",
          green: "#3DFF9A",
        },
      },
    },
  },
  plugins: [],
};
