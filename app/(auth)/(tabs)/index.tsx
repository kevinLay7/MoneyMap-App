import { View } from 'react-native';
import { ThemedText, Header } from '@/components/shared';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Colors } from '@/constants/colors';
import { AccountsGroupCard } from '@/components/home/accounts';
import { HomeSpendingGraphCard } from '@/components/home/spending/home-spending-card';
import { UncategorizedTransactionsCard } from '@/components/home/uncategorized-transactions/uncategorized-transactions-card';
import { useState } from 'react';

export default function HomeScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const [hasUncategorizedTransactions, setHasUncategorizedTransactions] = useState(false);

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
          <View className={hasUncategorizedTransactions ? 'mt-6' : ''}>
            {hasUncategorizedTransactions ? (
              <ThemedText type="defaultSemiBold" className="mb-2 text-text-secondary">
                Review Transactions
              </ThemedText>
            ) : null}
            <UncategorizedTransactionsCard title="" onHasTransactionsChange={setHasUncategorizedTransactions} />
          </View>
          <View className="mt-6">
            <ThemedText type="defaultSemiBold" className="mb-2 text-text-secondary">
              Accounts
            </ThemedText>
            <AccountsGroupCard title="" />
          </View>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
