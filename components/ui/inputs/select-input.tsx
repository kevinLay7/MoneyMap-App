import { useColorScheme } from '@/hooks/use-color-scheme';
import { BaseInputProps } from './types';
import { Colors } from '@/constants/colors';
import { InputRow } from './base-input';
import RNPickerSelect from 'react-native-picker-select';

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
    <InputRow
      icon={icon}
      label={label}
      iconAlign={iconAlign}
      infoText={infoText}
      disabled={disabled}
      required={required}
      error={error}
      rightClassName="ml-auto flex-1 flex-row-reverse"
    >
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
    </InputRow>
  );
}
