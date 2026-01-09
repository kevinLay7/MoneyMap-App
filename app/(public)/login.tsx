import { View, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import financeAnimation from '../../assets/lottie/Finance.json';
import { BackgroundContainer } from '@/components/ui/background-container';
import { ThemedText } from '@/components/shared';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

export default function Login() {
  const { authorize } = useAuth0();

  const handleAuth0Login = async () => {
    try {
      await authorize(
        {
          scope: 'openid profile email offline_access',
          redirectUrl: 'moneymap://auth/callback',
          audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
          additionalParameters: {
            prompt: 'login',
          },
        },
        { ephemeralSession: true }
      );
    } catch (e: any) {
      logger.error(LogType.Auth, 'Auth0 login error', { error: e });
    }
  };

  return (
    <BackgroundContainer>
      <SafeAreaView className="flex-1 flex flex-col ">
        <View className="flex-1 flex flex-col justify-center px-10">
          <View className="flex mb-20">
            <View className="flex-1 justify-center items-center">
              <LottieView source={financeAnimation} style={{ width: 250, height: 250 }} autoPlay={true} loop={true} />
            </View>
          </View>
          <View className="mt-10">
            <View className="items-center">
              <ThemedText type="title" className="mb-6 text-center">
                Welcome to MoneyMap
              </ThemedText>
              <Text className="text-lg text-center text-text-secondary">Your personal finance companion</Text>
            </View>

            <View className="mt-8">
              <Button title="Continue" onPress={handleAuth0Login} color="white" />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </BackgroundContainer>
  );
}
