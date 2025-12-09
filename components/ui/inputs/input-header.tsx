import { FontAwesome6 } from "@expo/vector-icons";
import { View, Text } from "react-native";
import IconCircle from "../icon-circle";
import { ThemedText } from "@/components/shared";

interface InputHeaderProps {
  icon: string;
  label: string;
  infoText?: string;
  disabled?: boolean;
}

export function InputHeader({
  icon,
  label,
  infoText,
  disabled = false,
}: InputHeaderProps) {
  return (
    <View className="flex-row items-center">
      <View className="w-12 justify-center">
        <IconCircle
          input={icon}
          size={36}
          color="white"
          backgroundColor="transparent"
          borderSize={0}
          opacity={disabled ? 70 : 100}
        />
      </View>
      <ThemedText className="mr-1">{label}</ThemedText>
      {infoText && (
        <View className="">{/* <InfoPopover text={infoText} /> */}</View>
      )}
    </View>
  );
}
