import { Header } from '@/components/shared';
import { ThemedText } from '@/components/shared/themed-text';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Colors } from '@/constants/colors';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { View } from 'react-native';
import { BudgetSelectHeader } from '@/components/budgets/budget-select-header';
import { useCallback, useMemo, useState } from 'react';
import database from '@/model/database';
import Budget from '@/model/models/budget';
import { BudgetSummaryCard } from '@/components/budgets/budget-summary-card';
import { BudgetMenu } from '@/components/budgets/budget-menu';
import { BudgetItemsList } from '@/components/budgets/budget-items-list';
import { Button } from '@/components/ui/button';
import { FontAwesome6 } from '@expo/vector-icons';
import { useObservable } from '@/hooks/use-observable';
import { useComputedState } from '@/hooks/use-computed-state';

export default function BudgetsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Only subscribe to budget when screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  // Observe the selected budget model
  const budgetObservable = useMemo(() => {
    if (!selectedBudgetId || !isFocused) return null;
    return database.get<Budget>('budgets').findAndObserve(selectedBudgetId);
  }, [selectedBudgetId, isFocused]);

  const selectedBudget = useObservable(budgetObservable);

  // Observe the computed state from the budget model
  // This replaces 30+ lines of manual RxJS wiring
  const budgetState = useComputedState(selectedBudget?.computedState$);

  const renderNoBudgetSelected = () => {
    return (
      <View className="flex-1 items-center justify-center">
        <ThemedText type="subtitle" className="my-6">
          You don&apos;t have any budgets yet
        </ThemedText>
        <Button
          title="  Create a new budget"
          size="sm"
          color="white"
          iconLeft={<FontAwesome6 name="plus" size={16} color="black" />}
          onPress={() => {
            router.push('/(auth)/create-budget');
          }}
          width="w-1/2"
        />
      </View>
    );
  };

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.secondary}
        centerComponent={
          <BudgetSelectHeader selectedBudgetId={selectedBudgetId} onBudgetChange={setSelectedBudgetId} />
        }
        rightComponent={<BudgetMenu selectedBudgetId={selectedBudgetId} />}
      />

      <AnimatedScrollView animatedRef={animatedRef} className="h-full w-full">
        {budgetState ? (
          <View className="p-4">
            <BudgetSummaryCard budgetState={budgetState} />
            <BudgetItemsList budgetState={budgetState} />
          </View>
        ) : (
          renderNoBudgetSelected()
        )}
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
