import { useColorScheme, View } from 'react-native';
import { BaseInputProps } from './types';
import IconCircle from '../icon-circle';
import { ThemedText } from '@/components/shared';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useMemo } from 'react';
import dayjs from '@/helpers/dayjs';
import { Colors } from '@/constants/colors';
import { FontAwesome6 } from '@expo/vector-icons';

interface DatePickerProps extends BaseInputProps {
  readonly value: Date;
  readonly onChange: (date: Date) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

export function DatePicker({
  icon,
  label,
  iconAlign = 'left',
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const theme = useColorScheme();
  const formattedDate = useMemo(() => dayjs(value).format('MM/DD'), [value]);

  const iconAlignmentClass = iconAlign === 'left' ? 'items-start' : 'items-center';
  const iconColor = disabled
    ? theme === 'light'
      ? Colors.light.disabled
      : Colors.dark.disabled
    : theme === 'light'
      ? Colors.light.icon
      : Colors.dark.icon;

  return (
    <View className="h-16 py-2 border-b-2 border-background-tertiary w-full">
      <View className="flex-row items-center">
        <View className={`w-12 ${iconAlignmentClass} justify-center relative`}>
          {iconAlign === 'left' ? (
            <FontAwesome6 name={icon as any} size={16} color={iconColor} />
          ) : (
            <IconCircle input={icon} size={36} color="white" backgroundColor="transparent" borderSize={0} />
          )}
          {required && (
            <View className="absolute top-0 right-1" style={{ marginRight: 8 }}>
              <FontAwesome6 name="asterisk" size={10} color={Colors.error} />
            </View>
          )}
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
