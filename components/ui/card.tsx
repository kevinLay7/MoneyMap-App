import React, { ReactNode } from 'react';
import { View, Pressable, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHaptics, HapticWeight } from '@/hooks/useHaptics';

export interface CardProps extends Omit<ViewProps, 'style'> {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'outlined' | 'elevated';
  backgroundColor?: 'default' | 'secondary' | 'tertiary';
  className?: string;
  hapticWeight?: HapticWeight;
  disabled?: boolean;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

const paddingMap: Record<string, string> = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const roundedMap: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

const backgroundColorMap: Record<string, string> = {
  default: 'bg-background',
  secondary: 'bg-background-secondary',
  tertiary: 'bg-background-tertiary',
};

export function Card({
  children,
  onPress,
  onLongPress,
  padding = 'md',
  rounded = 'lg',
  variant = 'default',
  backgroundColor = 'default',
  className,
  hapticWeight = 'light',
  disabled = false,
  activeOpacity = 0.7,
  style,
  ...viewProps
}: CardProps) {
  const { impact } = useHaptics();
  const colorScheme = useColorScheme();

  const handlePress = React.useCallback(() => {
    if (!disabled && hapticWeight && onPress) {
      impact(hapticWeight);
    }
    onPress?.();
  }, [disabled, hapticWeight, impact, onPress]);

  const paddingClass = paddingMap[padding] || paddingMap.md;
  const roundedClass = roundedMap[rounded] || roundedMap.lg;
  const bgColorClass = backgroundColorMap[backgroundColor] || backgroundColorMap.default;

  // Variant-specific styling
  let variantClasses = '';
  if (variant === 'outlined') {
    variantClasses = 'border border-border';
  } else if (variant === 'elevated') {
    variantClasses = colorScheme === 'light' ? 'shadow-lg shadow-black/10' : 'shadow-lg shadow-black/50';
  }

  const baseClasses = `${bgColorClass} flex flex-1 shadow-lg shadow-black ${paddingClass} ${roundedClass} ${variantClasses} ${className || ''}`;

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        disabled={disabled}
        className={baseClasses}
        {...viewProps}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClasses} {...viewProps}>
      {children}
    </View>
  );
}
