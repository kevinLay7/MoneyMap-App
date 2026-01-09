import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { SharedModal, ThemedText } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/inputs/text-input';
import { DatePicker } from '@/components/ui/inputs/date-picker';
import { AccountSelectInput } from '@/components/ui/inputs/account-select-input';
import { MerchantSelectInput } from '@/components/ui/inputs/merchant-select-input';
import { CategorySlectorModal } from '@/components/ui/inputs/category-selector-modal';
import { SwitchInput } from '@/components/ui/inputs/switch-input';
import { Colors } from '@/constants/colors';
import database from '@/model/database';
import Category from '@/model/models/category';
import { BudgetItemState } from '@/model/models/budget-item';
import { BalanceTrackingMode, BudgetItemType } from '@/model/models/budget-item-enums';
import { BudgetService, UpdateBudgetItemDto } from '@/services/budget-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const formatTypeLabel = (type: BudgetItemType) => {
  const label = type.replaceAll('_', ' ');
  return label.replaceAll(/\b\w/g, char => char.toUpperCase());
};

function TrackingModeSelector({
  trackingMode,
  onTrackingModeChange,
}: Readonly<{
  trackingMode: BalanceTrackingMode;
  onTrackingModeChange: (mode: BalanceTrackingMode) => void;
}>) {
  return (
    <View className="flex-row mb-2">
      <Pressable
        onPress={() => onTrackingModeChange(BalanceTrackingMode.Delta)}
        className={`flex-1 mr-2 py-3 rounded-lg items-center ${
          trackingMode === BalanceTrackingMode.Delta ? 'bg-primary' : 'bg-background-tertiary'
        }`}
      >
        <FontAwesome6
          name="chart-line"
          size={16}
          color={trackingMode === BalanceTrackingMode.Delta ? '#fff' : Colors.dark.text}
        />
        <ThemedText
          type="default"
          className={`mt-1 text-xs ${trackingMode === BalanceTrackingMode.Delta ? 'text-white' : ''}`}
        >
          Period Change
        </ThemedText>
        <ThemedText
          type="default"
          className={`text-xs opacity-60 ${trackingMode === BalanceTrackingMode.Delta ? 'text-white' : ''}`}
        >
          +/- since start
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onTrackingModeChange(BalanceTrackingMode.Absolute)}
        className={`flex-1 ml-2 py-3 rounded-lg items-center ${
          trackingMode === BalanceTrackingMode.Absolute ? 'bg-primary' : 'bg-background-tertiary'
        }`}
      >
        <FontAwesome6
          name="wallet"
          size={16}
          color={trackingMode === BalanceTrackingMode.Absolute ? '#fff' : Colors.dark.text}
        />
        <ThemedText
          type="default"
          className={`mt-1 text-xs ${trackingMode === BalanceTrackingMode.Absolute ? 'text-white' : ''}`}
        >
          Current Balance
        </ThemedText>
        <ThemedText
          type="default"
          className={`text-xs opacity-60 ${trackingMode === BalanceTrackingMode.Absolute ? 'text-white' : ''}`}
        >
          Against budget
        </ThemedText>
      </Pressable>
    </View>
  );
}

interface BudgetItemEditSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly budgetItemState: BudgetItemState;
}

