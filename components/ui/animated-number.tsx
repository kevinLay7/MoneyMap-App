import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/use-theme-color';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  decimals?: number;
  textStyle?: object;
  duration?: number;
}

const DIGIT_HEIGHT = 36;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function AnimatedDigit({ digit, textStyle }: { digit: string; textStyle?: object }) {
  const position = useSharedValue(0);

  useEffect(() => {
    const numericDigit = digit === '.' || digit === ',' || digit === '-' ? -1 : parseInt(digit, 10);
    if (numericDigit >= 0) {
      position.value = withSpring(numericDigit, {
        damping: 15,
        stiffness: 90,
        mass: 0.8,
      });
    }
  }, [digit, position]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(position.value, [0, 9], [0, -DIGIT_HEIGHT * 9]) }],
  }));

  // For non-numeric characters, just render them directly
  if (digit === '.' || digit === ',' || digit === '-' || digit === '$') {
    return (
      <View style={styles.digitContainer}>
        <Text style={[styles.digit, textStyle]}>{digit}</Text>
      </View>
    );
  }

  return (
    <View style={styles.digitContainer}>
      <Animated.View style={animatedStyle}>
        {DIGITS.map(d => (
          <Text key={d} style={[styles.digit, textStyle]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function AnimatedNumber({
  value,
  prefix = '$',
  decimals = 2,
  textStyle,
}: AnimatedNumberProps) {
  const textColor = useThemeColor({}, 'text');

  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const characters = (prefix + formattedValue).split('');

  return (
    <View style={styles.container}>
      {characters.map((char, index) => (
        <AnimatedDigit key={`${index}-${char}`} digit={char} textStyle={[{ color: textColor }, textStyle]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  digitContainer: {
    height: DIGIT_HEIGHT,
    overflow: 'hidden',
  },
  digit: {
    height: DIGIT_HEIGHT,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: DIGIT_HEIGHT,
    textAlign: 'center',
  },
});

