import { View } from 'react-native';
import IconCircle from '../icon-circle';
import { ThemedText } from '@/components/shared';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface InputHeaderProps {
  icon: string;
  label: string;
  infoText?: string;
  disabled?: boolean;
  required?: boolean;
}

export function InputHeader({ icon, label, infoText, disabled = false, required = false }: InputHeaderProps) {
  return (
    <View className="flex-row items-center">
      <View className="w-12 justify-center relative">
        <IconCircle
          input={icon}
          size={36}
          color="white"
          backgroundColor="transparent"
          borderSize={0}
          opacity={disabled ? 70 : 100}
        />
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
