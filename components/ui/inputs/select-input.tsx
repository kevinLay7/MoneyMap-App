import { useColorScheme } from '@/hooks/use-color-scheme';
import { BaseInputProps } from './types';
import { Colors } from '@/constants/colors';
import { View } from 'react-native';
import { InputHeader } from './input-header';
import RNPickerSelect from 'react-native-picker-select';
import { ThemedText } from '@/components/shared';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectInputProps extends BaseInputProps {
  value: string | number | null;
  onValueChange: (value: string | number) => void;
  items: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  infoText?: string;
}

export function SelectInput({
  icon,
  label,
  iconAlign,
  value,
  onValueChange,
  items,
  error,
  placeholder = 'Select an option',
  disabled = false,
  infoText,
  required = false,
}: SelectInputProps) {
  const theme = useColorScheme();

  const getPickerSelectStyles = (theme: string) => ({
    inputIOS: {
      fontSize: 16,
      color: theme === 'light' ? Colors.light.text : Colors.dark.text,
      fontWeight: '500',
    },
    inputAndroid: {
      fontSize: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: theme === 'light' ? Colors.light.text : Colors.dark.text,
      paddingRight: 30,
      fontWeight: '500',
    },
  });

  return (
    <View className="h-16 py-2 border-b-2 border-background-tertiary">
      <View className="flex-row items-center">
        <InputHeader
          icon={icon}
          label={label}
          iconAlign={iconAlign}
          infoText={infoText}
          disabled={disabled}
          required={required}
        />
        <View className="flex flex-1 flex-row-reverse">
          <RNPickerSelect
            onValueChange={onValueChange}
            items={items}
            value={value}
            style={getPickerSelectStyles(theme)}
            placeholder={{ label: placeholder, value: null }}
            disabled={disabled}
            darkTheme={true}
            textInputProps={{ pointerEvents: 'none' }}
          />
        </View>
      </View>
      {error && <ThemedText className="text-error">{error}</ThemedText>}
    </View>
  );
}
