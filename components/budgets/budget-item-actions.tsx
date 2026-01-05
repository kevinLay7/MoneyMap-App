import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import { FontAwesome6 } from '@expo/vector-icons';
import { BudgetItemState, BudgetItemStatus, BudgetItemType } from '@/model/models/budget-item';
import { ButtonConfig, getBudgetItemActionButtons } from '@/utils/budget-item-colors';

function getStatusButtons(item: BudgetItemState): ButtonConfig[] {
  return getBudgetItemActionButtons(item.status, item.type);
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
