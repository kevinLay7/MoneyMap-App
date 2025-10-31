const tintColorLight = "#973AFF";
const tintColorDark = "#973AFF";

module.exports = {
  primary: "#973AFF",
  secondary: "#028FFF",
  tertiary: "#FC4F9E",
  quaternary: "#10ab8f",
  quinary: "#a64ca0",
  negative: "transparent",
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    backgroundSecondary: "#f5f5f5",
    backgroundTertiary: "#e5e5e5",
  },
  dark: {
    text: "#ECEDEE",
    background: "#040607",
    backgroundSecondary: "#191819",
    backgroundTertiary: "#2d2d2d",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
