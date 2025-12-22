import { View, ScrollView } from 'react-native';
import { Button } from '@/components/ui/button';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundContainer } from '@/components/ui/background-container';
import { ThemedText } from '@/components/shared';
import { useUserCreationFlag } from '@/hooks/use-user-creation-flag';
import { useCreateUser } from '@/hooks/api/user-api';
import { useState, useEffect } from 'react';
import { TextInput } from '@/components/ui/inputs/text-input';
import { CreateUserDto, UserResponseDto } from '@/api/gen/data-contracts';
import { Card } from '@/components/ui/card';
import { useRouter } from 'expo-router';
import { encryptionCredentialsService } from '@/services';

export default function CreateProfile() {
  const { user } = useAuth0();
  const { needsUserCreation, setNeedsUserCreation } = useUserCreationFlag();
  const createUserMutation = useCreateUser();
  const router = useRouter();
  const [createUserDto, setCreateUserDto] = useState<CreateUserDto>({
    auth0_id: '',
    first_name: '',
    last_name: '',
    email: '',
    encryption_password: '',
    salt: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from Auth0 credentials
  useEffect(() => {
    async function loadUserData() {
      try {
        if (user) {
          setCreateUserDto({
            auth0_id: user.sub || '',
            first_name: user.given_name || '',
            last_name: user.family_name || '',
            email: user.email || '',
            encryption_password: '',
            salt: '',
          });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadUserData();
  }, [user]);

  const handleCreateUser = async () => {
    if (
      !createUserDto.first_name ||
      !createUserDto.last_name ||
      !createUserDto.email ||
      !createUserDto.encryption_password
    ) {
      console.error('Please fill in all required fields', createUserDto);
      return;
    }

    try {
      const responseDto: UserResponseDto = await createUserMutation.mutateAsync(createUserDto);

      // Store the encryption password and salt in secure storage
      const salt = responseDto.account?.salt;
      if (!salt) {
        throw new Error('Salt not returned from server');
      }

      await encryptionCredentialsService.setCredentials({
        password: createUserDto.encryption_password,
        salt,
      });

      await setNeedsUserCreation(false);
      // Navigate to tabs after user creation
      router.replace('/(auth)/(tabs)');
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  if (isLoading) {
    return (
      <BackgroundContainer>
        <SafeAreaView className="flex-1 flex flex-col justify-center items-center">
          <ThemedText type="title">Loading...</ThemedText>
        </SafeAreaView>
      </BackgroundContainer>
    );
  }

  return (
    <BackgroundContainer>
      <SafeAreaView className="flex-1 flex flex-col">
        <ScrollView className="flex-1" contentContainerClassName="px-6 py-8">
          <View className="mb-8">
            <ThemedText type="title" className="mb-2">
              Complete Your Profile
            </ThemedText>
            <ThemedText type="default" className="text-text-secondary">
              Please fill in your details to get started
            </ThemedText>
          </View>

          <Card className="p-6">
            <View className="gap-4">
              <TextInput
                value={createUserDto.first_name}
                onChangeText={text => setCreateUserDto({ ...createUserDto, first_name: text })}
                icon="user"
                label="First Name"
                placeholder="Enter your first name"
                tabIndex={0}
              />
              <TextInput
                value={createUserDto.last_name}
                onChangeText={text => setCreateUserDto({ ...createUserDto, last_name: text })}
                icon="user"
                label="Last Name"
                placeholder="Enter your last name"
                tabIndex={1}
              />
              <TextInput
                value={createUserDto.email}
                onChangeText={text => setCreateUserDto({ ...createUserDto, email: text })}
                icon="envelope"
                label="Email"
                placeholder="Enter your email"
                tabIndex={2}
              />
              <TextInput
                value={createUserDto.encryption_password}
                onChangeText={text => setCreateUserDto({ ...createUserDto, encryption_password: text })}
                icon="lock"
                label="Encryption Password"
                placeholder="Enter encryption password"
                tabIndex={3}
                type="password"
              />
            </View>

            <View className="mt-8">
              <Button
                title="Create Account"
                onPress={handleCreateUser}
                disabled={
                  !createUserDto.first_name ||
                  !createUserDto.last_name ||
                  !createUserDto.email ||
                  createUserMutation.isPending
                }
              />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </BackgroundContainer>
  );
}
