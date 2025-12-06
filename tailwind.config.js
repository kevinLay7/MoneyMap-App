const { Colors } = require("./constants/colors");

// Helper to convert camelCase to kebab-case
function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
}

// Generate CSS variables plugin
function generateCSSVariables() {
  return function ({ addBase, theme }) {
    const lightVars = {};
    const darkVars = {};

    // Generate CSS variables from Colors.light
    Object.entries(Colors.light).forEach(([key, value]) => {
      lightVars[`--color-${camelToKebab(key)}`] = value;
    });

    // Generate CSS variables from Colors.dark
    Object.entries(Colors.dark).forEach(([key, value]) => {
      darkVars[`--color-${camelToKebab(key)}`] = value;
    });

    addBase({
      ":root": lightVars,
      ".dark": darkVars,
    });
  };
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: Colors.primary,
        secondary: Colors.secondary,
        tertiary: Colors.tertiary,
        quaternary: Colors.quaternary,
        quinary: Colors.quinary,
        negative: Colors.negative,
        white: "#ffffff",
        background: "var(--color-background)",
        "background-secondary": "var(--color-background-secondary)",
        "background-tertiary": "var(--color-background-tertiary)",
        text: "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        icon: "var(--color-icon)",
        tint: "var(--color-tint)",
        "tab-icon-default": "var(--color-tab-icon-default)",
        "tab-icon-selected": "var(--color-tab-icon-selected)",
        disabled: "var(--color-disabled)",
      },
    },
  },
  plugins: [generateCSSVariables()],
};
