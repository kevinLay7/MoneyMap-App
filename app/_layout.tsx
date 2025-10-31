import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { View } from "react-native";
import { ColorSchemeProvider, useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <View className={`w-full h-full ${colorScheme === "dark" ? "dark" : ""}`}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ColorSchemeProvider>
      <RootLayoutContent />
    </ColorSchemeProvider>
  );
}
