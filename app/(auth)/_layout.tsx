import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useUserCreationFlag } from '@/hooks/use-user-creation-flag';

export default function AuthLayout() {
  const { needsUserCreation, isLoading } = useUserCreationFlag();

  if (isLoading) {
    return null;
  }

  console.log('needsUserCreation', needsUserCreation);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {needsUserCreation ? (
        <Stack.Screen name="create-profile" options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="create-profile" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-budget" options={{ headerShown: false }} />
          {__DEV__ && <Stack.Screen name="debug-data" options={{ headerShown: false }} />}
        </>
      )}
    </Stack>
  );
}
