import { View, Pressable } from 'react-native';
import { useState, useMemo } from 'react';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ThemedText } from '@/components/shared/themed-text';
import { Card } from '@/components/ui/card';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BudgetState } from '@/model/models/budget';
import { BudgetItemStatus } from '@/model/models/budget-item';
import { BudgetItemRow } from './budget-item-row';
import { Colors } from '@/constants/colors';
import database from '@/model/database';
import { BudgetService } from '@/services/budget-service';

interface BudgetItemsListProps {
  readonly budgetState: BudgetState;
}

const SEGMENTS = ['UPCOMING', 'COMPLETED'] as const;
type SegmentType = (typeof SEGMENTS)[number];

export function BudgetItemsList({ budgetState }: BudgetItemsListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedSegment: SegmentType = SEGMENTS[selectedIndex];

  const filteredItems = useMemo(() => {
    if (selectedSegment === 'UPCOMING') {
      return budgetState.allItems.filter(
        item => item.status === BudgetItemStatus.ACTIVE || item.status === BudgetItemStatus.PENDING
      );
    }
    return budgetState.allItems.filter(item => item.status === BudgetItemStatus.COMPLETED);
  }, [budgetState.allItems, selectedSegment]);

  // Sort by due date (earliest first), items without due date go to end
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredItems]);

  const handleAddItem = () => {
    router.push({
      pathname: '/(auth)/create-budget-item',
      params: { budgetId: budgetState.budgetId },
    });
  };

  const budgetService = new BudgetService(database);

  const handleToggleStatus = (itemId: string) => (newStatus: BudgetItemStatus) => {
    budgetService.updateBudgetItemStatus(itemId, newStatus);
  };

  const handleDelete = (itemId: string) => {
    budgetService.deleteBudgetItem(itemId);
  };

  return (
    <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="none" className="py-4">
      <View className="flex-row items-center justify-between mb-4 mx-6">
        <ThemedText type="subtitle">Budget Items</ThemedText>
        <Pressable onPress={handleAddItem} hitSlop={10}>
          <FontAwesome6 name="plus" size={20} color={Colors.dark.text} />
        </Pressable>
      </View>

      <SegmentedControl
        values={[...SEGMENTS]}
        selectedIndex={selectedIndex}
        onChange={event => setSelectedIndex(event.nativeEvent.selectedSegmentIndex)}
        style={{ marginBottom: 12, marginHorizontal: 16 }}
        fontStyle={{ fontWeight: '600' }}
        activeFontStyle={{ fontWeight: '600' }}
        tintColor={Colors.secondary}
      />

      {sortedItems.length === 0 ? (
        <View className="items-center py-8">
          <ThemedText type="default" className="text-text-secondary">
            No {selectedSegment.toLowerCase()} items
          </ThemedText>
        </View>
      ) : (
        <View>
          {sortedItems.map(item => (
            <BudgetItemRow
              key={item.itemId}
              item={item}
              onToggleStatus={handleToggleStatus(item.itemId)}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}
    </Card>
  );
}
