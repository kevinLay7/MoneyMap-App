import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { SharedModal, ThemedText } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { SelectInput } from '@/components/ui/inputs/select-input';
import { AccountSelectInput } from '@/components/ui/inputs/account-select-input';
import { Colors } from '@/constants/colors';
import database from '@/model/database';
import { BudgetState } from '@/model/models/budget';
import { BudgetBalanceSource } from '@/types/budget';
import { BudgetService, UpdateBudgetDto } from '@/services/budget-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BudgetEditSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly budgetState: BudgetState;
}

export function BudgetEditSheet({ visible, onClose, budgetState }: BudgetEditSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;
  const budgetService = useMemo(() => new BudgetService(database), []);

  const [balanceSource, setBalanceSource] = useState<BudgetBalanceSource>(BudgetBalanceSource.Manual);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBalanceSource(budgetState.balanceSource);
    setSelectedAccountId(budgetState.accountId);
  }, [budgetState, visible]);

  const isFormValid = useMemo(() => {
    if (balanceSource === BudgetBalanceSource.Account) {
      return selectedAccountId !== null;
    }
    return true;
  }, [balanceSource, selectedAccountId]);

  const handleSave = async () => {
    if (!isFormValid || isSaving) return;
    setIsSaving(true);

    try {
      const dto: UpdateBudgetDto = {
        budgetId: budgetState.budgetId,
        balanceSource,
      };

      if (balanceSource === BudgetBalanceSource.Account) {
        dto.accountId = selectedAccountId;
      } else {
        dto.accountId = null;
      }

      await budgetService.updateBudget(dto);
      onClose();
    } catch (error) {
      console.error('Error updating budget:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Budget?', 'This action cannot be undone.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await budgetService.deleteBudget(budgetState.budgetId);
            onClose();
          } catch (error) {
            console.error('Error deleting budget:', error);
          }
        },
      },
    ]);
  };

  const balanceSourceOptions = [
    { label: 'Account', value: BudgetBalanceSource.Account },
    { label: 'Manual', value: BudgetBalanceSource.Manual },
  ];

  return (
    <SharedModal
      visible={visible}
      onClose={onClose}
      position="bottom"
      width="100%"
      height="85%"
      borderColor={Colors.dark.backgroundTertiary}
      borderWidth={2}
      borderRadius={20}
      backgroundColor={Colors.dark.backgroundSecondary}
    >
      <View className="w-full h-full rounded-2xl flex-1">
        <View className="flex-row items-center justify-center py-4">
          <View className="w-1/6 bg-text-secondary h-1 rounded-full"></View>
        </View>

        <View className="flex-row items-center justify-between px-4 pb-2">
          <Button
            title=" Delete"
            onPress={handleDelete}
            color="error"
            size="sm"
            width="w-1/4"
            iconLeft={<FontAwesome6 name="trash" size={16} color="white" />}
          />
          <Pressable onPress={onClose}>
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </View>

        <ScrollView className="px-4 flex-1">
          <View className="mb-4">
            <SelectInput
              icon="dollar-sign"
              label="Balance Source"
              value={balanceSource}
              onValueChange={(value: string | number) => setBalanceSource(value as BudgetBalanceSource)}
              items={balanceSourceOptions}
              iconAlign="center"
              required
            />

            {balanceSource === BudgetBalanceSource.Account && (
              <AccountSelectInput
                selectedAccountId={selectedAccountId}
                onChange={setSelectedAccountId}
                iconAlign="center"
                required
              />
            )}
          </View>
        </ScrollView>

        <View className="px-4 pb-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button title="Save Changes" onPress={handleSave} disabled={!isFormValid} loading={isSaving} />
        </View>
      </View>
    </SharedModal>
  );
}
