import { Header, ThemedText } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/colors';
import { useObservable, useObservableCollection } from '@/hooks/use-observable';
import { useComputedState } from '@/hooks/use-computed-state';
import database from '@/model/database';
import BudgetItem, { BudgetItemState, BudgetItemTag } from '@/model/models/budget-item';
import Account from '@/model/models/account';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { TextIconRow } from '@/components/accounts';
import { FontAwesome6 } from '@expo/vector-icons';
import { getBudgetItemTagColor } from '@/utils/budget-item-colors';
import { EnhancedTransactionRow } from '@/components/transaction';
import dayjs from '@/helpers/dayjs';
import { Q } from '@nozbe/watermelondb';

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
  return tag.replace(/\b\w/g, l => l.toUpperCase());
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
        backgroundHex={Colors.secondary}
        centerComponent={<ThemedText type="subtitle">{budgetItemState.name}</ThemedText>}
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="p-4">
          <Card backgroundColor="secondary" className="mt-6">
            <View className="flex-col items-center justify-center">
              <ThemedText type="defaultSemiBold" className="text-center">
                Amount
              </ThemedText>
              <AnimatedNumber value={budgetItemState.amount} />
            </View>

            {(budgetItemState.tags.length > 0 || budgetItemState.dueDate) && (
              <View className="mt-4 border-t border-background-tertiary pt-4">
                <ThemedText type="defaultSemiBold" className="mb-2 text-center">
                  Tags
                </ThemedText>
                <View className="flex-row flex-wrap items-center justify-center">
                  {budgetItemState.dueDate && (
                    <View
                      key="due-date"
                      className="flex-row items-center px-2 py-1 rounded mr-2 mb-2"
                      style={{ backgroundColor: Colors.tertiary }}
                    >
                      <FontAwesome6 name="calendar" size={12} color="white" />
                      <ThemedText type="default" className="ml-1 text-white">
                        Due {dayjs(budgetItemState.dueDate).format('MMM D')}
                      </ThemedText>
                    </View>
                  )}
                  {budgetItemState.tags.map((tag, index) => (
                    <View
                      key={index}
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
