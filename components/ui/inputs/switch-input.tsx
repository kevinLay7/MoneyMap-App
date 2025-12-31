import { View, Switch } from 'react-native';
import { BaseInputProps } from './types';
import { InputHeader } from './input-header';
import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';

interface SwitchInputProps extends BaseInputProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export function SwitchInput({
  icon,
  label,
  value,
  onValueChange,
  error,
  disabled = false,
  infoText,
  description,
  required = false,
}: SwitchInputProps) {
  return (
    <View className="h-16 pb-2 pt-3 border-b-2 border-background-tertiary">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-4">
          <InputHeader icon={icon} label={label} infoText={infoText} disabled={disabled} required={required} />
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: Colors.dark.backgroundTertiary, true: Colors.primary }}
          thumbColor="#fff"
          style={{ opacity: disabled ? 0.6 : 1, marginTop: 3 }}
        />
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
