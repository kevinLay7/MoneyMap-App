import { View } from 'react-native';
import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { TextIconRow } from '@/components/accounts';
import { EnhancedTransactionRow } from '@/components/transaction';
import { Header, ThemedText } from '@/components/shared';
import { AnimatedNumber } from '@/components/ui/animated-number';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Card } from '@/components/ui/card';
import IconCircle from '@/components/ui/icon-circle';
import { Colors } from '@/constants/colors';
import dayjs from '@/helpers/dayjs';
import { useComputedState } from '@/hooks/use-computed-state';
import { useObservable, useObservableCollection } from '@/hooks/use-observable';
import database from '@/model/database';
import Account from '@/model/models/account';
import BudgetItem, { BudgetItemState, BudgetItemTag } from '@/model/models/budget-item';
import { getBudgetItemMerchantIconInput } from '@/utils/budget-item-icon';
import { getBudgetItemTagColor } from '@/utils/budget-item-colors';

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

  // Fetch funding account if available
  const fundingAccountsObservable = useMemo(() => {
    if (!budgetItemState.fundingAccountId) return null;
    return database.get<Account>('accounts').query(Q.where('account_id', budgetItemState.fundingAccountId)).observe();
  }, [budgetItemState.fundingAccountId]);
  const fundingAccounts = useObservableCollection(fundingAccountsObservable);
  const fundingAccount = fundingAccounts[0];

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
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="p-4">
          <Card backgroundColor="secondary" className="">
            <View className="flex-row flex-1 px-5">
              <View className="flex-col items-center justify-center">
                <ThemedText type="defaultSemiBold" className="text-center">
                  Amount
                </ThemedText>
                <AnimatedNumber value={budgetItemState.amount} />
              </View>
              <View className="flex-col items-center justify-center ml-auto">
                <ThemedText type="defaultSemiBold" className="text-center">
                  Due
                </ThemedText>
                <ThemedText type="default" className="text-center">
                  {budgetItemState.dueDate ? dayjs(budgetItemState.dueDate).format('MMM D') : 'No due date'}
                </ThemedText>
              </View>
            </View>

            {(budgetItemState.tags.length > 0 || budgetItemState.dueDate) && (
              <View className="mt-4">
                <View className="flex-row flex-wrap items-center justify-center">
                  {budgetItemState.tags.map((tag, index) => (
                    <View
                      key={index.toString() + tag}
                      className="flex-row items-center px-2 py-1 rounded mr-2 mb-2"
                      style={{ backgroundColor: getBudgetItemTagColor(tag) }}
                    >
                      <FontAwesome6 name={getTagIcon(tag) as any} size={12} color="white" />
                      <ThemedText type="default" className="ml-1 text-white">
                        {formatTagDisplay(tag)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View className="mt-2 border-t border-background-tertiary pt-2">
              <TextIconRow
                icon="building"
                text="Merchant"
                value={budgetItemState.merchant ? budgetItemState.merchant.name : 'No merchant linked'}
              />

              <TextIconRow
                icon="bank"
                text="Funding Account"
                value={fundingAccount ? fundingAccount.name : 'No funding account'}
                borderBottom={false}
              />
            </View>
          </Card>

          <View className="mt-6">
            <ThemedText type="defaultSemiBold" className="mb-2">
              Linked Transactions ({budgetItemState.linkedTransactions.length})
            </ThemedText>
            <View className="bg-background-secondary rounded-lg overflow-hidden">
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
            </View>
          </View>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
