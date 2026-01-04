import { Pressable, Alert } from 'react-native';
import IconCircle from '@/components/ui/icon-circle';
import { useMoneyFormatter } from '@/hooks/format-money';
import { BudgetItemState, BudgetItemStatus } from '@/model/models/budget-item';
import { Colors } from '@/constants/colors';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { BudgetItemContent } from './budget-item-content';
import { LeftActions, RightActions } from './budget-item-actions';

interface BudgetItemRowProps {
  readonly item: BudgetItemState;
  readonly onPress?: (item: BudgetItemState) => void;
  readonly onToggleStatus?: (status: BudgetItemStatus) => void;
  readonly onDelete?: (itemId: string) => void;
}

export function BudgetItemRow({ item, onPress, onToggleStatus, onDelete }: BudgetItemRowProps) {
  const formatMoney = useMoneyFormatter();
  const iconInput = item.name?.charAt(0) || '?';
  const bgColor = item.isCompleted ? 'bg-background-secondary' : 'bg-background-tertiary';

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert('Delete Budget Item?', 'This action cannot be undone.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(item.itemId),
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
        onToggleStatus ? (
          <RightActions item={item} onToggleStatus={onToggleStatus} swipeableMethods={swipeableMethods} />
        ) : null
      }
      renderLeftActions={() => (onDelete ? <LeftActions onDelete={handleDelete} /> : null)}
    >
      <Pressable
        className="flex-row bg-background-secondary border-t-background-tertiary h-16 items-center px-4"
        style={{ borderTopWidth: 1, borderRadius: 5 }}
        onPress={() => onPress?.(item)}
      >
        <IconCircle input={iconInput} size={36} backgroundColor={bgColor} color={Colors.dark.textSecondary} />
        <BudgetItemContent item={item} formatMoney={formatMoney} />
      </Pressable>
    </ReanimatedSwipeable>
  );
}
