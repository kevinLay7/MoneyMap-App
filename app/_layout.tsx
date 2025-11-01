import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { View } from "react-native";
import { ColorSchemeProvider, useColorScheme } from "@/hooks/use-color-scheme";
import { DependencyProvider } from "@/context/dependencyContext";
import { Auth0Provider, useAuth0 } from "react-native-auth0";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <Auth0Provider
      domain={"dev-obyd3bj5h2tzmml3.us.auth0.com"}
      clientId={"4bGS49O1FIBjgXBYE7ihdACyqpONNNi9"}
    >
      <QueryClientProvider client={queryClient}>
        <ColorSchemeProvider>
          <DependencyProvider>
            <RootLayoutContent />
          </DependencyProvider>
        </ColorSchemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
  );
}

function RootLayoutContent() {
  const { user, clearSession } = useAuth0();
  const colorScheme = useColorScheme();
  console.log("user", user);

  return (
    <View className={`w-full h-full ${colorScheme === "dark" ? "dark" : ""}`}>
      <Stack>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!user}>
          <Stack.Screen
            name="(public)/login"
            options={{ headerShown: false }}
          />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}
