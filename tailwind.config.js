/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: [
    "./app/**/*.{tsx,jsx,ts,js}",
    "./components/**/*.{tsx,jsx,ts,js}",
    "./constants/*.ts",
  ],
  presets: [require("nativewind/preset")],
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|secondary|tertiary|error|success|warning|info|typography|outline|background)-(0|50|100|200|300|400|500|600|700|800|900|950|white|gray|black|error|warning|muted|success|info|light|dark)/,
    },
    {
      pattern:
        /(bg|text|border)-myColors-Colors-(primary|secondary|tertiary|quaternary|quinary|negative|white|gray|lightGray|darkGray|success|pending|warning|error|alert).*/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
