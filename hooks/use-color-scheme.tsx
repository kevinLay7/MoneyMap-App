import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { ReactNode } from 'react';

// Just a pass-through component now, as NativeWind handles context internally
export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useColorScheme() {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme;
}

export function useSetColorScheme() {
  const { setColorScheme } = useNativeWindColorScheme();
  return setColorScheme;
}
