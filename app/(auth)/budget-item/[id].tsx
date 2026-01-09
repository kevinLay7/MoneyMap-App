import { Alert, Pressable, View } from 'react-native';
import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { EnhancedTransactionRow } from '@/components/transaction';
import { Header, ThemedText } from '@/components/shared';
import { AnimatedNumber } from '@/components/ui/animated-number';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Card } from '@/components/ui/card';
import { MenuPopover } from '@/components/ui/menu-popover';
import IconCircle from '@/components/ui/icon-circle';
import { DetailsSection } from '@/components/budgets/budget-item-details';
import { BudgetItemEditSheet } from '@/components/budgets/budget-item-edit-sheet';
import { SpendingByCategoryCard } from '@/components/home/spending/spending-by-category-card';
import { CreditUtilizationCard } from '@/components/budgets/credit-utilization-card';
import { Colors } from '@/constants/colors';
import dayjs from '@/helpers/dayjs';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useComputedState } from '@/hooks/use-computed-state';
import { useObservable, useObservableCollection } from '@/hooks/use-observable';
import database from '@/model/database';
import Account from '@/model/models/account';
import BudgetItem, { BudgetItemState, BudgetItemTag } from '@/model/models/budget-item';
import { getBudgetItemMerchantIconInput } from '@/utils/budget-item-icon';
import { getBudgetItemProgressColor, getBudgetItemTagColor } from '@/utils/budget-item-colors';
import { BudgetService } from '@/services/budget-service';

const getTagIcon = (tag: BudgetItemTag): string => {
  switch (tag) {
    case BudgetItemTag.Pending:
      return 'hourglass-half';
    case BudgetItemTag.Overdue:
      return 'exclamation';
    case BudgetItemTag.DueToday:
      return 'clock';
    case BudgetItemTag.AutoPay:
      return 'repeat';
    case BudgetItemTag.Paid:
      return 'check';
    case BudgetItemTag.Recurring:
      return 'arrows-rotate';
    case BudgetItemTag.Tracking:
      return 'credit-card';
    default:
      return 'circle';
  }
};

const formatTagDisplay = (tag: BudgetItemTag): string => {
  return tag.replaceAll(/\b\w/g, l => l.toUpperCase());
};

export default function BudgetItemDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const budgetItemObservable = useMemo(
    () => (id ? database.get<BudgetItem>('budget_items').findAndObserve(id) : null),
    [id]
  );
  const budgetItem = useObservable(budgetItemObservable);

  const budgetItemState = useComputedState(budgetItem?.computedState$);

  if (!budgetItemState) {
    return (
      <BackgroundContainer>
        <Header
          leftIcon="arrow-left"
          scrollOffset={scrollOffset}
          backgroundHex={Colors.secondary}
          centerComponent={<ThemedText type="subtitle">Loading...</ThemedText>}
        />
      </BackgroundContainer>
    );
  }

  return <BudgetItemDetailsContent budgetItemState={budgetItemState as BudgetItemState} />;
}

