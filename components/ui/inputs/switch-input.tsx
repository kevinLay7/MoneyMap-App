import { View, Switch } from 'react-native';
import { BaseInputProps } from './types';
import { InputHeader } from './input-header';
import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';

interface SwitchInputProps extends BaseInputProps {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly disabled?: boolean;
  readonly description?: string;
}

export function SwitchInput({
  icon,
  label,
  iconAlign,
  value,
  onValueChange,
  error,
  disabled = false,
  infoText,
  description,
  required = false,
}: SwitchInputProps) {
  return (
    <View className="min-h-16 h-auto overflow-hidden flex pt-3 pb-2 border-b-2 border-background-tertiary">
      <View className="flex-row items-center">
        <View className="">
          <InputHeader
            icon={icon}
            label={label}
            iconAlign={iconAlign}
            infoText={infoText}
            disabled={disabled}
            required={required}
          />
        </View>
        <View className="ml-auto">
          <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: Colors.dark.backgroundTertiary, true: Colors.primary }}
            thumbColor="#fff"
            style={{ opacity: disabled ? 0.6 : 1 }}
          />
        </View>
      </View>
      {description && (
        <ThemedText type="default" className="text-text-secondary text-xs mt-1 ml-12">
          {description}
        </ThemedText>
      )}
      {error && <ThemedText className="text-error text-xs mt-1">{error}</ThemedText>}
    </View>
  );
}
