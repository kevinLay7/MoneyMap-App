import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  Layout,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PieChart } from 'react-native-gifted-charts';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/shared';
import { EnhancedTransactionRow } from '@/components/transaction/transaction-row';
import { useMoneyFormatter } from '@/hooks/format-money';
import { Colors } from '@/constants/colors';
import Transaction from '@/model/models/transaction';
import { Card } from '@/components/ui/card';

const PIE_COLORS = [
  '#A855F7',
  '#3B82F6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#0EA5E9',
  '#8B5CF6',
  '#FF4D4F',
  '#FFA500',
  '#FFD700',
  '#FF8C00',
  '#FF4500',
  '#FF00FF',
] as const;

const UNCATEGORIZED_KEY = 'Uncategorized';

interface CategoryChildGroup {
  readonly key: string;
  readonly name: string;
  readonly total: number;
  readonly transactions: Transaction[];
}

interface CategoryParentGroup {
  readonly key: string;
  readonly name: string;
  readonly total: number;
  readonly color: string;
  readonly children: CategoryChildGroup[];
  readonly directTransactions: Transaction[];
}

interface SpendingByCategoryCardProps {
  readonly transactions: Transaction[];
  readonly title?: string;
  readonly withCard?: boolean;
}

type ChartMode = 'parents' | 'children' | 'transactions';

function formatCategoryLabel(value?: string | null): string {
  if (!value) return UNCATEGORIZED_KEY;
  const normalized = value.replace(/_/g, ' ').trim();
  if (!normalized) return UNCATEGORIZED_KEY;
  if (normalized === normalized.toUpperCase()) {
    return normalized.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  }
  return normalized;
}

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function formatTransactionLabel(transaction: Transaction) {
  return transaction.merchantName || transaction.name || 'Transaction';
}

