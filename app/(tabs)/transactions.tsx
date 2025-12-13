import { useState, useCallback, useMemo } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText, Header } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import IconCircle from '@/components/ui/icon-circle';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useObservableCollection } from '@/hooks/use-observable';
import { useModelWithRelations } from '@/hooks/use-model-with-relations';
import database from '@/model/database';
import Transaction from '@/model/models/transaction';
import dayjs, { parseDateOnly, formatDateOnly } from '@/helpers/dayjs';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GroupedTransaction {
  date: string;
  dateLabel: string;
  transactions: Transaction[];
  total: number;
}

interface TransactionRowProps {
  transaction: Transaction;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const {
    model: observedTransaction,
    relations: { account },
  } = useModelWithRelations(transaction, ['account'] as const);
  const formatMoney = useMoneyFormatter();

  const merchantName = observedTransaction.merchantName || observedTransaction.name;
  const iconInput =
    observedTransaction.logoUrl || observedTransaction.personalFinanceCategoryIconUrl || merchantName?.[0] || '?';

  // Get account mask for display
  const accountMask = account?.mask ? `(...${account.mask})` : '';
  const accountType = account?.type?.toUpperCase().replace('_', ' ') || 'ACCOUNT';

  return (
    <View className="flex-row items-center py-3 px-4 border-b border-border">
      <IconCircle
        input={iconInput}
        size={40}
        color="white"
        backgroundColor="bg-myColors-Colors-primary"
        borderSize={0}
        opacity={100}
      />
      <View className="flex-1 ml-3">
        <ThemedText numberOfLines={1} ellipsizeMode="tail">
          {merchantName}
        </ThemedText>
        <ThemedText type="subText" className="mt-1">
          {accountType} {accountMask}
        </ThemedText>
      </View>
      <ThemedText className="ml-2 text-right min-w-[80px]">{formatMoney(observedTransaction.amount)}</ThemedText>
    </View>
  );
}

