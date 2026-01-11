import { Pressable, View } from 'react-native';
import { BaseInputProps } from './types';
import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';
import { InputRow } from './base-input';
import { Feather } from '@expo/vector-icons';

interface CheckboxInputProps extends Omit<BaseInputProps, 'icon' | 'iconAlign'> {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly disabled?: boolean;
}

export function CheckboxInput({
  label,
  value,
  onValueChange,
  error,
  disabled = false,
  infoText,
  required = false,
}: CheckboxInputProps) {
  return (
    <InputRow
      label={label}
      disabled={disabled}
      required={required}
      error={error}
      className="min-h-14 h-auto overflow-hidden flex pt-3 pb-2"
      infoText={infoText}
    >
      <Pressable
        onPress={() => !disabled && onValueChange(!value)}
        disabled={disabled}
        className="flex-row items-center flex-1"
        style={{ opacity: disabled ? 0.6 : 1 }}
      >
        <View
          className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
          style={{
            borderColor: value ? Colors.primary : Colors.dark.border,
            backgroundColor: value ? Colors.primary : 'transparent',
          }}
        >
          {value && <Feather name="check" size={14} color="#fff" />}
        </View>
        <ThemedText type="default" className="flex-1">
          {label}
        </ThemedText>
      </Pressable>
    </InputRow>
  );
}