function BudgetItemDetailsContent({ budgetItemState }: { budgetItemState: BudgetItemState }) {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const iconInput = getBudgetItemMerchantIconInput(budgetItemState);
  const formatMoney = useMoneyFormatter();
  const budgetService = useMemo(() => new BudgetService(database), []);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const dueStatusLabel =
    budgetItemState.dueDate && budgetItemState.daysUntilDue !== null
      ? budgetItemState.daysUntilDue < 0
        ? `${Math.abs(budgetItemState.daysUntilDue)} days overdue`
        : `${budgetItemState.daysUntilDue} days left`
      : null;
  const dueLabel = budgetItemState.dueDate ? 'Due' : 'Budget Ends';
  const dueDateDisplay = budgetItemState.dueDate
    ? dayjs(budgetItemState.dueDate).format('ddd, MMM D')
    : budgetItemState.budget?.endDate
      ? dayjs(budgetItemState.budget.endDate).format('ddd, MMM D')
      : 'End date';

  // Fetch funding account if available
  const fundingAccountsObservable = useMemo(() => {
    if (!budgetItemState.fundingAccountId) return null;
    return database.get<Account>('accounts').query(Q.where('account_id', budgetItemState.fundingAccountId)).observe();
  }, [budgetItemState.fundingAccountId]);
  const fundingAccounts = useObservableCollection(fundingAccountsObservable);
  const fundingAccount = fundingAccounts[0];

  const handleDelete = (closeMenu: () => void) => {
    closeMenu();
    Alert.alert('Delete Budget Item?', 'This action cannot be undone.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await budgetService.deleteBudgetItem(budgetItemState.itemId);
          router.back();
        },
      },
    ]);
  };

  return (
    <BackgroundContainer>
      <Header
        leftIcon="arrow-left"
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={
          <View className="flex-row items-center">
            <IconCircle input={iconInput} color="white" size={28} />
            <ThemedText type="subtitle" className="ml-1">
              {budgetItemState.name}
            </ThemedText>
          </View>
        }
        rightComponent={
          <MenuPopover trigger={<FontAwesome6 name="ellipsis" size={24} color="white" />}>
            {({ close }) => (
              <>
                <Pressable
                  className="flex-row items-center px-4 py-3"
                  onPress={() => {
                    close();
                    setIsEditOpen(true);
                  }}
                >
                  <FontAwesome6 name="pen-to-square" size={16} color="white" />
                  <ThemedText type="default" className="ml-2">
                    Edit
                  </ThemedText>
                </Pressable>
                <Pressable className="flex-row items-center px-4 py-3" onPress={() => handleDelete(close)}>
                  <FontAwesome6 name="trash" size={16} color="white" />
                  <ThemedText type="default" className="ml-2">
                    Delete
                  </ThemedText>
                </Pressable>
              </>
            )}
          </MenuPopover>
        }
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="p-4">
          <Pressable onPress={() => setIsEditOpen(true)}>
            <Card backgroundColor="secondary" padding="lg" className="flex-none">
            <View className="gap-2">
              <View className="flex-row items-center">
                <ThemedText type="subText" className="uppercase tracking-widest text-text-secondary">
                  Amount
                </ThemedText>
                <ThemedText type="subText" className="ml-auto uppercase tracking-widest text-text-secondary">
                  {dueLabel}
                </ThemedText>
              </View>
              <View className="flex-row items-center">
                <AnimatedNumber value={budgetItemState.amount} textStyle={{ fontSize: 32, lineHeight: 38 }} />
                <View className="ml-auto">
                  <ThemedText type="subtitle">{dueDateDisplay}</ThemedText>
                  {dueStatusLabel ? (
                    <ThemedText type="subText" className=" ml-auto text-text-secondary mt-1">
                      {dueStatusLabel}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </View>
            {budgetItemState.isCategory ? (
              <View className="mt-4">
                <View className="flex-row items-center mb-2">
                  <ThemedText type="subText" className="text-text-secondary">
                    Spent {formatMoney(budgetItemState.spending)}
                  </ThemedText>
                  <ThemedText type="subText" className="ml-auto text-text-secondary">
                    Remaining {formatMoney(budgetItemState.remaining)}
                  </ThemedText>
                </View>
                <View className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(budgetItemState.spendingPercentage, 100)}%`,
                      backgroundColor: getBudgetItemProgressColor(
                        budgetItemState.isOverBudget,
                        budgetItemState.spendingPercentage
                      ),
                    }}
                  />
                </View>
              </View>
            ) : null}

            {budgetItemState.tags.length > 0 ? (
              <View className="mt-6 border-t border-background-tertiary pt-5">
                <ThemedText type="subText" className="uppercase tracking-widest text-text-secondary">
                  Status
                </ThemedText>
                <View className="mt-3 flex-row flex-wrap items-center">
                  {budgetItemState.tags.map((tag, index) => (
                    <View
                      key={index.toString() + tag}
                      className="flex-row items-center px-3 py-1 rounded-full mr-2 mb-2"
                      style={{ backgroundColor: getBudgetItemTagColor(tag) }}
                    >
                      <FontAwesome6 name={getTagIcon(tag) as any} size={12} color="white" />
                      <ThemedText type="default" className="ml-2 text-white">
                        {formatTagDisplay(tag)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <DetailsSection
              budgetItemState={budgetItemState}
              fundingAccountName={fundingAccount ? fundingAccount.name : 'No funding account'}
              formatMoney={formatMoney}
            />
            </Card>
          </Pressable>

          {/* Credit Utilization Card for Credit Card Accounts */}
          {fundingAccount?.type === 'credit' && fundingAccount.balanceAvailable !== undefined && (
            <View className="mt-4">
              <CreditUtilizationCard
                currentBalance={fundingAccount.balanceCurrent}
                availableBalance={fundingAccount.balanceAvailable}
                liability={fundingAccount.getLiabilityData()}
              />
            </View>
          )}

          <View className="mt-6">
            {budgetItemState.linkedTransactions.length > 0 && (
              <View className="mb-4">
                <SpendingByCategoryCard
                  transactions={budgetItemState.linkedTransactions}
                  title="Spending by Category"
                />
              </View>
            )}
            <View className="flex-row items-center mb-2">
              <ThemedText type="defaultSemiBold">Linked Transactions</ThemedText>
              <View className="ml-2 rounded-full bg-background-secondary px-2 py-0.5">
                <ThemedText type="subText">{budgetItemState.linkedTransactions.length}</ThemedText>
              </View>
            </View>
            <Card backgroundColor="secondary" className="overflow-hidden">
              {budgetItemState.linkedTransactions.length > 0 ? (
                budgetItemState.linkedTransactions.map(transaction => (
                  <EnhancedTransactionRow key={transaction.id} transaction={transaction} />
                ))
              ) : (
                <View className="p-4 items-center">
                  <ThemedText type="subText" className="text-center">
                    No transactions linked yet
                  </ThemedText>
                </View>
              )}
            </Card>
          </View>
        </View>
      </AnimatedScrollView>

      <BudgetItemEditSheet visible={isEditOpen} onClose={() => setIsEditOpen(false)} budgetItemState={budgetItemState} />
    </BackgroundContainer>
  );
}
