import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { BudgetItemState, BudgetItemStatus, BudgetItemType } from '@/model/models/budget-item';

interface ButtonConfig {
  label: string;
  icon: string;
  bgColor: string;
  status: BudgetItemStatus;
}

function getStatusButtons(item: BudgetItemState): ButtonConfig[] {
  const { status, type } = item;

  const buttonMap: Record<string, ButtonConfig[]> = {
    [`${BudgetItemStatus.ACTIVE}-${BudgetItemType.Expense}`]: [
      { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
      { label: 'Pending', icon: 'clock', bgColor: 'bg-secondary', status: BudgetItemStatus.PENDING },
    ],
    [`${BudgetItemStatus.ACTIVE}-${BudgetItemType.Income}`]: [
      { label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE },
    ],
    [`${BudgetItemStatus.ACTIVE}-${BudgetItemType.Category}`]: [
      { label: 'Completed', icon: 'xmark', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
    ],
    [`${BudgetItemStatus.PENDING}`]: [
      { label: 'Paid', icon: 'check', bgColor: 'bg-success', status: BudgetItemStatus.COMPLETED },
      { label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE },
    ],
    [`${BudgetItemStatus.COMPLETED}`]: [
      { label: 'Unpaid', icon: 'xmark', bgColor: 'bg-warning', status: BudgetItemStatus.ACTIVE },
    ],
  };

  return buttonMap[`${status}-${type}`] || buttonMap[status] || [];
}

interface LeftActionsProps {
  readonly onDelete: () => void;
}

export function LeftActions({ onDelete }: LeftActionsProps) {
  return (
    <View className="bg-error w-20 h-full items-center justify-center">
      <Pressable className="items-center justify-center" onPress={onDelete}>
        <FontAwesome6 name="trash" size={20} color="white" />
        <ThemedText type="default">Delete</ThemedText>
      </Pressable>
    </View>
  );
}

interface RightActionsProps {
  readonly item: BudgetItemState;
  readonly onToggleStatus: (status: BudgetItemStatus) => void;
  readonly swipeableMethods: any;
}

export function RightActions({ item, onToggleStatus, swipeableMethods }: RightActionsProps) {
  const buttons = getStatusButtons(item);

  const handlePress = (buttonStatus: BudgetItemStatus) => {
    onToggleStatus(buttonStatus);
    swipeableMethods?.close();
  };

  return (
    <>
      {buttons.map(button => (
        <View key={button.status} className={`${button.bgColor} w-20 h-full items-center justify-center`}>
          <Pressable className="items-center justify-center" onPress={() => handlePress(button.status)}>
            <FontAwesome6 name={button.icon as any} size={20} color="white" />
            <ThemedText type="default">{button.label}</ThemedText>
          </Pressable>
        </View>
      ))}
    </>
  );
}

