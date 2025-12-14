import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Pressable, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { ThemedText, Header } from '@/components/shared';
import { BackgroundContainer } from '@/components/ui/background-container';
import IconCircle from '@/components/ui/icon-circle';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useObservableCollection } from '@/hooks/use-observable';
import { useModelWithRelations } from '@/hooks/use-model-with-relations';
import database from '@/model/database';
import Transaction from '@/model/models/transaction';
import Item from '@/model/models/item';
import dayjs from '@/helpers/dayjs';
import { Colors } from '@/constants/colors';
import { Q } from '@nozbe/watermelondb';
import { FlashList } from '@shopify/flash-list';
import Account from '@/model/models/account';
import Category from '@/model/models/category';

type ListItem =
  | { type: 'pending-header' }
  | { type: 'pending-transaction'; transaction: Transaction }
  | { type: 'date-header'; date: string; dateLabel: string; total: number; formatMoney: (amount: number) => string }
  | { type: 'transaction'; transaction: Transaction };

interface TransactionRowProps {
  transaction: Transaction;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const formatMoney = useMoneyFormatter();
  const { model: observedTransaction, relations } = useModelWithRelations(transaction, ['category']);

  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [account, setAccount] = useState<Account | null>(null);
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    async function loadItem() {
      const acc = await observedTransaction.account.fetch();
      if (acc) {
        const item = await acc.item.fetch();
        setItem(item as Item);
      }
      const cat = await observedTransaction.category.fetch();
      if (cat) {
        setCategory(cat as Category);
      }
    }

    loadItem();
  }, [observedTransaction]);

  const isNegative = observedTransaction.amount < 0;
  const amountColor = isNegative ? 'text-red-500' : 'text-green-500';

  const icon = useMemo(() => {
    return (
      observedTransaction.logoUrl ??
      item?.institutionLogo ??
      category?.icon ??
      observedTransaction.merchantName?.[0] ??
      observedTransaction.name[0] ??
      '?'
    );
  }, [item, category, observedTransaction]);

  return (
    <Pressable
      className="flex-row bg-background-tertiary border-t-background-secondary h-16"
      style={{ borderTopWidth: 1 }}
    >
      <View className="w-full flex-row items-center px-3">
        <View className="mr-3">
          <IconCircle input={icon} size={32} borderSize={1} />
        </View>
        <View className="flex-1 flex-col justify-center mr-2">
          <ThemedText type="defaultSemiBold" numberOfLines={1} ellipsizeMode="tail">
            {observedTransaction.name}
          </ThemedText>
          <ThemedText type="subText" numberOfLines={1} ellipsizeMode="tail">
            {category?.name ?? 'Uncategorized'}
            {observedTransaction.pending && ' • Pending'}
          </ThemedText>
        </View>
        <View className="items-end">
          <ThemedText type="defaultSemiBold" className={amountColor}>
            {formatMoney(observedTransaction.amount)}
          </ThemedText>
          {account && (
            <ThemedText type="subText" numberOfLines={1} ellipsizeMode="tail">
              {account.name}
              {item?.institutionName ? ` • ${item.institutionName}` : ''}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function DateHeader({
  dateLabel,
  total,
  formatMoney,
}: {
  dateLabel: string;
  total: number;
  formatMoney: (amount: number) => string;
}) {
  return (
    <View className="bg-background-secondary px-4 py-2 flex-row w-full">
      <ThemedText type="subtitle" className="text-text-secondary">
        {dateLabel}
      </ThemedText>
      <ThemedText type="subtitle" className="ml-auto">
        {formatMoney(total)}
      </ThemedText>
    </View>
  );
}

function PendingHeader() {
  return (
    <View className="bg-background-secondary px-4 py-2">
      <ThemedText type="subtitle" className="text-text-secondary">
        Pending
      </ThemedText>
    </View>
  );
}

export default function TransactionsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const [oldestDate, setOldestDate] = useState(() => dayjs().subtract(2, 'month').startOf('day'));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const formatMoney = useMoneyFormatter();

  // Query transactions from oldestDate to today, sorted by date descending (newest first)
  const transactions = useObservableCollection(
    database
      .get<Transaction>('transactions')
      .query(
        Q.where('date', Q.gte(oldestDate.toISOString())),
        Q.where('date', Q.lte(dayjs().endOf('day').toISOString())),
        Q.sortBy('date', Q.desc)
      )
      .observe()
  );

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

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={<ThemedText type="subtitle">Transactions</ThemedText>}
      />

      <FlashList
        ref={animatedRef}
        data={groupedData}
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
            return <TransactionRow transaction={item.transaction} />;
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
    </BackgroundContainer>
  );
}
