import { Header, ThemedText } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { useCallback, useEffect, useMemo, useState } from 'react';
import database from '@/model/database';
import { Card } from '@/components/ui/card';
import { TextInput } from '@/components/ui/inputs/text-input';
import { DatePicker } from '@/components/ui/inputs/date-picker';
import { Button } from '@/components/ui/button';
import { AccountSelectInput } from '@/components/ui/inputs/account-select-input';
import { MerchantSelectInput } from '@/components/ui/inputs/merchant-select-input';
import { CategorySlectorModal } from '@/components/ui/inputs/category-selector-modal';
import { BudgetService, CreateBudgetItemDto } from '@/services/budget-service';
import { Pressable, View, Alert } from 'react-native';
import { SwitchInput } from '@/components/ui/inputs/switch-input';
import { BalanceTrackingMode, BudgetItemType } from '@/model/models/budget-item-enums';
import Category from '@/model/models/category';
import { useLocalSearchParams, router } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TypeOption {
  type: BudgetItemType;
  label: string;
  icon: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: BudgetItemType.Income, label: 'Income', icon: 'arrow-down' },
  { type: BudgetItemType.Expense, label: 'Expense', icon: 'arrow-up' },
  { type: BudgetItemType.Category, label: 'Category', icon: 'tags' },
  { type: BudgetItemType.BalanceTracking, label: 'Card', icon: 'credit-card' },
];

