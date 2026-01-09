import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import '../config/ReactotronConfig';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ColorSchemeProvider, useColorScheme } from '@/hooks/use-color-scheme';
import { DependencyProvider } from '@/context/dependencyContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { DemoProvider } from '@/context/demoContext';
import { useProfileCheck } from '@/hooks/use-profile-check';
import { LoggingProvider } from '@/context/loggingContext';

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
  // Note: Using console.warn here because logger isn't initialized yet (LoggingProvider hasn't mounted)
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
          <ProfileCheckWrapper>
            <LoggingProvider>
              <DependencyProvider>
                <DemoProvider>
                  <RootLayoutContent />
                </DemoProvider>
              </DependencyProvider>
            </LoggingProvider>
          </ProfileCheckWrapper>
        </ColorSchemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
  );
}

/**
 * Wrapper component that checks if user has a profile.
 * Shows loading state while checking, then always renders DependencyProvider
 * (needed for create-profile to work). Background syncing is prevented
 * by useBackgroundTasks hook checking the profile status.
 */
function ProfileCheckWrapper({ children }: { children: ReactNode }) {
  const { user } = useAuth0();
  const { data: profileCheck, isLoading } = useProfileCheck();

  // If user is not authenticated, render children (DependencyProvider can handle no user)
  if (!user) {
    return <>{children}</>;
  }

  // While checking profile, show loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Always render children (DependencyProvider)
  // Background syncing is prevented by useBackgroundTasks checking profileCheck.hasProfile
  return <>{children}</>;
}

function RootLayoutContent() {
  const { user } = useAuth0();
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={`w-full h-full ${colorScheme === 'dark' ? 'dark' : ''}`}>
        <Stack>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="(public)/login" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        <StatusBar style="auto" />
      </View>
    </GestureHandlerRootView>
  );
}
