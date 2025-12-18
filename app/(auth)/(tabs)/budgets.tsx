import { Header } from '@/components/shared';
import { ThemedText } from '@/components/shared/themed-text';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { View } from 'react-native';
import { BudgetSelectHeader } from '@/components/budgets/budget-select-header';
import { useCallback, useEffect, useState } from 'react';
import database from '@/model/database';
import { Q } from '@nozbe/watermelondb';
import Budget from '@/model/models/budget';
import { of } from '@nozbe/watermelondb/utils/rx';
import { catchError, combineLatest, switchMap } from 'rxjs';
import BudgetItem from '@/model/models/budget-item';
import { BudgetViewModel } from '@/model/view-models/budget.viewmodel';
import { BudgetSummaryCard } from '@/components/budgets/budget-summary-card';
import { BudgetMenu } from '@/components/budgets/budget-menu';

export default function BudgetsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [selectedBudgetViewModel, setSelectedBudgetViewModel] = useState<BudgetViewModel | undefined>(undefined);
  const [isFocused, setIsFocused] = useState(false);

  // Only subscribe to budget when screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!selectedBudgetId || !isFocused) return;

    const subscription = database
      .get<Budget>('budgets')
      .findAndObserve(selectedBudgetId as string)
      .pipe(
        switchMap(budget =>
          combineLatest({
            budget: of(budget),
            account: budget.account?.observe().pipe(catchError(() => of(undefined))) ?? of(undefined),
            budgetItems: database
              .get<BudgetItem>('budget_items')
              .query(Q.where('budget_id', budget.id))
              .observe()
              .pipe(catchError(() => of([]))),
          })
        )
      )
      .subscribe(({ budget, account, budgetItems }) => {
        setSelectedBudgetViewModel(new BudgetViewModel(budget, budgetItems, account));
      });

    return () => subscription.unsubscribe();
  }, [selectedBudgetId, isFocused]);

  const renderNoBudgetSelected = () => {
    return (
      <View className="flex-1 items-center justify-center">
        <ThemedText type="subtitle">No budget selected</ThemedText>
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
        rightComponent={<BudgetMenu />}
      />

      <AnimatedScrollView animatedRef={animatedRef} className="h-full w-full">
        {selectedBudgetViewModel ? (
          <View className="p-4">
            <BudgetSummaryCard budgetViewModel={selectedBudgetViewModel} />
          </View>
        ) : (
          renderNoBudgetSelected()
        )}
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