function TypeSelector({
  selectedType,
  onTypeChange,
}: Readonly<{
  selectedType: BudgetItemType;
  onTypeChange: (type: BudgetItemType) => void;
}>) {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;

  return (
    <View className="flex-row justify-between mb-4">
      {TYPE_OPTIONS.map(option => {
        const isSelected = selectedType === option.type;
        return (
          <Pressable
            key={option.type}
            onPress={() => onTypeChange(option.type)}
            className={`flex-1 mx-1 py-3 rounded-xl items-center ${
              isSelected ? 'bg-primary' : 'bg-background-tertiary'
            }`}
          >
            <FontAwesome6 name={option.icon} size={18} color={isSelected ? '#fff' : iconColor} />
            <ThemedText type="defaultSemiBold" className={`mt-1 text-xs ${isSelected ? 'text-white' : ''}`}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

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

export default function CreateBudgetItem() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const { budgetId } = useLocalSearchParams<{ budgetId: string }>();

  // Form state
  const [selectedType, setSelectedType] = useState<BudgetItemType>(BudgetItemType.Expense);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<BalanceTrackingMode>(BalanceTrackingMode.Delta);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isManualAccountEntry, setIsManualAccountEntry] = useState(false);
  const [manualAccountName, setManualAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Expense-specific fields
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [isAutoPay, setIsAutoPay] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  // BalanceTracking-specific fields
  const [excludeFromBalance, setExcludeFromBalance] = useState(false);

  // Reset form when type changes
  useEffect(() => {
    setName('');
    setAmount('');
    setSelectedAccountId(null);
    setSelectedCategory(null);
    setIsManualAccountEntry(false);
    setManualAccountName('');
    setDueDate(new Date());
    setIsAutoPay(false);
    setSelectedMerchantId(null);
    setExcludeFromBalance(selectedType === BudgetItemType.BalanceTracking);
  }, [selectedType]);

  const isFormValid = useMemo(() => {
    if (!budgetId) return false;

    switch (selectedType) {
      case BudgetItemType.Income:
      case BudgetItemType.Expense:
        return name.trim().length > 0 && Number.parseFloat(amount) > 0;
      case BudgetItemType.Category:
        return selectedCategory !== null && Number.parseFloat(amount) > 0;
      case BudgetItemType.BalanceTracking:
        if (isManualAccountEntry) {
          return manualAccountName.trim().length > 0;
        }
        return selectedAccountId !== null;
      default:
        return false;
    }
  }, [
    selectedType,
    name,
    amount,
    selectedCategory,
    selectedAccountId,
    isManualAccountEntry,
    manualAccountName,
    budgetId,
  ]);

  const handleCreateBudgetItem = useCallback(async () => {
    if (!isFormValid || !budgetId) return;

    setIsLoading(true);

    try {
      const budgetService = new BudgetService(database);

      let itemName = name;
      let itemAmount = Number.parseFloat(amount) || 0;
      let targetBudgetId = budgetId;

      // For Expense items, validate that the due date falls within a budget's date range
      if (selectedType === BudgetItemType.Expense) {
        const budgetForDate = await budgetService.findBudgetByDate(dueDate);
        if (!budgetForDate) {
          Alert.alert(
            'No Budget Found',
            `No budget exists for the selected due date (${dueDate.toLocaleDateString()}). Please select a date that falls within an existing budget period.`,
            [{ text: 'OK' }]
          );
          setIsLoading(false);
          return;
        }
        targetBudgetId = budgetForDate.id;
      }

      // Build the DTO based on type
      const dto: CreateBudgetItemDto = {
        budgetId: targetBudgetId,
        name: itemName,
        amount: itemAmount,
        type: selectedType,
      };

      switch (selectedType) {
        case BudgetItemType.Income:
          if (selectedAccountId) {
            dto.fundingAccountId = selectedAccountId;
          }
          break;
        case BudgetItemType.Expense:
          if (selectedAccountId) {
            dto.fundingAccountId = selectedAccountId;
          }
          if (selectedMerchantId) {
            dto.merchantId = selectedMerchantId;
          }
          dto.dueDate = dueDate;
          dto.isAutoPay = isAutoPay;
          break;
        case BudgetItemType.Category:
          if (selectedCategory) {
            dto.name = selectedCategory.name;
            dto.categoryId = selectedCategory.id;
          }
          break;
        case BudgetItemType.BalanceTracking:
          dto.trackingMode = trackingMode;
          dto.amount = 0; // Balance tracking doesn't use amount
          dto.excludeFromBalance = excludeFromBalance;
          if (isManualAccountEntry) {
            dto.name = manualAccountName;
          } else if (selectedAccountId) {
            dto.fundingAccountId = selectedAccountId;
            // Name will be set from account when available
            const account = await database.get('accounts').find(selectedAccountId);
            dto.name = (account as any).name || 'Credit Card';
          }
          break;
      }

      await budgetService.createBudgetItem(dto);
      router.back();
    } catch (error) {
      // TODO: handle error
    } finally {
      setIsLoading(false);
    }
  }, [
    isFormValid,
    budgetId,
    selectedType,
    name,
    amount,
    selectedAccountId,
    selectedCategory,
    trackingMode,
    isManualAccountEntry,
    manualAccountName,
    dueDate,
    isAutoPay,
    selectedMerchantId,
    excludeFromBalance,
  ]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case BudgetItemType.Income:
        return (
          <>
            <TextInput
              icon="tag"
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Paycheck, Freelance"
              required
            />
            <TextInput
              icon="dollar-sign"
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              type="currency"
              required
            />
            <AccountSelectInput selectedAccountId={selectedAccountId} onChange={setSelectedAccountId} />
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
              required
            />
            <TextInput
              icon="dollar-sign"
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              type="currency"
              required
            />
            <DatePicker icon="calendar" label="Due Date" value={dueDate} onChange={setDueDate} required />
            <SwitchInput icon="credit-card" label="Auto-Pay" value={isAutoPay} onValueChange={setIsAutoPay} />
            <MerchantSelectInput
              selectedMerchantId={selectedMerchantId}
              onChange={setSelectedMerchantId}
              placeholder="Link to merchant..."
            />
            <AccountSelectInput selectedAccountId={selectedAccountId} onChange={setSelectedAccountId} />
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
              required
            />
            <CategorySlectorModal
              isVisible={showCategoryModal}
              onClose={() => setShowCategoryModal(false)}
              onSelectCategory={handleCategorySelect}
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
              <View className="flex-row items-center justify-between mb-2">
                <ThemedText type="defaultSemiBold">Account</ThemedText>
                <Pressable onPress={() => setIsManualAccountEntry(!isManualAccountEntry)}>
                  <ThemedText type="link" className="text-sm">
                    {isManualAccountEntry ? 'Select linked account' : 'Enter manually'}
                  </ThemedText>
                </Pressable>
              </View>
              {isManualAccountEntry ? (
                <TextInput
                  icon="credit-card"
                  label="Card Name"
                  value={manualAccountName}
                  onChangeText={setManualAccountName}
                  placeholder="e.g., Chase Sapphire"
                />
              ) : (
                <AccountSelectInput selectedAccountId={selectedAccountId} onChange={setSelectedAccountId} noBorder />
              )}
            </View>
            <SwitchInput
              icon="eye-slash"
              label="Exclude from Budget"
              value={excludeFromBalance}
              onValueChange={setExcludeFromBalance}
              description="Don't count against remaining balance"
            />
          </>
        );

      default:
        return null;
    }
  };

  const getTypeDescription = () => {
    switch (selectedType) {
      case BudgetItemType.Income:
        return 'Expected money coming in during this budget period.';
      case BudgetItemType.Expense:
        return 'Planned spending for bills, subscriptions, or one-time expenses.';
      case BudgetItemType.Category:
        return 'Allocate a budget amount to a spending category.';
      case BudgetItemType.BalanceTracking:
        return 'Track a credit card balance against your budget.';
      default:
        return '';
    }
  };

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        centerComponent={<ThemedText type="subtitle">Add Budget Item</ThemedText>}
        leftIcon="arrow-left"
        noBackground
      />

      <AnimatedScrollView animatedRef={animatedRef} className="px-4">
        <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg">
          <TypeSelector selectedType={selectedType} onTypeChange={setSelectedType} />
          <ThemedText type="default" className="text-text-secondary text-center">
            {getTypeDescription()}
          </ThemedText>
        </Card>

        <Card variant="elevated" rounded="xl" backgroundColor="secondary" padding="lg" className="mt-4">
          {renderTypeSpecificFields()}
        </Card>

        <View className="mt-4 mb-10">
          <Button title="Create Item" onPress={handleCreateBudgetItem} disabled={!isFormValid} loading={isLoading} />
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
