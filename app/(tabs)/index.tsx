import { View } from 'react-native';
import { ThemedText, Header } from '@/components/shared';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Colors } from '@/constants/colors';
import { AccountsGroupCard } from '@/components/home/accounts';
import { HomeSpendingGraphCard } from '@/components/home/spending/spending-line-graph';

export default function HomeScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={<ThemedText type="subtitle">MoneyMap</ThemedText>}
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="h-full p-4">
          <HomeSpendingGraphCard />
          <AccountsGroupCard />
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
