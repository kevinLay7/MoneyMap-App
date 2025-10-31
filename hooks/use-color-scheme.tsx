import { createContext, useContext, useState, ReactNode } from "react";

type ColorScheme = "dark" | "light";

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(
  undefined
);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorScheme {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error("useColorScheme must be used within ColorSchemeProvider");
  }
  return context.colorScheme;
}

export function useSetColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error(
      "useSetColorScheme must be used within ColorSchemeProvider"
    );
  }
  return context.setColorScheme;
}
