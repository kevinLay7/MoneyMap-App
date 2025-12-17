import { Header } from '@/components/shared';
import { ThemedText } from '@/components/shared/themed-text';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import Animated, { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { View } from 'react-native';

export default function BudgetsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.secondary}
        centerComponent={<ThemedText type="subtitle">Budgets</ThemedText>}
        rightComponent={
          <Button
            title=""
            color="negative"
            iconRight={<FontAwesome6 name="plus" size={24} color="white" />}
            onPress={() => {
              router.navigate('/(auth)/create-budget');
            }}
            hapticWeight="light"
          />
        }
      />

      <AnimatedScrollView animatedRef={animatedRef} className="h-full w-full">
        <View className="p-4">
          <ThemedText type="subtitle">Budgets</ThemedText>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
