import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';
import { FontAwesome } from '@expo/vector-icons';
import { View } from 'react-native';

interface TextIconRowProps {
  icon: string;
  text: string;
  value: string;
  valueType?: 'default' | 'defaultSemiBold' | 'defaultBold';
  borderBottom?: boolean;
}

export function TextIconRow({
  icon,
  text,
  value,
  valueType = 'default',
  borderBottom = true,
}: TextIconRowProps) {
  return (
    <View
      className="flex-row items-center"
      style={{
        borderBottomWidth: borderBottom ? 1 : 0,
        borderBottomColor: Colors.dark.backgroundTertiary,
        paddingBottom: 5,
        paddingTop: 5,
      }}
    >
      <View className="flex-row items-center my-2">
        <View className="w-12 items-center justify-center">
          <FontAwesome name={icon} size={18} color="white" />
        </View>
      </View>
      <ThemedText type="defaultSemiBold" className="">
        {text.charAt(0).toUpperCase() + text.slice(1)}
      </ThemedText>
      <ThemedText type={valueType} className="ml-auto">
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </ThemedText>
    </View>
  );
}

