import { ThemedText } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { TransactionService } from '@/services/transaction-service';
import database from '@/model/database';
import { useEffect, useState } from 'react';
import Transaction from '@/model/models/transaction';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { scheduleOnRN } from 'react-native-worklets';
import { useMoneyFormatter } from '@/hooks/format-money';

const WIDTH_MULTIPLIER = 15;

function UncategorizedTransactionItem({
  transaction,
  zIndex,
  width,
  onCategorized,
  transactionService,
}: {
  transaction: Transaction;
  zIndex: number;
  width: number;
  onCategorized: () => void;
  transactionService?: TransactionService;
}) {
  const formatMoney = useMoneyFormatter();
  const cardOpacity = useSharedValue(1);
  const multiplier = zIndex * WIDTH_MULTIPLIER;

  const cardStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      position: 'absolute',
      top: `${10 + -zIndex * 5}%`,
      left: -multiplier / 2,
      bottom: -zIndex * 10,
      width: width,
      zIndex: zIndex,
    };
  });

  async function categorizeTransaction() {
    await transactionService?.categorizeTransaction(transaction);
    cardOpacity.value = withTiming(0, { duration: 400 }, () => scheduleOnRN(onCategorized));
  }

  return (
    <Animated.View style={cardStyle}>
      <Card variant="elevated" rounded="xl" backgroundColor="tertiary" className="w-full h-36 px-4">
        <View className="flex-row items-center">
          <View className="flex-col">
            <ThemedText>{transaction.name}</ThemedText>
            <ThemedText type="subText">{transaction.date}</ThemedText>
          </View>
          <ThemedText className="ml-auto">{formatMoney(transaction.amount)}</ThemedText>
        </View>
        <View className="flex-row mt-auto">
          <Button title="Categorize" size="sm" width="w-1/3" color="white" onPress={() => {}} />
          <Button
            title="Looks Good"
            size="sm"
            width="w-1/3"
            color="success"
            className="ml-auto"
            onPress={categorizeTransaction}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

interface UncategorizedTransaction {
  transaction: Transaction;
  hasBeenProcessed: boolean;
}

export function UncategorizedTransactionsCard() {
  const transactionService = new TransactionService(database);

  const [position, setPosition] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  const [displayItems, setDisplayItems] = useState<UncategorizedTransaction[]>([]);
  const [viewWidth, setViewWidth] = useState<number>(0);

  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<UncategorizedTransaction[]>([]);

  function moveRight() {
    const { min, max } = position;
    const total = uncategorizedTransactions.length;

    if (total === 0) return;

    // At the end: can only shrink window from left
    if (max >= total) {
      if (min < max - 1) {
        setPosition({ min: min + 1, max });
      }
      return;
    }

    // Move window right
    setPosition({ min: min + 1, max: max + 1 });
  }

  function moveLeft() {
    const { min, max } = position;
    const total = uncategorizedTransactions.length;

    if (total === 0 || min === 0) return;

    const windowSize = max - min;

    // Expand window from left if smaller than desired (3 items)
    if (windowSize < 3) {
      setPosition({ min: min - 1, max });
      return;
    }

    // Move window left, maintaining size
    setPosition({ min: min - 1, max: max - 1 });
  }

  useEffect(() => {
    const fetchUncategorizedTransactions = async () => {
      const transactions = await transactionService.fetchUncategorizedTransactions();
      setUncategorizedTransactions(
        transactions.map((transaction, index) => ({ zIndex: index, transaction, hasBeenProcessed: false }))
      );

      if (transactions.length > 0 && transactions.length > 3) {
        setPosition({ min: 0, max: 3 });
      } else if (transactions.length > 0 && transactions.length <= 3) {
        setPosition({ min: 0, max: transactions.length });
      }
    };

    fetchUncategorizedTransactions();
  }, []);

  useEffect(() => {
    setDisplayItems(uncategorizedTransactions.slice(position.min, position.max));
  }, [position, uncategorizedTransactions]);

  if (uncategorizedTransactions.length === 0) {
    return null;
  }

  return (
    <Card variant="elevated" rounded="xl" backgroundColor="secondary" className="mb-4">
      <ThemedText type="subtitle">Review Transactions</ThemedText>

      <View
        className="h-48"
        onLayout={event => {
          const { width } = event.nativeEvent.layout;
          if (viewWidth === 0) {
            setViewWidth(width);
          }
        }}
      >
        {displayItems.map((transaction, index) => (
          <UncategorizedTransactionItem
            key={transaction.transaction.transactionId}
            transaction={transaction.transaction}
            zIndex={index * -1}
            width={viewWidth - index * WIDTH_MULTIPLIER}
            onCategorized={() => {
              moveRight();
            }}
            transactionService={transactionService}
          />
        ))}
      </View>

      <View className="flex-row mt-4 h-6 px-4">
        {position.min > 0 && (
          <Pressable onPress={moveLeft}>
            <ThemedText type="subText">Back</ThemedText>
          </Pressable>
        )}
        <ThemedText className="ml-auto" type="subText">
          {position.min + 1} of {uncategorizedTransactions.length}
        </ThemedText>
      </View>
    </Card>
  );
}
