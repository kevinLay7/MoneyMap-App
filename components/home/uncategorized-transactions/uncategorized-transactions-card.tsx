import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ThemedText } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import IconCircle from '@/components/ui/icon-circle';
import { CategorySlectorModal } from '@/components/ui/inputs/category-selector-modal';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useModelWithRelations } from '@/hooks/use-model-with-relations';
import { TransactionService } from '@/services/transaction-service';
import database from '@/model/database';
import Transaction from '@/model/models/transaction';
import Category from '@/model/models/category';

// Constants
const WIDTH_MULTIPLIER = 15;
const DESIRED_WINDOW_SIZE = 3;

// Types
interface UncategorizedTransaction {
  transaction: Transaction;
  hasBeenProcessed: boolean;
}

interface Position {
  min: number;
  max: number;
}

interface UncategorizedTransactionItemProps {
  readonly transaction: Transaction;
  readonly zIndex: number;
  readonly width: number;
  readonly onCategorized: () => void;
  readonly transactionService?: TransactionService;
}

// Components
function UncategorizedTransactionItem({
  transaction,
  zIndex,
  width,
  onCategorized,
  transactionService,
}: UncategorizedTransactionItemProps) {
  const {
    model: observedTransaction,
    relations: { category },
  } = useModelWithRelations(transaction, ['category'] as const);

  const formatMoney = useMoneyFormatter();
  const cardOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);
  const animatedTop = useSharedValue(10 + -zIndex * 5);
  const animatedLeft = useSharedValue(-(zIndex * WIDTH_MULTIPLIER) / 2);
  const animatedWidth = useSharedValue(width);
  const animatedBottom = useSharedValue(-zIndex * 10);
  const animatedZIndex = useSharedValue(zIndex);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const [showModal, setShowModal] = useState(false);

  // Animate when zIndex changes
  useEffect(() => {
    animatedTop.value = withTiming(10 + -zIndex * 5, { duration: 300 });
    animatedLeft.value = withTiming(-(zIndex * WIDTH_MULTIPLIER) / 2, { duration: 300 });
    animatedWidth.value = withTiming(width, { duration: 300 });
    animatedBottom.value = withTiming(-zIndex * 10, { duration: 300 });
    animatedZIndex.value = zIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zIndex, width]);

  useEffect(() => {
    setSelectedCategory(category);
  }, [category]);

  const cardStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      position: 'absolute',
      top: `${animatedTop.value}%`,
      left: animatedLeft.value,
      bottom: animatedBottom.value,
      width: animatedWidth.value,
      zIndex: animatedZIndex.value,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  async function categorizeTransaction() {
    await transactionService?.categorizeTransaction(transaction, selectedCategory);
    overlayOpacity.value = withTiming(1, { duration: 400 });
    cardOpacity.value = withTiming(0, { duration: 400 }, () => scheduleOnRN(onCategorized));
  }

  return (
    <Animated.View style={cardStyle}>
      <Card variant="elevated" rounded="xl" backgroundColor="tertiary" className="w-full h-52 px-4">
        <View className="flex-row items-center">
          <View className="flex-col flex-1 mr-2">
            <ThemedText numberOfLines={2} ellipsizeMode="tail">
              {observedTransaction.name}
            </ThemedText>
            <ThemedText type="subText">{observedTransaction.date}</ThemedText>
          </View>
          <ThemedText className="ml-auto w-1/3 text-right">{formatMoney(observedTransaction.amount)}</ThemedText>
        </View>
        <View
          className="h-12 flex-row items-center w-full border-dashed border-zinc-400 px-2 mt-4"
          style={{ borderWidth: 1 }}
        >
          <IconCircle
            input={selectedCategory?.icon ?? ''}
            size={24}
            color="white"
            backgroundColor="transparent"
            borderSize={0}
            opacity={100}
          />
          <ThemedText type="subText">{selectedCategory ? selectedCategory.name : 'Uncategorized'}</ThemedText>
        </View>
        <View className="flex-row mt-auto">
          <Button
            title="Categorize"
            size="sm"
            width="w-1/3"
            color="white"
            onPress={() => {
              setShowModal(true);
            }}
          />
          <Button
            title="Looks Good"
            size="sm"
            width="w-1/3"
            color="success"
            className="ml-auto"
            onPress={categorizeTransaction}
          />
        </View>
        <Animated.View
          style={[
            overlayStyle,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(114 114 114 / 0.8)',
              borderRadius: 12,
            },
          ]}
          pointerEvents="none"
        />
      </Card>

      <CategorySlectorModal
        isVisible={showModal}
        onClose={() => setShowModal(false)}
        onSelectCategory={category => setSelectedCategory(category)}
      />
    </Animated.View>
  );
}

// Main Component
export function UncategorizedTransactionsCard() {
  const transactionService = new TransactionService(database);

  // State
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<UncategorizedTransaction[]>([]);
  const [position, setPosition] = useState<Position>({ min: 0, max: 0 });
  const [displayItems, setDisplayItems] = useState<UncategorizedTransaction[]>([]);
  const [viewWidth, setViewWidth] = useState<number>(0);

  // Navigation helpers
  function moveRight() {
    const { min, max } = position;
    const total = uncategorizedTransactions.length;

    if (total === 0) return;

    // If at the end of the list, clear the list so the card will be removed
    if (min === uncategorizedTransactions.length - 1 && max === uncategorizedTransactions.length) {
      setUncategorizedTransactions([]);
      return;
    }

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

    // Expand window from left if smaller than desired
    if (windowSize < DESIRED_WINDOW_SIZE) {
      setPosition({ min: min - 1, max });
      return;
    }

    // Move window left, maintaining size
    setPosition({ min: min - 1, max: max - 1 });
  }

  // Effects
  useEffect(() => {
    const fetchUncategorizedTransactions = async () => {
      const transactions = await transactionService.fetchUncategorizedTransactions();

      setUncategorizedTransactions(transactions.map(transaction => ({ transaction, hasBeenProcessed: false })));

      // Initialize position based on transaction count
      if (transactions.length > 0) {
        const initialMax = Math.min(transactions.length, DESIRED_WINDOW_SIZE);
        setPosition({ min: 0, max: initialMax });
      }
    };

    fetchUncategorizedTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        className="h-64"
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

      <View className="flex-row mt-6 h-6 px-4">
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
