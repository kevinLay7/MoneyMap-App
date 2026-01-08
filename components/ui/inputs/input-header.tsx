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
  const iconContainerClass = `${iconAlignmentClass} justify-center ${iconAlign === 'left' ? 'mr-2' : ''}`;
  const iconSizeClass = iconAlign === 'left' ? 'w-5' : 'mr-0';

  return (
    <View className="flex-row items-center">
      <View className={iconContainerClass}>
        <View className="flex-row items-center" style={{ marginRight: iconAlign === 'left' ? 0 : 6 }}>
          <View className={iconSizeClass}>
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
          </View>
          {required && (
            <ThemedText type="defaultSemiBold" accessibilityLabel="Required" color="error" style={{ marginLeft: -6 }}>
              *
            </ThemedText>
          )}
        </View>
      </View>
      <ThemedText className="mr-1">{label}</ThemedText>
      {infoText && <View className="">{/* <InfoPopover text={infoText} /> */}</View>}
    </View>
  );
}
