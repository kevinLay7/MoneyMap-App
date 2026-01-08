import { ThemedText } from '@/components/shared';
import { Colors } from '@/constants/colors';
import { FontAwesome } from '@expo/vector-icons';
import { View } from 'react-native';

interface TextIconRowProps {
  readonly icon: string;
  readonly text: string;
  readonly value: string;
  readonly valueType?: 'default' | 'defaultSemiBold' | 'defaultBold';
  readonly borderBottom?: boolean;
  readonly iconAlign?: 'left' | 'center';
}

export function TextIconRow({
  icon,
  text,
  value,
  valueType = 'default',
  borderBottom = true,
  iconAlign = 'center',
}: TextIconRowProps) {
  const iconAlignmentClass = iconAlign === 'left' ? 'items-start' : 'items-center';

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
        <View className={`w-12 ${iconAlignmentClass} justify-center`}>
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