export function BudgetItemEditSheet({ visible, onClose, budgetItemState }: BudgetItemEditSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;
  const budgetService = useMemo(() => new BudgetService(database), []);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<BalanceTrackingMode>(BalanceTrackingMode.Delta);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [isAutoPay, setIsAutoPay] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [excludeFromBalance, setExcludeFromBalance] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(budgetItemState.name);
    setAmount(budgetItemState.amount.toFixed(2));
    setSelectedAccountId(budgetItemState.fundingAccountId);
    setTrackingMode(budgetItemState.trackingMode ?? BalanceTrackingMode.Delta);
    setSelectedCategory(budgetItemState.category ?? null);
    setDueDate(budgetItemState.dueDate ?? new Date());
    setIsAutoPay(budgetItemState.isAutoPay);
    setSelectedMerchantId(budgetItemState.merchantId);
    setExcludeFromBalance(budgetItemState.excludeFromBalance);
  }, [budgetItemState, visible]);

  const isFormValid = useMemo(() => {
    switch (budgetItemState.type) {
      case BudgetItemType.Income:
      case BudgetItemType.Expense:
        return name.trim().length > 0 && Number.parseFloat(amount) > 0;
      case BudgetItemType.Category:
        return selectedCategory !== null && Number.parseFloat(amount) > 0;
      case BudgetItemType.BalanceTracking:
        return selectedAccountId !== null;
      default:
        return false;
    }
  }, [amount, budgetItemState.type, name, selectedAccountId, selectedCategory]);

  const handleSave = async () => {
    if (!isFormValid || isSaving) return;
    setIsSaving(true);

    try {
      let targetBudgetId = budgetItemState.budgetId;
      let linkedAccountName: string | null = null;

      if (budgetItemState.type === BudgetItemType.Expense) {
        const budgetForDate = await budgetService.findBudgetByDate(dueDate);
        if (!budgetForDate) {
          Alert.alert(
            'No Budget Found',
            `No budget exists for the selected due date (${dueDate.toLocaleDateString()}). Please select a date that falls within an existing budget period.`,
            [{ text: 'OK' }]
          );
          setIsSaving(false);
          return;
        }
        targetBudgetId = budgetForDate.id;
      }

      if (budgetItemState.type === BudgetItemType.BalanceTracking && selectedAccountId) {
        const account = await database.get('accounts').find(selectedAccountId);
        linkedAccountName = (account as { name?: string }).name ?? null;
      }

      const dto: UpdateBudgetItemDto = {
        budgetItemId: budgetItemState.itemId,
        budgetId: targetBudgetId,
      };

      switch (budgetItemState.type) {
        case BudgetItemType.Income:
          dto.name = name.trim();
          dto.amount = Number.parseFloat(amount) || 0;
          dto.fundingAccountId = selectedAccountId;
          dto.excludeFromBalance = excludeFromBalance;
          break;
        case BudgetItemType.Expense:
          dto.name = name.trim();
          dto.amount = Number.parseFloat(amount) || 0;
          dto.fundingAccountId = selectedAccountId;
          dto.merchantId = selectedMerchantId;
          dto.dueDate = dueDate;
          dto.isAutoPay = isAutoPay;
          dto.excludeFromBalance = excludeFromBalance;
          break;
        case BudgetItemType.Category:
          dto.amount = Number.parseFloat(amount) || 0;
          dto.excludeFromBalance = excludeFromBalance;
          if (selectedCategory) {
            dto.categoryId = selectedCategory.id;
            dto.name = selectedCategory.name;
          }
          break;
        case BudgetItemType.BalanceTracking:
          dto.trackingMode = trackingMode;
          dto.excludeFromBalance = excludeFromBalance;
          dto.fundingAccountId = selectedAccountId;
          if (linkedAccountName) {
            dto.name = linkedAccountName;
          }
          break;
      }

      await budgetService.updateBudgetItem(dto);
      onClose();
    } catch (error) {
      // TODO: handle error
    } finally {
      setIsSaving(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (budgetItemState.type) {
      case BudgetItemType.Income:
        return (
          <>
            <TextInput
              icon="tag"
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Paycheck, Freelance"
              iconAlign="center"
              required
            />
            <TextInput
              icon="dollar-sign"
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              type="currency"
              iconAlign="center"
              required
            />
            <AccountSelectInput
              selectedAccountId={selectedAccountId}
              onChange={setSelectedAccountId}
              iconAlign="center"
            />
            <SwitchInput
              icon="ban"
              label="Exclude From Balance"
              value={excludeFromBalance}
              onValueChange={setExcludeFromBalance}
              iconAlign="center"
            />
          </>
        );
      case BudgetItemType.Expense:
        return (
          <>
            <TextInput
              icon="tag"
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Rent, Netflix, Utilities"
              iconAlign="center"
              required
            />
            <TextInput
              icon="dollar-sign"
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              type="currency"
              iconAlign="center"
              required
            />
            <DatePicker
              icon="calendar"
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              iconAlign="center"
              required
            />
            <SwitchInput
              icon="credit-card"
              label="Auto-Pay"
              value={isAutoPay}
              onValueChange={setIsAutoPay}
              iconAlign="center"
            />
            <MerchantSelectInput
              selectedMerchantId={selectedMerchantId}
              onChange={setSelectedMerchantId}
              placeholder="Link to merchant..."
              iconAlign="center"
            />
            <AccountSelectInput
              selectedAccountId={selectedAccountId}
              onChange={setSelectedAccountId}
              iconAlign="center"
            />
            <SwitchInput
              icon="ban"
              label="Exclude From Balance"
              value={excludeFromBalance}
              onValueChange={setExcludeFromBalance}
              iconAlign="center"
            />
          </>
        );
      case BudgetItemType.Category:
        return (
          <>
            <Pressable
              onPress={() => setShowCategoryModal(true)}
              className="h-16 py-2 border-b-2 border-background-tertiary flex-row items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 justify-center relative">
                  <FontAwesome6 name="tags" size={20} color={Colors.primary} style={{ marginLeft: 8 }} />
                  <View className="absolute top-0 right-1" style={{ marginRight: 8 }}>
                    <FontAwesome6 name="asterisk" size={10} color={Colors.error} />
                  </View>
                </View>
                <ThemedText type="defaultSemiBold">Category</ThemedText>
              </View>
              <View className="ml-auto flex-row items-center">
                <ThemedText type="default" className={selectedCategory ? '' : 'text-text-secondary'}>
                  {selectedCategory?.name || 'Select a category'}
                </ThemedText>
                <FontAwesome6 name="chevron-right" size={12} color={Colors.dark.textSecondary} className="ml-2" />
              </View>
            </Pressable>
            <TextInput
              icon="dollar-sign"
              label="Budget Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              type="currency"
              iconAlign="center"
              required
            />
            <SwitchInput
              icon="ban"
              label="Exclude From Balance"
              value={excludeFromBalance}
              onValueChange={setExcludeFromBalance}
              iconAlign="center"
            />
            <CategorySlectorModal
              isVisible={showCategoryModal}
              onClose={() => setShowCategoryModal(false)}
              onSelectCategory={setSelectedCategory}
            />
          </>
        );
      case BudgetItemType.BalanceTracking:
        return (
          <>
            <ThemedText type="default" className="text-text-secondary text-sm mb-3">
              Track your credit card balance against your budget.
            </ThemedText>
            <ThemedText type="defaultSemiBold" className="mb-2">
              Tracking Mode
            </ThemedText>
            <TrackingModeSelector trackingMode={trackingMode} onTrackingModeChange={setTrackingMode} />
            <View className="mt-4">
              <AccountSelectInput
                selectedAccountId={selectedAccountId}
                onChange={setSelectedAccountId}
                iconAlign="center"
                required
              />
            </View>
            <SwitchInput
              icon="eye-slash"
              label="Exclude From Balance"
              value={excludeFromBalance}
              onValueChange={setExcludeFromBalance}
              description="Don't count against remaining balance"
              iconAlign="center"
            />
          </>
        );
      default:
        return null;
    }
  };

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

        <View className="flex-row items-center px-4 pb-2">
          <ThemedText type="title" className="text-lg">
            Edit Budget Item
          </ThemedText>
          <Pressable onPress={onClose} className="ml-auto">
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </View>

        <ScrollView className="px-4 flex-1">
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <FontAwesome6 name="layer-group" size={12} color={iconColor} />
                <ThemedText type="default" className="ml-2 text-text-secondary">
                {formatTypeLabel(budgetItemState.type)}
              </ThemedText>
            </View>
            {renderTypeSpecificFields()}
          </View>
        </ScrollView>

        <View className="px-4 pb-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button title="Save Changes" onPress={handleSave} disabled={!isFormValid} loading={isSaving} />
        </View>
      </View>
    </SharedModal>
  );
}
