import { View, ScrollView } from 'react-native';
import { SharedModal } from '@/components/shared/shared-modal';
import { ThemedText } from '@/components/shared/themed-text';
import { BudgetItemRow } from '@/components/budgets/budget-item-row';
import { BudgetItemState, BudgetItemStatus } from '@/model/models/budget-item';
import { formatDate } from '@/helpers/dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from './card';
import database from '@/model/database';
import { BudgetService } from '@/services/budget-service';

interface CalendarDayModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly date: Date | null;
  readonly bills: BudgetItemState[];
}

export function CalendarDayModal({ visible, onClose, date, bills }: CalendarDayModalProps) {
  if (!date) return null;

  const formattedDate = formatDate(date, 'MMMM D, YYYY');
  const budgetService = new BudgetService(database);

  const handleToggleStatus = (itemId: string) => (newStatus: BudgetItemStatus) => {
    budgetService.updateBudgetItemStatus(itemId, newStatus);
  };

  const handleDelete = (itemId: string) => {
    budgetService.deleteBudgetItem(itemId);
  };

  return (
    <SharedModal
      visible={visible}
      onClose={onClose}
      position="bottom"
      height={0.7}
      backgroundColor="transparent"
    >
      <SafeAreaView edges={['bottom']} className="flex-1">
        <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg" className="flex-1">
          <View className="mb-4">
            <ThemedText type="title" className="mb-1">
              {formattedDate}
            </ThemedText>
            <ThemedText type="subText" color="textSecondary">
              {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
            </ThemedText>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {bills.length === 0 ? (
              <View className="items-center justify-center py-8">
                <ThemedText type="default" color="textSecondary">
                  No bills for this day
                </ThemedText>
              </View>
            ) : (
              <View>
                {bills.map(bill => (
                  <BudgetItemRow
                    key={bill.itemId}
                    item={bill}
                    onToggleStatus={handleToggleStatus(bill.itemId)}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </Card>
      </SafeAreaView>
    </SharedModal>
  );
}

