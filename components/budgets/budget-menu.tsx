import { Pressable, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useState } from 'react';
import { useNavigation } from 'expo-router';
import database from '@/model/database';
import { BudgetService } from '@/services/budget-service';
import { BudgetState } from '@/model/models/budget';
import { BudgetEditSheet } from './budget-edit-sheet';
import { MenuPopover } from '@/components/ui/menu-popover';
import { ThemedText } from '@/components/shared';

export function BudgetMenu({
  selectedBudgetId,
  budgetState,
}: {
  selectedBudgetId: string | null;
  budgetState: BudgetState | null;
}) {
  const [showEditSheet, setShowEditSheet] = useState(false);
  const navigator = useNavigation<any>();

  return (
    <>
      <MenuPopover trigger={<FontAwesome6 name="ellipsis" size={24} color="white" />}>
        {({ close }) => (
          <>
            <Pressable
              className="flex-row items-center px-4 py-3"
              onPress={() => {
                close();
                navigator.navigate('create-budget');
              }}
            >
              <FontAwesome6 name="plus" size={16} color="white" />
              <ThemedText type="default" className="ml-2">
                Create Budget
              </ThemedText>
            </Pressable>
            <Pressable
              className="flex-row items-center px-4 py-3"
              onPress={() => {
                close();
                setShowEditSheet(true);
              }}
              disabled={!budgetState}
            >
              <FontAwesome6 name="pen-to-square" size={16} color="white" />
              <ThemedText type="default" className="ml-2" style={{ opacity: !budgetState ? 0.5 : 1 }}>
                Edit Budget
              </ThemedText>
            </Pressable>
            <Pressable
              className="flex-row items-center px-4 py-3 border-t border-background-tertiary"
              onPress={() => {
                close();
                navigator.navigate('create-budget-item', { budgetId: selectedBudgetId });
              }}
            >
              <FontAwesome6 name="location-dot" size={16} color="white" />
              <ThemedText type="default" className="ml-2">
                Add Budget Item
              </ThemedText>
            </Pressable>
          </>
        )}
      </MenuPopover>

      {budgetState && (
        <BudgetEditSheet
          visible={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          budgetState={budgetState}
        />
      )}
    </>
  );
}
