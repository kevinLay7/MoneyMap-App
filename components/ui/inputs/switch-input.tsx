import { Switch } from 'react-native';
import { BaseInputProps } from './types';
import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';
import { InputRow } from './base-input';

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
    <InputRow
      icon={icon}
      label={label}
      iconAlign={iconAlign}
      infoText={infoText}
      disabled={disabled}
      required={required}
      error={error}
      className="min-h-14 h-auto overflow-hidden flex pt-3 pb-2"
      footer={
        description ? (
          <ThemedText type="default" className="text-text-secondary text-xs mt-1 ml-12">
            {description}
          </ThemedText>
        ) : null
      }
    >
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.dark.backgroundTertiary, true: Colors.primary }}
        thumbColor="#fff"
        style={{ opacity: disabled ? 0.6 : 1, transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
      />
    </InputRow>
  );
}
