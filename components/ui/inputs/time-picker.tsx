import { BaseInputProps } from './types';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useMemo } from 'react';
import { Colors } from '@/constants/colors';
import { InputRow } from './base-input';

interface TimePickerProps extends BaseInputProps {
  readonly hour: number; // 0-23
  readonly minute: number; // 0-59
  readonly onChange: (hour: number, minute: number) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

export function TimePicker({
  icon,
  label,
  iconAlign,
  hour,
  minute,
  onChange,
  error,
  disabled = false,
  required = false,
}: TimePickerProps) {
  // Convert hour/minute to Date for the picker
  const dateValue = useMemo(() => {
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  }, [hour, minute]);

  // Format time display
  const formattedTime = useMemo(() => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }, [hour, minute]);

  return (
    <InputRow
      icon={icon}
      label={`${label}: ${formattedTime}`}
      iconAlign={iconAlign}
      disabled={disabled}
      required={required}
      error={error}
      className="h-14 py-2 w-full"
    >
      <RNDateTimePicker
        accentColor={Colors.primary}
        value={dateValue}
        mode="time"
        display="compact"
        onChange={(event, selectedDate) => {
          if (selectedDate) {
            onChange(selectedDate.getHours(), selectedDate.getMinutes());
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
