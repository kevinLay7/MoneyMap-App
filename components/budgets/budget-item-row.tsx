import { View, Pressable, Alert } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import IconCircle from '@/components/ui/icon-circle';
import { FontAwesome6 } from '@expo/vector-icons';
import { useMoneyFormatter } from '@/hooks/format-money';
import { formatDate } from '@/helpers/dayjs';
import { BudgetItemState, BudgetItemStatus, BudgetItemType } from '@/model/models/budget-item';
import { Colors } from '@/constants/colors';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import database from '@/model/database';
import { BudgetService } from '@/services/budget-service';

interface BudgetItemRowProps {
  readonly item: BudgetItemState;
  readonly onPress?: (item: BudgetItemState) => void;
  readonly onToggleStatus?: (status: BudgetItemStatus) => void;
}

function LeftActions({ onDelete }: { readonly onDelete: () => void }) {
  return (
    <View className="bg-error w-20 h-full items-center justify-center">
      <Pressable className="items-center justify-center" onPress={onDelete}>
        <FontAwesome6 name="trash" size={20} color="white" />
        <ThemedText type="default">Delete</ThemedText>
      </Pressable>
    </View>
  );
}

function RightActions({
  item,
  onToggleStatus,
}: {
  readonly item: BudgetItemState;
  readonly onToggleStatus: (status: BudgetItemStatus) => void;
}) {
  const status = item.status;
  const buttons: { label: string; icon: string; bgColor: string; status: BudgetItemStatus }[] = [];

  if (status === BudgetItemStatus.ACTIVE) {
    if (item.type === BudgetItemType.Expense) {
      buttons.push(
        { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
        { label: 'Pending', icon: 'clock', bgColor: 'bg-secondary', status: BudgetItemStatus.PENDING }
      );
    } else if (item.type === BudgetItemType.Income) {
      buttons.push({ label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE });
    } else if (item.type === BudgetItemType.Category) {
      buttons.push({ label: 'Completd', icon: 'xmark', bgColor: 'bg-success', status: BudgetItemStatus.ACTIVE });
    }
  } else if (status === BudgetItemStatus.PENDING) {
    buttons.push(
      { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
      { label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE }
    );
  } else if (status === BudgetItemStatus.COMPLETED) {
    buttons.push({ label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE });
  }

  return (
    <>
      {buttons.map(button => (
        <View key={button.status} className={`${button.bgColor} w-20 h-full items-center justify-center`}>
          <Pressable className="items-center justify-center" onPress={() => onToggleStatus(button.status)}>
            <FontAwesome6 name={button.icon as any} size={20} color="white" />
            <ThemedText type="default">{button.label}</ThemedText>
          </Pressable>
        </View>
      ))}
    </>
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

function RenderBalanceTracking(item: Readonly<BudgetItemState>, formatMoney: (amount: number) => string) {
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

export function BudgetItemRow({ item, onPress, onToggleStatus }: BudgetItemRowProps) {
  const formatMoney = useMoneyFormatter();
  const budgetService = new BudgetService(database);

  const isCompleted = item.isCompleted;

  const iconInput = item.name?.charAt(0) || '?';
  const bgColor = isCompleted ? 'bg-background-secondary' : 'bg-background-tertiary';

  const handleDelete = () => {
    Alert.alert('Delete Budget Item?', 'This action cannot be undone.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          budgetService.deleteBudgetItem(item.itemId);
        },
      },
    ]);
  };

  return (
    <ReanimatedSwipeable
      overshootRight={false}
      overshootLeft={false}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={(progress, translation, swipeableMethods) =>
        RightActions({ item, onToggleStatus: onToggleStatus || (() => {}) })
      }
      renderLeftActions={() => LeftActions({ onDelete: handleDelete })}
    >
      <Pressable
        className="flex-row bg-background-secondary border-t-background-tertiary h-16 items-center px-4"
        style={{ borderTopWidth: 1, borderRadius: 5 }}
      >
        <IconCircle input={iconInput} size={36} backgroundColor={bgColor} color={Colors.dark.textSecondary} />
        {item.isExpense && RenderExpense(item, formatMoney)}
        {item.isCategory && RenderCategory(item, formatMoney)}
        {item.isBalanceTracking && RenderBalanceTracking(item, formatMoney)}
      </Pressable>
    </ReanimatedSwipeable>
  );
}
