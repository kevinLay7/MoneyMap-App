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

    if (hasProfile === false) {
      router.replace('/(auth)/create-profile');
    }

    if (hasEncryptionCredentials === false) {
      router.replace('/(auth)/encryption-key');
    }
  }, [hasEncryptionCredentials, hasProfile, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-profile" />
      <Stack.Screen name="create-budget" />
      <Stack.Screen name="create-budget-item" />
      <Stack.Screen name="debug-data" />
      <Stack.Screen name="encryption-key" />
      <Stack.Screen name="accounts/[id]" />
    </Stack>
  );
}
