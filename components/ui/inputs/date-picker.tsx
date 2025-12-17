import { View } from 'react-native';
import { BaseInputProps } from './types';
import IconCircle from '../icon-circle';
import { ThemedText } from '@/components/shared';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useMemo } from 'react';
import dayjs from '@/helpers/dayjs';
import { Colors } from '@/constants/colors';

interface DatePickerProps extends BaseInputProps {
  readonly value: Date;
  readonly onChange: (date: Date) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

export function DatePicker({ icon, label, value, onChange, error, disabled = false }: DatePickerProps) {
  const formattedDate = useMemo(() => dayjs(value).format('MM/DD'), [value]);

  return (
    <View className="h-16 py-2 border-b-2 border-background-tertiary w-full">
      <View className="flex-row items-center">
        <View className="w-12 justify-center">
          <IconCircle input={icon} size={36} color="white" backgroundColor="transparent" borderSize={0} />
        </View>
        <ThemedText className="mr-2">
          {label}: {formattedDate}
        </ThemedText>
        <View className="ml-auto">
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
        </View>
      </View>
      {error && <ThemedText className="text-error">{error}</ThemedText>}
    </View>
  );
}
