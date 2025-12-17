import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText, Header } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import { SearchInput } from '@/components/ui/inputs/search-input';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useObservableCollection } from '@/hooks/use-observable';
import { EnhancedTransactionRow, DateHeader, PendingHeader } from '@/components/transaction';
import database from '@/model/database';
import Transaction from '@/model/models/transaction';
import dayjs from '@/helpers/dayjs';
import { Colors } from '@/constants/colors';
import { Q } from '@nozbe/watermelondb';
import { FlashList } from '@shopify/flash-list';

type ListItem =
  | { type: 'pending-header' }
  | { type: 'pending-transaction'; transaction: Transaction }
  | { type: 'date-header'; date: string; dateLabel: string; total: number; formatMoney: (amount: number) => string }
  | { type: 'transaction'; transaction: Transaction };

export default function TransactionsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const [oldestDate, setOldestDate] = useState(() => dayjs().subtract(2, 'month').startOf('day'));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  const [debouncedQuery, setDebouncedQuery] = useState('');

  const formatMoney = useMoneyFormatter();

  // Only subscribe to transactions when screen is focused
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  // Query transactions from oldestDate to today, sorted by date descending (newest first)
  // Only create observable when focused to prevent unnecessary re-renders
  const transactionsQuery = useMemo(() => {
    if (!isFocused) return null;

    const searchQuery = debouncedQuery.trim().toLowerCase();

    const query = database
      .get<Transaction>('transactions')
      .query(
        Q.where('date', Q.gte(oldestDate.toISOString())),
        Q.where('date', Q.lte(dayjs().endOf('day').toISOString())),
        Q.where('name', Q.like(`${Q.sanitizeLikeString(searchQuery)}%`)),
        Q.sortBy('date', Q.desc)
      );

    return query.observe();
  }, [isFocused, oldestDate, debouncedQuery]);

  const transactions = useObservableCollection(transactionsQuery);

  // Group transactions by day and separate pending transactions
  const groupedData = useMemo(() => {
    const items: ListItem[] = [];
    const pending: Transaction[] = [];
    const byDate = new Map<string, Transaction[]>();

    // Separate pending and group by date
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

    // Sort pending by date descending
    pending.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    // Add pending section if there are pending transactions
    if (pending.length > 0) {
      items.push({ type: 'pending-header' });
      pending.forEach(tx => {
        items.push({ type: 'pending-transaction', transaction: tx });
      });
    }

    // Sort dates descending (newest first)
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => {
      return dayjs(b).valueOf() - dayjs(a).valueOf();
    });

    // Add date headers and transactions
    sortedDates.forEach(dateKey => {
      const date = dayjs(dateKey);
      const isToday = date.isSame(dayjs(), 'day');
      const isYesterday = date.isSame(dayjs().subtract(1, 'day'), 'day');

      let dateLabel: string;
      if (isToday) {
        dateLabel = 'Today';
      } else if (isYesterday) {
        dateLabel = 'Yesterday';
      } else if (date.isSame(dayjs(), 'year')) {
        dateLabel = date.format('MMMM D');
      } else {
        dateLabel = date.format('MMMM D, YYYY');
      }
      items.push({
        type: 'date-header',
        date: dateKey,
        dateLabel,
        total: byDate.get(dateKey)!.reduce((acc, tx) => acc + tx.amount, 0),
        formatMoney,
      });

      const dayTransactions = byDate.get(dateKey)!;
      dayTransactions.forEach(tx => {
        items.push({ type: 'transaction', transaction: tx });
      });
    });

    return items;
  }, [transactions, formatMoney]);

  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || isLoadingMore) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    // Extend the date range by 1 more month going back in time
    setOldestDate(prev => {
      const newDate = dayjs(prev).subtract(1, 'month').startOf('day');
      // Reset loading state after a short delay to allow query to update
      setTimeout(() => {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }, 500);
      return newDate;
    });
  }, [isLoadingMore]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.value = event.nativeEvent.contentOffset.y;
    },
    [scrollOffset]
  );

  const ListFooter = useMemo(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const ListHeader = useMemo(
    () => (
      <View className="w-full px-4">
        <View className="mb-4">
          <SearchInput onQueryChange={setDebouncedQuery} placeholder="Search transactions" />
        </View>
      </View>
    ),
    []
  );

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.tertiary}
        centerComponent={<ThemedText type="subtitle">Transactions</ThemedText>}
      />
      <View className="w-full h-full">
        <FlashList
          ref={animatedRef}
          data={groupedData}
          ListHeaderComponent={ListHeader}
          keyExtractor={(item, index) => {
            if (item.type === 'pending-header') return 'pending-header';
            if (item.type === 'pending-transaction') return `pending-${item.transaction.id}`;
            if (item.type === 'date-header') return `date-${item.date}`;
            return item.transaction.id;
          }}
          renderItem={({ item }) => {
            if (item.type === 'pending-header') {
              return <PendingHeader />;
            }
            if (item.type === 'pending-transaction' || item.type === 'transaction') {
              return <EnhancedTransactionRow transaction={item.transaction} />;
            }
            if (item.type === 'date-header') {
              return <DateHeader dateLabel={item.dateLabel} total={item.total} formatMoney={formatMoney} />;
            }
            return null;
          }}
          getItemType={item => item.type}
          onEndReachedThreshold={0.5}
          onEndReached={handleLoadMore}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ paddingTop: 100 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ marginBottom: 48 }}
        />
      </View>
    </BackgroundContainer>
  );
}
