import { useColorScheme, View } from 'react-native';
import IconCircle from '../icon-circle';
import { ThemedText } from '@/components/shared';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface InputHeaderProps {
  readonly icon: string;
  readonly label: string;
  readonly iconAlign?: 'left' | 'center';
  readonly infoText?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
}

export function InputHeader({
  icon,
  label,
  iconAlign = 'left',
  infoText,
  disabled = false,
  required = false,
}: InputHeaderProps) {
  const theme = useColorScheme();
  const iconAlignmentClass = iconAlign === 'left' ? 'items-start' : 'items-center';
  const iconColor = disabled
    ? theme === 'light'
      ? Colors.light.disabled
      : Colors.dark.disabled
    : theme === 'light'
      ? Colors.light.icon
      : Colors.dark.icon;
  const iconContainerClass = `${iconAlignmentClass} justify-center relative ${iconAlign === 'left' ? 'mr-2 w-5' : ''}`;

  return (
    <View className="flex-row items-center">
      <View className={iconContainerClass}>
        {iconAlign === 'left' ? (
          <FontAwesome6 name={icon as any} size={16} color={iconColor} />
        ) : (
          <IconCircle
            input={icon}
            size={36}
            color="white"
            backgroundColor="transparent"
            borderSize={0}
            opacity={disabled ? 70 : 100}
          />
        )}
        {required && (
          <View className="absolute top-0 right-1" style={{ marginRight: 8 }}>
            <FontAwesome6 name="asterisk" size={10} color={Colors.error} />
          </View>
        )}
      </View>
      <ThemedText className="mr-1">{label}</ThemedText>
      {infoText && <View className="">{/* <InfoPopover text={infoText} /> */}</View>}
    </View>
  );
}
