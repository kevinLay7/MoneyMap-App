import { BaseInputProps } from './types';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useMemo } from 'react';
import dayjs from '@/helpers/dayjs';
import { Colors } from '@/constants/colors';
import { InputRow } from './base-input';

interface DatePickerProps extends BaseInputProps {
  readonly value: Date;
  readonly onChange: (date: Date) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

export function DatePicker({
  icon,
  label,
  iconAlign,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const formattedDate = useMemo(() => dayjs(value).format('MM/DD'), [value]);

  return (
    <InputRow
      icon={icon}
      label={`${label}: ${formattedDate}`}
      iconAlign={iconAlign}
      disabled={disabled}
      required={required}
      error={error}
      className="h-14 py-2 w-full"
    >
      <RNDateTimePicker
        accentColor={Colors.primary}
        value={value}
        mode="date"
        display="compact"
        onChange={(event, selectedDate) => {
          if (selectedDate) {
            onChange(selectedDate);
          }
        }}
        disabled={disabled}
        style={{
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </InputRow>
  );
}