export function SpendingByCategoryCard({
  transactions = [],
  title = 'Spending by Category',
  withCard = true,
}: SpendingByCategoryCardProps) {
  const formatMoney = useMoneyFormatter();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedParentKey, setSelectedParentKey] = useState<string | null>(null);
  const [selectedChildKey, setSelectedChildKey] = useState<string | null>(null);
  const [parentListHeight, setParentListHeight] = useState(0);
  const [childListHeight, setChildListHeight] = useState(0);
  const animatedListMinHeight = useSharedValue(0);

  const { parentGroups, totalSpending } = useMemo(() => {
    const parentMap = new Map<
      string,
      {
        total: number;
        childrenMap: Map<string, CategoryChildGroup>;
        directTransactions: Transaction[];
      }
    >();

    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        continue;
      }

      const primaryKey = transaction.personalFinanceCategoryPrimary || UNCATEGORIZED_KEY;
      const detailedKey = transaction.personalFinanceCategoryDetailed || '';
      const parentGroup =
        parentMap.get(primaryKey) ||
        (() => {
          const value = {
            total: 0,
            childrenMap: new Map<string, CategoryChildGroup>(),
            directTransactions: [],
          };
          parentMap.set(primaryKey, value);
          return value;
        })();

      parentGroup.total += amount;

      if (!detailedKey || detailedKey === primaryKey) {
        parentGroup.directTransactions.push(transaction);
        continue;
      }

      const childGroup =
        parentGroup.childrenMap.get(detailedKey) ||
        (() => {
          const value = {
            key: detailedKey,
            name: formatCategoryLabel(detailedKey),
            total: 0,
            transactions: [],
          };
          parentGroup.childrenMap.set(detailedKey, value);
          return value;
        })();

      childGroup.total += amount;
      childGroup.transactions.push(transaction);
    }

    const sortedParents = Array.from(parentMap.entries())
      .map(([key, value]) => {
        const children = Array.from(value.childrenMap.values()).sort((a, b) => b.total - a.total);
        return {
          key,
          name: formatCategoryLabel(key),
          total: value.total,
          children,
          directTransactions: value.directTransactions,
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((group, index) => ({
        ...group,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }));

    const total = sortedParents.reduce((sum, group) => sum + group.total, 0);

    return { parentGroups: sortedParents, totalSpending: total };
  }, [transactions]);

  const selectedParent = useMemo(
    () => parentGroups.find(group => group.key === selectedParentKey) || null,
    [parentGroups, selectedParentKey]
  );

  const selectedChild = useMemo(() => {
    if (!selectedParent || !selectedChildKey) return null;
    return selectedParent.children.find(child => child.key === selectedChildKey) || null;
  }, [selectedParent, selectedChildKey]);

  useEffect(() => {
    if (!selectedParentKey) return;
    if (!parentGroups.some(group => group.key === selectedParentKey)) {
      setSelectedParentKey(null);
      setSelectedChildKey(null);
    }
  }, [parentGroups, selectedParentKey]);

  useEffect(() => {
    if (!selectedChildKey) return;
    if (!selectedParent || !selectedParent.children.some(child => child.key === selectedChildKey)) {
      setSelectedChildKey(null);
    }
  }, [selectedParent, selectedChildKey]);

  const handleParentPress = useCallback(
    (key: string) => {
      setSelectedChildKey(null);
      setSelectedParentKey(prev => (prev === key ? null : key));
    },
    [setSelectedParentKey]
  );

  const handleChildPress = useCallback((key: string) => {
    setSelectedChildKey(prev => (prev === key ? null : key));
  }, []);

  const chartMode: ChartMode = selectedParent ? (selectedChild ? 'transactions' : 'children') : 'parents';

  const pieData = useMemo(() => {
    if (chartMode === 'parents') {
      return parentGroups
        .map(group => ({
          value: group.total,
          color: group.color,
          focused: group.key === selectedParentKey,
          onPress: () => handleParentPress(group.key),
        }))
        .filter(item => Number.isFinite(item.value) && item.value > 0);
    }

    if (chartMode === 'children' && selectedParent) {
      const childSlices = selectedParent.children
        .map((child, index) => ({
          value: child.total,
          color: PIE_COLORS[index % PIE_COLORS.length],
          focused: child.key === selectedChildKey,
          onPress: () => handleChildPress(child.key),
        }))
        .filter(item => Number.isFinite(item.value) && item.value > 0);

      if (selectedParent.directTransactions.length > 0) {
        const directTotal = selectedParent.directTransactions.reduce(
          (sum, transaction) => sum + Math.abs(transaction.amount),
          0
        );
        if (Number.isFinite(directTotal) && directTotal > 0) {
          childSlices.push({
            value: directTotal,
            color: Colors.dark.textSecondary,
            focused: false,
            onPress: () => {},
          });
        }
      }

      return childSlices;
    }

    if (chartMode === 'transactions' && selectedChild) {
      return selectedChild.transactions
        .map((transaction, index) => ({
          value: Math.abs(transaction.amount),
          color: PIE_COLORS[index % PIE_COLORS.length],
          focused: false,
          onPress: () => {},
          text: formatTransactionLabel(transaction),
        }))
        .filter(item => Number.isFinite(item.value) && item.value > 0);
    }

    return [];
  }, [
    chartMode,
    parentGroups,
    selectedParent,
    selectedParentKey,
    selectedChild,
    selectedChildKey,
    handleParentPress,
    handleChildPress,
  ]);

  const selectedLabel = useMemo(() => {
    if (chartMode === 'parents') {
      return selectedParent
        ? `${selectedParent.name} (${formatMoney(selectedParent.total)})`
        : `Total (${formatMoney(totalSpending)})`;
    }

    if (chartMode === 'children' && selectedParent) {
      return `${selectedParent.name} (${formatMoney(selectedParent.total)})`;
    }

    if (chartMode === 'transactions' && selectedChild && selectedParent) {
      return `${selectedChild.name} (${formatMoney(selectedChild.total)})`;
    }

    return `Total (${formatMoney(totalSpending)})`;
  }, [chartMode, selectedParent, selectedChild, totalSpending, formatMoney]);

  const radius = Math.min(windowWidth * 0.28, 110);
  const innerRadius = radius * 0.65;
  const safePieData = Array.isArray(pieData) ? pieData : [];
  const listHeight = selectedParent ? childListHeight : parentListHeight;
  const listHeightStyle = useAnimatedStyle(() => ({
    minHeight: animatedListMinHeight.value,
  }));

  useEffect(() => {
    if (listHeight > 0) {
      animatedListMinHeight.value = withTiming(listHeight, { duration: 220 });
    }
  }, [listHeight, animatedListMinHeight]);

  const content = (
    <>
      <ThemedText type="subtitle" className="mb-4">
        {title}
      </ThemedText>

      {parentGroups.length === 0 ? (
        <ThemedText type="subText" className="text-text-secondary">
          No transactions found for this period.
        </ThemedText>
      ) : (
        <>
          <View className="items-center mb-4">
            {safePieData.length > 0 ? (
              <PieChart
                key={`${chartMode}-${selectedParentKey ?? 'root'}-${selectedChildKey ?? 'none'}`}
                data={safePieData}
                donut
                radius={radius}
                innerRadius={innerRadius}
                innerCircleColor={Colors.dark.backgroundSecondary}
                centerLabelComponent={() => (
                  <View className="items-center justify-center px-4">
                    <ThemedText type="defaultSemiBold" numberOfLines={2} className="text-center">
                      {selectedLabel}
                    </ThemedText>
                  </View>
                )}
              />
            ) : (
              <ThemedText type="subText" className="text-text-secondary">
                No data to display.
              </ThemedText>
            )}
          </View>

          <Animated.View layout={Layout.duration(200)} style={listHeightStyle} className=" overflow-hidden">
            {selectedParent ? (
              <Animated.View
                key={`children-${selectedParentKey ?? 'none'}`}
                entering={SlideInRight.duration(200)}
                exiting={SlideOutRight.duration(180)}
                onLayout={event => setChildListHeight(event.nativeEvent.layout.height)}
              >
                <>
                  <View className="flex-row items-center mb-2">
                    <Pressable
                      onPress={() => {
                        setSelectedParentKey(null);
                      }}
                      className="flex-row items-center"
                      accessibilityLabel="Back to parent categories"
                    >
                      <FontAwesome6 name="chevron-left" size={14} color={Colors.dark.textSecondary} />
                      <ThemedText type="subText" className="ml-2 text-text-secondary">
                        Back
                      </ThemedText>
                    </Pressable>
                    <View className="flex-1 items-end">
                      <ThemedText type="defaultSemiBold">{selectedParent.name}</ThemedText>
                    </View>
                  </View>

                  {selectedParent.children.length === 0 ? (
                    <ThemedText type="subText" className="text-text-secondary">
                      No child categories.
                    </ThemedText>
                  ) : (
                    <View className="mb-2">
                      {selectedParent.children.map(child => {
                        const percent = getPercent(child.total, selectedParent.total);
                        const isSelected = child.key === selectedChildKey;

                        return (
                          <Pressable
                            key={child.key}
                            onPress={() => handleChildPress(child.key)}
                            className="flex-row items-center py-2"
                          >
                            <View
                              className="h-2 w-2 rounded-full mr-3"
                              style={{ backgroundColor: selectedParent.color }}
                              accessibilityLabel={`${child.name} color`}
                            />
                            <View className="flex-1">
                              <ThemedText type={isSelected ? 'defaultSemiBold' : 'default'}>
                                {percent}% - {child.name} ({formatMoney(child.total)})
                              </ThemedText>
                            </View>
                            <FontAwesome6
                              name={isSelected ? 'chevron-down' : 'chevron-right'}
                              size={12}
                              color={Colors.dark.textSecondary}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {selectedParent.directTransactions.length > 0 && (
                    <View className="mb-2">
                      <ThemedText type="subText" className="text-text-secondary">
                        Parent category transactions
                      </ThemedText>
                    </View>
                  )}

                  {selectedChild && (
                    <View className="mb-4">
                      <ThemedText type="subText" className="uppercase tracking-widest text-text-secondary mb-2">
                        {selectedChild.name} transactions
                      </ThemedText>
                      <View className="overflow-hidden rounded-lg border border-background-tertiary">
                        {selectedChild.transactions.map(transaction => (
                          <EnhancedTransactionRow key={transaction.id} transaction={transaction} />
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedParent.directTransactions.length > 0 && (
                    <View>
                      <ThemedText type="subText" className="uppercase tracking-widest text-text-secondary mb-2">
                        {selectedParent.name} transactions
                      </ThemedText>
                      <View className="overflow-hidden rounded-lg border border-background-tertiary">
                        {selectedParent.directTransactions.map(transaction => (
                          <EnhancedTransactionRow key={transaction.id} transaction={transaction} />
                        ))}
                      </View>
                    </View>
                  )}
                </>
              </Animated.View>
            ) : (
              <Animated.View
                key="parents"
                entering={SlideInLeft.duration(200)}
                exiting={SlideOutLeft.duration(180)}
                onLayout={event => setParentListHeight(event.nativeEvent.layout.height)}
              >
                <View className="pt-2">
                  {parentGroups.map(group => {
                    const percent = getPercent(group.total, totalSpending);

                    return (
                      <Pressable
                        key={group.key}
                        onPress={() => handleParentPress(group.key)}
                        className="flex-row items-center py-3"
                      >
                        <View
                          className="h-3 w-3 rounded-full mr-3"
                          style={{ backgroundColor: group.color }}
                          accessibilityLabel={`${group.name} color`}
                        />
                        <View className="flex-1">
                          <ThemedText type="defaultSemiBold">
                            {percent}% - {group.name} ({formatMoney(group.total)})
                          </ThemedText>
                        </View>
                        <FontAwesome6 name="chevron-right" size={14} color={Colors.dark.textSecondary} />
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </>
      )}
    </>
  );

  if (!withCard) {
    return <View className="p-4">{content}</View>;
  }

  return (
    <Card variant="elevated" rounded="lg" backgroundColor="secondary" className="p-4 mb-4">
      {content}
    </Card>
  );
}
