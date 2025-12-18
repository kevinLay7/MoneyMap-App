/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light | Exclude<keyof typeof Colors, 'light' | 'dark'>
) {
  const theme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  const themeColors = Colors[theme];
  if (colorName in themeColors) {
    return (themeColors as any)[colorName];
  }

  return (Colors as any)[colorName];
}
