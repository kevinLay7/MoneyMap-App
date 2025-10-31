const colors = require("./constants/colors");
const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        tertiary: colors.tertiary,
        quaternary: colors.quaternary,
        quinary: colors.quinary,
        negative: colors.negative,
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        // Background colors that automatically switch with dark mode
        ".bg-background": {
          backgroundColor: colors.light.background,
        },
        ".dark .bg-background": {
          backgroundColor: colors.dark.background,
        },
        ".bg-background-secondary": {
          backgroundColor: colors.light.backgroundSecondary,
        },
        ".dark .bg-background-secondary": {
          backgroundColor: colors.dark.backgroundSecondary,
        },
        ".bg-background-tertiary": {
          backgroundColor: colors.light.backgroundTertiary,
        },
        ".dark .bg-background-tertiary": {
          backgroundColor: colors.dark.backgroundTertiary,
        },
        // Text colors that automatically switch with dark mode
        ".text-text": {
          color: colors.light.text,
        },
        ".dark .text-text": {
          color: colors.dark.text,
        },
        ".text-icon": {
          color: colors.light.icon,
        },
        ".dark .text-icon": {
          color: colors.dark.icon,
        },
        ".text-tint": {
          color: colors.light.tint,
        },
        ".dark .text-tint": {
          color: colors.dark.tint,
        },
        // Tab icon colors
        ".text-tab-icon-default": {
          color: colors.light.tabIconDefault,
        },
        ".dark .text-tab-icon-default": {
          color: colors.dark.tabIconDefault,
        },
        ".text-tab-icon-selected": {
          color: colors.light.tabIconSelected,
        },
        ".dark .text-tab-icon-selected": {
          color: colors.dark.tabIconSelected,
        },
      });
    }),
  ],
};
