import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'subText' | 'link' | 'defaultBold';
  color?: 'text' | 'textSecondary';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  color = 'text',
  ...rest
}: ThemedTextProps) {
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, color);

  return (
    <Text
      style={[
        { color: textColor },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'subText' ? styles.subText : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'defaultBold' ? styles.defaultBold : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  defaultSemiBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 14,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
