import { View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BudgetItemsList } from '@/components/budgets/budget-items-list';
import { BudgetMenu } from '@/components/budgets/budget-menu';
import { BudgetOverviewCarousel } from '@/components/budgets/budget-overview-carousel';
import { BudgetSelectHeader } from '@/components/budgets/budget-select-header';
import { BudgetSummaryCard } from '@/components/budgets/budget-summary-card';
import { Header } from '@/components/shared';
import { ThemedText } from '@/components/shared/themed-text';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import dayjs from '@/helpers/dayjs';
import { useObservable } from '@/hooks/use-observable';
import { useComputedState } from '@/hooks/use-computed-state';
import database from '@/model/database';
import Budget from '@/model/models/budget';
import Transaction from '@/model/models/transaction';

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

  const budgetTransactions = useMemo(() => {
    if (!budgetState) return [];
    const startDate = dayjs(budgetState.startDate).startOf('day');
    const endDate = dayjs(budgetState.endDate).endOf('day');
    const transactionMap = new Map<string, Transaction>();

    budgetState.allItems.forEach(item => {
      item.linkedTransactions.forEach(transaction => {
        const transactionDate = dayjs(transaction.date);
        if (transactionDate.isBefore(startDate) || transactionDate.isAfter(endDate)) {
          return;
        }
        transactionMap.set(transaction.id, transaction);
      });
    });

    return Array.from(transactionMap.values()).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  }, [budgetState]);

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
        backgroundHex={Colors.primary}
        centerComponent={
          <BudgetSelectHeader selectedBudgetId={selectedBudgetId} onBudgetChange={setSelectedBudgetId} />
        }
        rightComponent={<BudgetMenu selectedBudgetId={selectedBudgetId} budgetState={budgetState ?? null} />}
      />

      <AnimatedScrollView animatedRef={animatedRef} className="h-full w-full">
        {budgetState ? (
          <View className="p-4">
            <BudgetSummaryCard budgetState={budgetState} />
            <BudgetOverviewCarousel budgetState={budgetState} budgetTransactions={budgetTransactions} />
            <BudgetItemsList budgetState={budgetState} />
          </View>
        ) : (
          renderNoBudgetSelected()
        )}
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
