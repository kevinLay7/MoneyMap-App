import { Stack, router } from 'expo-router';
import { useProfileCheck } from '@/hooks/use-profile-check';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { data: profileCheck, isLoading } = useProfileCheck();

  const hasEncryptionCredentials = profileCheck?.hasEncryptionCredentials === true;
  const hasProfile = profileCheck?.hasProfile === true;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (hasEncryptionCredentials === false) {
      router.replace('/(auth)/encryption-key');
    }
  }, [hasEncryptionCredentials, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!hasProfile && <Stack.Screen name="create-profile" options={{ headerShown: false }} />}
      {hasProfile && <Stack.Screen name="(tabs)" options={{ headerShown: false }} />}
      {hasProfile && <Stack.Screen name="create-budget" options={{ headerShown: false }} />}
      {hasProfile && __DEV__ && <Stack.Screen name="debug-data" options={{ headerShown: false }} />}
      <Stack.Screen name="encryption-key" options={{ headerShown: false }} />
    </Stack>
  );
}
