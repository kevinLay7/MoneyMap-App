import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import IconCircle from '@/components/ui/icon-circle';
import { FontAwesome6 } from '@expo/vector-icons';
import { useMoneyFormatter } from '@/hooks/format-money';
import { formatDate } from '@/helpers/dayjs';
import BudgetItem, { BudgetItemState } from '@/model/models/budget-item';
import { Colors } from '@/constants/colors';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useComputedState } from '@/hooks/use-computed-state';
import { useMemo } from 'react';

interface BudgetItemRowProps {
  readonly item: BudgetItem;
  readonly onPress?: (item: BudgetItem) => void;
}

function RightActions() {
  return (
    <View className="bg-warning w-20 h-full items-center justify-center">
      <FontAwesome6 name="check" size={24} color="white" />
      <ThemedText type="default">Cleared</ThemedText>
    </View>
  );
}

function RenderExpense(item: Readonly<BudgetItemState>, formatMoney: (amount: number) => string) {
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

      <View className="ml-auto justify-center">
        <ThemedText type="defaultSemiBold">{formatMoney(item.amount)}</ThemedText>
        {item.dueDate && <ThemedText type="subText">Due {formatDate(item.dueDate, 'MM/DD')}</ThemedText>}
      </View>
    </View>
  );
}

function RenderCategory(item: Readonly<BudgetItemState>, formatMoney: (amount: number) => string) {
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
              width: `${Math.min(item.categorySpendingPercentage, 100)}%`,
              backgroundColor: item.isOverBudget ? Colors.warning : Colors.success,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function BudgetItemRow({ item, onPress }: BudgetItemRowProps) {
  const formatMoney = useMoneyFormatter();

  const itemObservable = useMemo(() => item.computedState$, [item]);
  const itemState = useComputedState(itemObservable)!;

  const isCompleted = itemState?.isCompleted;

  const iconInput = item.name?.charAt(0) || '?';
  const bgColor = isCompleted ? 'bg-background-secondary' : 'bg-background-tertiary';

  return (
    <ReanimatedSwipeable
      overshootRight={false}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={RightActions}
    >
      <Pressable
        className="flex-row bg-background-secondary border-t-background-tertiary h-16 items-center px-4"
        style={{ borderTopWidth: 1 }}
      >
        <IconCircle input={iconInput} size={36} backgroundColor={bgColor} color={Colors.dark.textSecondary} />
        {itemState?.isExpense && RenderExpense(itemState, formatMoney)}
        {itemState?.isCategory && RenderCategory(itemState, formatMoney)}
      </Pressable>
    </ReanimatedSwipeable>
  );
}
