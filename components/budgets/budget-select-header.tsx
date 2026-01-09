import Budget from '@/model/models/budget';
import { withObservables } from '@nozbe/watermelondb/react';
import database from '@/model/database';
import { Pressable, View, ScrollView, useWindowDimensions } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useState, useMemo, useEffect } from 'react';
import { ThemedText } from '../shared';
import { Card } from '../ui/card';
import { useHaptics } from '@/hooks/useHaptics';
import { FontAwesome6 } from '@expo/vector-icons';
import { Button } from '../ui/button';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BudgetSelectHeaderProps {
  onBudgetChange?: (budgetId: string) => void;
}

function BudgetSelectHeaderInternal({ budgets, onBudgetChange }: { budgets: Budget[] } & BudgetSelectHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const { impact } = useHaptics();
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();

  // Initialize selected budget to the latest by startDate
  useEffect(() => {
    if (budgets.length > 0 && !selectedBudgetId) {
      // We should default to the current budget, or if there's not a current
      // we should default to the latest budget.
      const currentBudget = budgets.find(b => b.startDate && b.startDate <= new Date());
      if (currentBudget) {
        setSelectedBudgetId(currentBudget.id);
        onBudgetChange?.(currentBudget.id);
      } else {
        const latestBudget = budgets.sort((a, b) => {
          if (!a.startDate || !b.startDate) return 0;
          return b.startDate.getTime() - a.startDate.getTime();
        })[0];
        setSelectedBudgetId(latestBudget.id);
        onBudgetChange?.(latestBudget.id);
      }
    }
  }, [budgets, selectedBudgetId, onBudgetChange]);

  // Get selected budget
  const selectedBudget = useMemo(() => {
    if (!selectedBudgetId) return null;
    return budgets.find(b => b.id === selectedBudgetId) ?? null;
  }, [budgets, selectedBudgetId]);

  // Format date range for display
  const formatDateRange = (budget: Budget | null) => {
    if (!budget?.startDate || !budget?.endDate) {
      return 'No budget selected';
    }
    const start = budget.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = budget.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const handleBudgetSelect = (budget: Budget) => {
    impact('light');
    setSelectedBudgetId(budget.id);
    onBudgetChange?.(budget.id);
    setShowDropdown(false);
  };

  const handleToggleDropdown = () => {
    impact('light');
    setShowDropdown(!showDropdown);
  };

  // All budgets for dropdown sorted by startDate descending
  const allBudgetsForDropdown = useMemo(() => {
    return [...budgets].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return a.startDate.getTime() - b.startDate.getTime();
    });
  }, [budgets]);

  // Check if budget is past (endDate < today)
  const isPastBudget = (budget: Budget) => {
    if (!budget.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(budget.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  if (allBudgetsForDropdown.length === 0) {
    return null;
  }

  return (
    <>
      {showDropdown && (
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          onPress={() => setShowDropdown(false)}
        />
      )}
      <View className="relative z-50 overflow-visible">
        <Pressable onPress={handleToggleDropdown}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-2">
                <FontAwesome6 name="calendar" size={16} color="white" />
              </View>
              <ThemedText type="subtitle" color="white">
                {formatDateRange(selectedBudget)}
              </ThemedText>
            </View>
            <ThemedText type="default" className="ml-2">
              {showDropdown ? (
                <FontAwesome6 name="chevron-up" size={16} color="white" />
              ) : (
                <FontAwesome6 name="chevron-down" size={16} color="white" />
              )}
            </ThemedText>
          </View>
        </Pressable>

        {showDropdown && allBudgetsForDropdown.length > 0 && (
          <View
            className="absolute top-full mt-2 z-50 min-w-56"
            style={{
              left: screenWidth / 2,
              transform: [{ translateX: -224 }],
            }}
          >
            <Card variant="elevated" rounded="lg" backgroundColor="tertiary" padding="none" className="shadow-xl">
              <ScrollView className="max-h-64" nestedScrollEnabled>
                {allBudgetsForDropdown.map(budget => {
                  const isSelected = budget.id === selectedBudgetId;
                  const isPast = isPastBudget(budget);
                  return (
                    <Pressable
                      key={budget.id}
                      onPress={() => handleBudgetSelect(budget)}
                      className="px-4 py-3 border-b border-border last:border-b-0 active:bg-background-tertiary flex-row items-center"
                    >
                      <FontAwesome6
                        name="calendar"
                        size={16}
                        color={colorScheme === 'light' ? 'black' : 'white'}
                        className="mr-2"
                      />
                      <ThemedText
                        type={isSelected ? 'defaultBold' : 'default'}
                        className={`${isSelected ? 'font-semibold' : 'font-medium'} ${isPast ? 'opacity-60' : ''}`}
                      >
                        {formatDateRange(budget)}
                      </ThemedText>
                    </Pressable>
                  );
                })}

                <Button
                  title=" Create New"
                  iconLeft={<FontAwesome6 name="plus" size={14} color="black" />}
                  size="sm"
                  color="negative"
                  onPress={() => {
                    router.push('/(auth)/create-budget');
                  }}
                />
              </ScrollView>
            </Card>
          </View>
        )}
      </View>
    </>
  );
}

const enhanced = withObservables([], () => ({
  budgets: database.get<Budget>('budgets').query(Q.sortBy('created_at', Q.desc), Q.take(5)).observe(),
}));

export const BudgetSelectHeader = enhanced(BudgetSelectHeaderInternal);
