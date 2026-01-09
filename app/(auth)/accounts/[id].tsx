import { TextIconRow, BalanceLineChart, type FocusedBalance } from '@/components/accounts';
import { Header, ThemedText } from '@/components/shared';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { BackgroundContainer } from '@/components/ui/background-container';
import { AnimatedNumber } from '@/components/ui/animated-number';
import IconCircle from '@/components/ui/icon-circle';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/colors';
import { useModelWithRelations } from '@/hooks/use-model-with-relations';
import { useObservable, useObservableCollection } from '@/hooks/use-observable';
import database from '@/model/database';
import Account from '@/model/models/account';
import AccountDailyBalance from '@/model/models/account-daily-balance';
import Transaction from '@/model/models/transaction';
import { EnhancedTransactionRow, DateHeader, PendingHeader } from '@/components/transaction';
import { useMoneyFormatter } from '@/hooks/format-money';
import dayjs from '@/helpers/dayjs';
import { FontAwesome } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { SpendingByCategoryCard } from '@/components/home/spending/spending-by-category-card';
import { CreditUtilizationCard } from '@/components/budgets/credit-utilization-card';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { useDependency } from '@/context/dependencyContext';
import { PlaidService } from '@/services';

export default function AccountDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const accountObservable = useMemo(() => (id ? database.get<Account>('accounts').findAndObserve(id) : null), [id]);
  const account = useObservable(accountObservable);

  if (!account) {
    return (
      <BackgroundContainer>
        <Header
          leftIcon="arrow-left"
          scrollOffset={scrollOffset}
          backgroundHex={Colors.quinary}
          centerComponent={<ThemedText type="subtitle">Loading...</ThemedText>}
        />
      </BackgroundContainer>
    );
  }

  return <AccountDetailsContent account={account} />;
}

