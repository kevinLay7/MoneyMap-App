import { ThemedText } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import { useDependency } from '@/context/dependencyContext';
import { useState } from 'react';
import { Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encryptionCredentialsService } from '@/services/encryption-credentials-service';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/button';
import { UserResponseDto } from '@/api/gen/data-contracts';

export default function EncryptionKeyView() {
  const { usersApi } = useDependency();
  const [encryptionKey, setEncryptionKey] = useState('');
  const theme = useColorScheme();
  const buttonEnabled = encryptionKey.length > 0;

  const handleSubmit = async () => {
    try {
      const response = await usersApi.userControllerValidateEncryptionKey({
        encryption_key: encryptionKey,
      });

      if (response.status !== 200) {
        Alert.alert('Error', 'Failed to validate encryption key', { message: response.data });
        throw new Error('Failed to validate encryption key', { cause: response.data });
      }

      const selfResponse = await usersApi.userControllerGetCurrentUser();

      const user = selfResponse.data as UserResponseDto;
      if (!user?.account?.salt) {
        console.warn(user);
        throw new Error('Account salt not found');
      }

      // Store the encryption key and salt in the database
      await encryptionCredentialsService.setEncryptionPassword(encryptionKey);
      await encryptionCredentialsService.setEncryptionSalt(user.account?.salt);

      router.replace('/(auth)/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to validate encryption key');
    }
  };

  return (
    <BackgroundContainer>
      <SafeAreaView className="flex-1 flex flex-col items-center">
        <ThemedText type="title" className="mb-2">
          Encryption Key
        </ThemedText>
        <ThemedText type="default" className="mb-4">
          Your encryption key is used to secure your data. This key was setup when you created your account, and
          can&apos;t be found in the app.
        </ThemedText>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: theme === 'dark' ? Colors.dark.text : Colors.light.text,
            color: theme === 'dark' ? Colors.dark.text : Colors.light.text,
            width: '100%',
            padding: 10,
            borderRadius: 5,
          }}
          placeholder="Enter your encryption key"
          value={encryptionKey}
          onChangeText={setEncryptionKey}
          type="password"
          className="mb-4"
        />

        <Button title="Submit" onPress={handleSubmit} className="w-full" disabled={!buttonEnabled} />
      </SafeAreaView>
    </BackgroundContainer>
  );
}
