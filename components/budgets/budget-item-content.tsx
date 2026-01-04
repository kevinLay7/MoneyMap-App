import { View } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { formatDate } from '@/helpers/dayjs';
import { BudgetItemState } from '@/model/models/budget-item';
import { Colors } from '@/constants/colors';

interface BudgetItemContentProps {
  readonly item: BudgetItemState;
  readonly formatMoney: (amount: number) => string;
}

function ExpenseContent({ item, formatMoney }: BudgetItemContentProps) {
  return (
    <View className="flex-row flex-1 justify-center">
      <View className="ml-4 justify-center">
        <View className="items-center">
          <ThemedText type="defaultSemiBold" numberOfLines={1} className="">
            {item.name}
          </ThemedText>
        </View>
      </View>

      <View className="ml-auto justify-center items-end">
        <ThemedText type="defaultSemiBold">{formatMoney(item.amount)}</ThemedText>
        {item.dueDate && <ThemedText type="subText">Due {formatDate(item.dueDate, 'MM/DD')}</ThemedText>}
      </View>
    </View>
  );
}

function CategoryContent({ item, formatMoney }: BudgetItemContentProps) {
  return (
    <View className="flex-col flex-1 justify-center ml-4">
      <View className="flex-row ">
        <View className="justify-center">
          <ThemedText type="defaultSemiBold">{item.category?.name}</ThemedText>
        </View>
        <View className="ml-auto justify-center">
          <ThemedText type="defaultSemiBold">{formatMoney(item.amount)}</ThemedText>
        </View>
      </View>
      <View className="flex-row mt-2">
        <View className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(item.spendingPercentage, 100)}%`,
              backgroundColor: item.isOverBudget
                ? Colors.error
                : item.spendingPercentage > 55
                  ? Colors.warning
                  : Colors.success,
            }}
          />
        </View>
      </View>
    </View>
  );
}

function BalanceTrackingContent({ item, formatMoney }: BudgetItemContentProps) {
  return (
    <View className="flex-row flex-1 justify-center">
      <View className="ml-4 justify-center">
        <View className="items-center">
          <ThemedText type="defaultSemiBold" numberOfLines={1} className="">
            {item.name}
          </ThemedText>
          {item.isAutoPay && (
            <FontAwesome6 name="rotate-left" size={14} color={Colors.dark.textSecondary} style={{ marginLeft: 6 }} />
          )}
        </View>
      </View>

      <View className="ml-auto justify-center items-end">
        <ThemedText type="defaultSemiBold">{formatMoney(item.amount)}</ThemedText>
        <ThemedText type="subText">Spent</ThemedText>
      </View>
    </View>
  );
}

export function BudgetItemContent({ item, formatMoney }: BudgetItemContentProps) {
  if (item.isExpense) return <ExpenseContent item={item} formatMoney={formatMoney} />;
  if (item.isCategory) return <CategoryContent item={item} formatMoney={formatMoney} />;
  if (item.isBalanceTracking) return <BalanceTrackingContent item={item} formatMoney={formatMoney} />;
  return null;
}