export default function TransactionsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const colorScheme = useColorScheme();
  const formatMoney = useMoneyFormatter();

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => dayjs().subtract(2, 'month').startOf('day'));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [previousOldestDate, setPreviousOldestDate] = useState<string | null>(null);

  // Query transactions - fetch all and filter in memory for now
  // In production, you might want to use WatermelonDB's Q.where with date comparisons
  const allTransactions = useObservableCollection(database.get<Transaction>('transactions').query().observe());

  // Filter and process transactions
  const { pendingTransactions, groupedTransactions, oldestDate } = useMemo(() => {
    const endDate = dayjs().endOf('day');

    // Filter transactions by date range and search
    const filtered = allTransactions.filter(tx => {
      const txDate = parseDateOnly(tx.date);
      if (!txDate) return false;

      // Check if transaction is within our date range
      const isInRange = txDate.isSameOrAfter(startDate) && txDate.isSameOrBefore(endDate);

      // Check search query
      const matchesSearch =
        !searchQuery ||
        tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.merchantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.accountId.toLowerCase().includes(searchQuery.toLowerCase());

      return isInRange && matchesSearch;
    });

    // Separate pending and posted
    const pending = filtered
      .filter(tx => tx.pending)
      .sort((a, b) => {
        const dateA = parseDateOnly(a.date);
        const dateB = parseDateOnly(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.valueOf() - dateA.valueOf(); // Most recent first
      });

    const posted = filtered
      .filter(tx => !tx.pending)
      .sort((a, b) => {
        const dateA = parseDateOnly(a.date);
        const dateB = parseDateOnly(b.date);
        if (!dateB || !dateA) return 0;
        return dateB.valueOf() - dateA.valueOf(); // Most recent first
      });

    // Group posted transactions by date
    const grouped: GroupedTransaction[] = [];
    const dateMap = new Map<string, Transaction[]>();

    posted.forEach(tx => {
      const txDate = parseDateOnly(tx.date);
      if (!txDate) return;

      const dateKey = formatDateOnly(txDate);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(tx);
    });

    // Convert to array and format
    dateMap.forEach((transactions, dateKey) => {
      const txDate = parseDateOnly(dateKey);
      if (!txDate) return;

      const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const dateLabel = txDate.format('dddd, MMMM D');

      grouped.push({
        date: dateKey,
        dateLabel,
        transactions,
        total,
      });
    });

    // Sort by date descending
    grouped.sort((a, b) => {
      const dateA = parseDateOnly(a.date);
      const dateB = parseDateOnly(b.date);
      if (!dateA || !dateB) return 0;
      return dateB.valueOf() - dateA.valueOf();
    });

    // Find oldest date in filtered results
    const dates = filtered.map(tx => parseDateOnly(tx.date)).filter(Boolean) as dayjs.Dayjs[];
    const oldest =
      dates.length > 0 ? dates.reduce((oldest, current) => (current.isBefore(oldest) ? current : oldest)) : null;

    return {
      pendingTransactions: pending,
      groupedTransactions: grouped,
      oldestDate: oldest,
    };
  }, [allTransactions, startDate, searchQuery]);

  // Calculate pending total
  const pendingTotal = useMemo(() => {
    return pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [pendingTransactions]);

  // Load more transactions (extend date range backwards)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreData || !oldestDate) return;

    const oldestDateStr = formatDateOnly(oldestDate);
    // If oldestDate hasn't changed, we didn't find new transactions, so stop loading
    if (previousOldestDate === oldestDateStr) {
      setHasMoreData(false);
      return;
    }

    setIsLoadingMore(true);
    try {
      // Extend the start date backwards by 2 more months
      const newStartDate = oldestDate.subtract(2, 'month').startOf('day');
      setStartDate(newStartDate);
      setPreviousOldestDate(oldestDateStr);

      // Check if we've reached a reasonable limit (e.g., 2 years back)
      const twoYearsAgo = dayjs().subtract(2, 'year');
      if (newStartDate.isBefore(twoYearsAgo)) {
        setHasMoreData(false);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreData, oldestDate, previousOldestDate]);

  // Handle scroll to end
  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 200;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom && hasMoreData && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMoreData, isLoadingMore, loadMore]
  );

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={<ThemedText type="subtitle">Transactions</ThemedText>}
      />

      <AnimatedScrollView animatedRef={animatedRef} onScroll={handleScroll} scrollEventThrottle={400}>
        <View className="h-full p-4">
          {/* Search Bar */}
          <View className="mb-4">
            <View className="flex-row items-center bg-background-secondary rounded-lg px-4 py-3 border border-border">
              <TextInput
                className="flex-1 text-text"
                placeholder="Search"
                placeholderTextColor={colorScheme === 'light' ? Colors.light.textSecondary : Colors.dark.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ fontSize: 16 }}
              />
              <FontAwesome6
                name="magnifying-glass"
                size={20}
                color={colorScheme === 'light' ? Colors.light.icon : Colors.dark.icon}
              />
            </View>
          </View>

          {/* Pending Transactions Section */}
          {pendingTransactions.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <ThemedText type="subtitle" className="font-bold">
                  Pending Transactions
                </ThemedText>
                <ThemedText type="subtitle" className="font-bold">
                  {formatMoney(pendingTotal)}
                </ThemedText>
              </View>
              <View className="bg-background-secondary rounded-xl overflow-hidden">
                {pendingTransactions.map(transaction => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </View>
            </View>
          )}

          {/* Grouped Transactions by Date */}
          {groupedTransactions.map(group => (
            <View key={group.date} className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <ThemedText type="subtitle" className="font-bold">
                  {group.dateLabel}
                </ThemedText>
                <ThemedText type="subtitle" className="font-bold">
                  {formatMoney(group.total)}
                </ThemedText>
              </View>
              <View className="bg-background-secondary rounded-xl overflow-hidden">
                {group.transactions.map(transaction => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </View>
            </View>
          ))}

          {/* Loading More Indicator */}
          {isLoadingMore && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}

          {/* No More Data Indicator */}
          {!hasMoreData && groupedTransactions.length > 0 && (
            <View className="py-4 items-center">
              <ThemedText type="subText" className="opacity-60">
                No more transactions
              </ThemedText>
            </View>
          )}

          {/* Empty State */}
          {!isLoadingMore && pendingTransactions.length === 0 && groupedTransactions.length === 0 && (
            <View className="py-12 items-center">
              <ThemedText type="subText" className="opacity-60">
                {searchQuery ? 'No transactions found' : 'No transactions yet'}
              </ThemedText>
            </View>
          )}
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
