import { useColorScheme } from "@/hooks/use-color-scheme";
import { PropsWithChildren } from "react";
import { View } from "react-native";
export function BackgroundContainer({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View
      className={`bg-background h-full min-h-full flex-1 w-full ${className}`}
    >
      {children}
    </View>
  );
}