function AccountDetailsContent({ account }: { account: Account }) {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const { model: observedAccount, relations } = useModelWithRelations(account, ['item'] as const);
  const item = relations.item;
  const { plaidApi } = useDependency();

  const dailyBalancesObservable = useMemo(() => {
    const thirtyDaysAgo = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
    return database
      .get<AccountDailyBalance>('account_daily_balances')
      .query(Q.where('account_id', account.accountId), Q.where('date', Q.gte(thirtyDaysAgo)), Q.sortBy('date', Q.asc))
      .observe();
  }, [account.accountId]);
  const dailyBalances = useObservableCollection(dailyBalancesObservable);

  const transactionsObservable = useMemo(() => {
    const thirtyDaysAgo = dayjs().subtract(30, 'days').startOf('day').toISOString();
    return database
      .get<Transaction>('transactions')
      .query(Q.where('account_id', account.accountId), Q.where('date', Q.gte(thirtyDaysAgo)), Q.sortBy('date', Q.desc))
      .observe();
  }, [account.accountId]);
  const transactions = useObservableCollection(transactionsObservable);

  const formatMoney = useMoneyFormatter();

  // Group transactions by date with pending separated
  const groupedTransactions = useMemo(() => {
    const pending: Transaction[] = [];
    const byDate = new Map<string, Transaction[]>();

    transactions.forEach(tx => {
      if (tx.pending) {
        pending.push(tx);
      } else {
        const dateKey = dayjs(tx.date).format('YYYY-MM-DD');
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
        }
        byDate.get(dateKey)!.push(tx);
      }
    });

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf());

    return { pending, byDate, sortedDates };
  }, [transactions]);

  const getDateLabel = (dateKey: string) => {
    const date = dayjs(dateKey);
    const isToday = date.isSame(dayjs(), 'day');
    const isYesterday = date.isSame(dayjs().subtract(1, 'day'), 'day');

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    if (date.isSame(dayjs(), 'year')) return date.format('MMMM D');
    return date.format('MMMM D, YYYY');
  };

  const [focusedBalance, setFocusedBalance] = useState<FocusedBalance | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFocusChange = useCallback((balance: FocusedBalance | null) => {
    setFocusedBalance(balance);
  }, []);

  const handleManualRefresh = useCallback(() => {
    if (!item?.plaidItemId || isRefreshing) {
      return;
    }

    Alert.alert('Refresh account?', 'This will pull the latest balances and transactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Refresh',
        onPress: async () => {
          setIsRefreshing(true);
          try {
            const plaidService = new PlaidService(plaidApi, database);
            await plaidService.refeshItem(item.plaidItemId);
            Alert.alert('Success', 'Account refreshed');
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to refresh account');
          } finally {
            setIsRefreshing(false);
          }
        },
      },
    ]);
  }, [item?.plaidItemId, isRefreshing, plaidApi]);

  const displayBalance = focusedBalance?.value ?? observedAccount.balanceCurrent;
  const displayDate = focusedBalance
    ? new Date(focusedBalance.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const isInErrorState = item?.status === 'ERROR';
  const liability = observedAccount.getLiabilityData();

  const color = item?.institutionPrimaryColor?.replace('"', '').replace('"', '') ?? Colors.primary;

  return (
    <BackgroundContainer>
      <Header
        leftIcon="arrow-left"
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={
          <View className="flex-row items-center">
            <IconCircle input={item?.institutionLogo ?? account?.name?.[0] ?? ''} color="white" size={28} />
            <ThemedText type="subtitle" color="white" className="font-semibold text-typography-900 ml-1 ">
              {account?.name}
            </ThemedText>
          </View>
        }
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="p-4">
          <Card backgroundColor="secondary" padding="lg" className="flex-none">
            <View className="flex-row">
              <View className="flex-col justify-center">
                <View className="flex-row items-center">
                  <ThemedText type="defaultSemiBold">{displayDate || 'Account Balance'}</ThemedText>
                  {!displayDate && (
                    <FontAwesome name="info-circle" size={12} color={Colors.dark.textSecondary} className="ml-1" />
                  )}
                </View>
                <AnimatedNumber value={displayBalance ?? 0} />
              </View>
              <Pressable
                className="flex-col ml-auto items-end justify-center"
                onPress={handleManualRefresh}
                disabled={!item?.plaidItemId || isRefreshing}
              >
                <ThemedText type="subText">Last Synced</ThemedText>
                <ThemedText type="default">
                  {isRefreshing
                    ? 'Refreshing...'
                    : item?.lastSuccessfulUpdate
                      ? `${item.calcTimeSinceLastSync()} ago`
                      : 'Updating'}
                </ThemedText>
              </Pressable>
            </View>

            <View className="mt-2">
              <BalanceLineChart
                dailyBalances={dailyBalances}
                onFocusChange={handleFocusChange}
                lineColor={color}
                containerPadding={0}
              />
            </View>
          </Card>

          {liability && (
            <View className="mt-6">
              <CreditUtilizationCard
                currentBalance={observedAccount.balanceCurrent}
                availableBalance={observedAccount.balanceAvailable ?? 0}
                liability={liability}
              />
            </View>
          )}

          {isInErrorState && (
            <TextIconRow
              icon="refresh"
              text="Refresh"
              value={item?.status ?? ''}
              valueType="default"
              borderBottom={false}
            />
          )}

          {transactions.length > 0 && (
            <View className="mt-8">
              <ThemedText type="defaultSemiBold" className="mb-2 text-text-secondary">
                Spending by Category
              </ThemedText>
              <SpendingByCategoryCard transactions={transactions} title="" />
            </View>
          )}

          {transactions.length > 0 && (
            <View className="mt-5">
              <ThemedText type="defaultSemiBold" className="mb-2 text-text-secondary">
                Recent Transactions
              </ThemedText>
              <Card backgroundColor="secondary" padding="md" className="flex-none">
                {groupedTransactions.pending.length > 0 && (
                  <>
                    <PendingHeader />
                    {groupedTransactions.pending.map(tx => (
                      <EnhancedTransactionRow key={tx.id} transaction={tx} />
                    ))}
                  </>
                )}

                {groupedTransactions.sortedDates.map(dateKey => {
                  const dayTransactions = groupedTransactions.byDate.get(dateKey)!;
                  const total = dayTransactions.reduce((acc, tx) => acc + tx.amount, 0);

                  return (
                    <View key={dateKey}>
                      <DateHeader dateLabel={getDateLabel(dateKey)} total={total} formatMoney={formatMoney} />
                      {dayTransactions.map(tx => (
                        <EnhancedTransactionRow key={tx.id} transaction={tx} />
                      ))}
                    </View>
                  );
                })}
              </Card>
            </View>
          )}

          <View className="mt-10">
            <ThemedText type="defaultSemiBold" className="mb-2">
              Account Details
            </ThemedText>
            <Card backgroundColor="secondary" padding="md" className="flex-none">
              <TextIconRow icon="bank" text="Type" value={observedAccount.subtype} />
              <TextIconRow icon="info-circle" text="Status" value={item?.status ?? ''} valueType="default" />
              <TextIconRow
                icon="clock-o"
                text="Last Local Refresh"
                value={item?.lastLocalRefresh ? dayjs(item.lastLocalRefresh).format('MM/DD/YY HH:mm:ss') : ''}
                valueType="default"
              />
              <TextIconRow
                icon="check-circle"
                text="Last Successful Update"
                value={item?.lastSuccessfulUpdate ? dayjs(item.lastSuccessfulUpdate).format('MM/DD/YY HH:mm:ss') : ''}
                valueType="default"
                borderBottom={false}
              />
            </Card>
          </View>
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
