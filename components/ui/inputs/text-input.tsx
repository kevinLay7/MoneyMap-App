import React, { useState, useCallback, useEffect } from 'react';
import { TextInput as RNTextInput, useColorScheme, View, Text } from 'react-native';
import { BaseInputProps } from './types';
import { InputHeader } from './input-header';
import { Colors } from '@/constants/colors';

interface TextInputProps extends BaseInputProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly infoText?: string;
  readonly type?: 'text' | 'password' | 'email' | 'phone' | 'currency';
  readonly tabIndex?: number;
}

/**
 * Formats a raw digit string as currency with 2 decimal places.
 * "12345" → "123.45", "1" → "0.01", "" → "0.00"
 */
function formatCurrency(digits: string): string {
  const cleaned = digits.replaceAll(/\D/g, '');
  const cents = Number.parseInt(cleaned || '0', 10);
  return (cents / 100).toFixed(2);
}

/**
 * Extracts raw cents from a formatted currency string.
 * "123.45" → "12345", "0.01" → "1"
 */
function extractCents(formatted: string): string {
  const cleaned = formatted.replaceAll(/\D/g, '');
  return cleaned.replaceAll(/^0+/g, '') || '0';
}

export function TextInput({
  icon,
  label,
  iconAlign,
  value,
  onChangeText,
  error,
  placeholder,
  disabled = false,
  infoText,
  type = 'text',
  tabIndex = 0,
  required = false,
}: TextInputProps) {
  const theme = useColorScheme();
  const placeholderTextColor = theme === 'light' ? Colors.light.textSecondary : Colors.dark.textSecondary;
  const inputRef = React.useRef<RNTextInput>(null);
  const containerRef = React.useRef<View>(null);
  const measureTextRef = React.useRef<Text>(null);

  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [textWidth, setTextWidth] = useState<number>(0);
  const [headerWidth, setHeaderWidth] = useState<number>(0);

  const handlePress = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleContainerLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  const handleHeaderLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    setHeaderWidth(width);
  }, []);

  const handleTextLayout = useCallback((event: any) => {
    const lines = event.nativeEvent.lines;
    if (lines && lines.length > 0) {
      // Get the width of the first line (or longest line if multiple)
      const maxWidth = Math.max(...lines.map((line: any) => line.width || 0));
      setTextWidth(maxWidth);
    }
  }, []);

  // Force re-measurement when value changes
  useEffect(() => {
    if (measureTextRef.current && value) {
      // Trigger re-layout by forcing a re-render of the measurement text
      measureTextRef.current.setNativeProps({});
    }
  }, [value]);

  // Calculate available width for text input
  const availableWidth =
    containerWidth && headerWidth
      ? containerWidth - headerWidth - 16 // Account for padding/spacing
      : null;

  // Determine if multiline is needed based on actual text width vs available width
  // Add a small buffer (10px) to account for measurement inaccuracies
  // Also check if text contains newlines
  const hasNewlines = value.includes('\n');
  const wouldOverflow = availableWidth !== null && textWidth > 0 && textWidth > availableWidth - 10;
  const multiLine = hasNewlines || wouldOverflow;

  let keyboardType: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad' = 'default';
  if (type === 'email') {
    keyboardType = 'email-address';
  } else if (type === 'phone') {
    keyboardType = 'phone-pad';
  } else if (type === 'currency') {
    keyboardType = 'decimal-pad';
  }

  const handleCurrencyChange = useCallback(
    (text: string) => {
      // Extract only digits from the new input
      const newDigits = text.replaceAll(/\D/g, '');
      // Format and pass up
      onChangeText(formatCurrency(newDigits));
    },
    [onChangeText]
  );

  const handleTextChange = type === 'currency' ? handleCurrencyChange : onChangeText;

  // For currency, ensure the displayed value is always formatted
  const displayValue = type === 'currency' && value ? formatCurrency(extractCents(value)) : value;

  return (
    <View
      ref={containerRef}
      className={`min-h-16 h-auto overflow-hidden flex pt-3 pb-2 border-b-2 border-background-tertiary`}
      onTouchEnd={handlePress}
      onLayout={handleContainerLayout}
    >
      <View className={` ${multiLine ? 'flex-col items-start' : 'flex-row items-center'}`}>
        <View onLayout={handleHeaderLayout}>
          <InputHeader
            icon={icon}
            label={label}
            iconAlign={iconAlign}
            infoText={infoText}
            disabled={disabled}
            required={required}
          />
        </View>
        <RNTextInput
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          onChangeText={handleTextChange}
          value={displayValue}
          className={`text-text flex-auto py-2 `}
          editable={!disabled}
          multiline={type !== 'currency'}
          numberOfLines={multiLine ? 4 : 1}
          enablesReturnKeyAutomatically
          textAlign="right"
          keyboardType={keyboardType}
          tabIndex={tabIndex as unknown as 0 | -1 | undefined}
          selection={type === 'currency' ? { start: displayValue.length, end: displayValue.length } : undefined}
        />
      </View>
      {/* Hidden text for measuring width - matches TextInput styling */}
      {Boolean(displayValue) && (
        <Text
          ref={measureTextRef}
          className="text-text"
          style={{
            position: 'absolute',
            opacity: 0,
            fontSize: 16, // Match default TextInput font size
            // Don't constrain width - we want to measure the actual text width
          }}
          onTextLayout={handleTextLayout}
        >
          {displayValue}
        </Text>
      )}
    </View>
  );
}
