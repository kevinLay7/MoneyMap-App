import { View, Text, Button } from "react-native";
import { useAuth0 } from "react-native-auth0";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth0 } from "@/hooks/my-auth0";

export default function Login() {
  const { authorize } = useAuth0();
  const handleAuth0Login = async () => {
    try {
      console.log(
        "process.env.EXPO_PUBLIC_AUTH0_AUDIENCE",
        process.env.EXPO_PUBLIC_AUTH0_AUDIENCE
      );
      // const result = await authorize(
      //   {
      //     scope: "openid profile email offline_access",
      //     audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
      //     redirectUrl: "moneymap://auth/callback",
      //     additionalParameters: {
      //       prompt: "login",
      //     },
      //   },
      //   { ephemeralSession: false }
      // );
      await authorize(
        {
          scope: "openid profile email",
          redirectUrl: "moneymap://auth/callback",
          audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
          additionalParameters: {
            prompt: "login",
          },
        },
        { ephemeralSession: true }
      );
    } catch (e: any) {
      console.log("Auth0 login error:", e);
    }
  };

  return (
    <SafeAreaView className="flex-1 flex flex-col bg-background">
      <View className="flex-1 flex flex-col justify-center px-10">
        <View className="flex mb-20">
          <View className="flex-1 justify-center items-center">
            {/* <LottieView
              source={financeAnimation}
              style={{ width: 250, height: 250 }}
              autoPlay={true}
              loop={true}
            /> */}
          </View>
        </View>
        <View className="mt-10">
          <View className="items-center">
            <Text className="text-4xl mb-2 font-bold text-center">
              Welcome to MoneyMap
            </Text>
            <Text className="text-lg text-center text-gray-400">
              Your personal finance companion
            </Text>
          </View>

          <View className="mt-8">
            <Button title="Continue" onPress={handleAuth0Login} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
