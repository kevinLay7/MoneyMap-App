import { View } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { Header, ThemedText } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Colors } from '@/constants/colors';

export default function RecurringScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={
          <ThemedText type="subtitle" color="white">
            Recurring
          </ThemedText>
        }
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="px-4">
          <ThemedText>Recurring</ThemedText>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
