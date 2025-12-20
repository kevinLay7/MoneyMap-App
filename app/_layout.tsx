import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import '../config/ReactotronConfig';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ColorSchemeProvider, useColorScheme } from '@/hooks/use-color-scheme';
import { DependencyProvider, useDependency } from '@/context/dependencyContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DemoProvider } from '@/context/demoContext';
import { useEffect } from 'react';
import database from '@/model/database';
import { CateogryService } from '@/services/category-service';
import { useBackgroundTasks } from '@/hooks/use-background-tasks';

// Conditionally import Auth0 - it requires native modules
let Auth0Provider: React.ComponentType<{
  domain: string;
  clientId: string;
  children: ReactNode;
}>;
let useAuth0: () => { user: unknown };

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth0 = require('react-native-auth0');
  Auth0Provider = auth0.Auth0Provider;
  useAuth0 = auth0.useAuth0;
} catch {
  // Auth0 not available (native modules not built)
  console.warn("Auth0 native module not available. Run 'npm run ios' to build native modules.");
  const Auth0ProviderFallback = ({ children }: { domain: string; clientId: string; children: ReactNode }) => (
    <>{children}</>
  );
  Auth0ProviderFallback.displayName = 'Auth0ProviderFallback';
  Auth0Provider = Auth0ProviderFallback;
  useAuth0 = () => ({ user: null });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  return (
    <Auth0Provider domain={'dev-obyd3bj5h2tzmml3.us.auth0.com'} clientId={'4bGS49O1FIBjgXBYE7ihdACyqpONNNi9'}>
      <QueryClientProvider client={queryClient}>
        <ColorSchemeProvider>
          <DependencyProvider>
            <DemoProvider>
              <RootLayoutContent />
            </DemoProvider>
          </DependencyProvider>
        </ColorSchemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
  );
}

function RootLayoutContent() {
  const { user } = useAuth0();
  const colorScheme = useColorScheme();

  // Initialize background tasks when user is authenticated
  useBackgroundTasks();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={`w-full h-full ${colorScheme === 'dark' ? 'dark' : ''}`}>
        <Stack>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={!user}>
            <Stack.Screen name="(public)/login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        <StatusBar style="auto" />
      </View>
    </GestureHandlerRootView>
  );
}
