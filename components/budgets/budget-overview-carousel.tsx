import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SpendingByCategoryCard } from '@/components/home/spending/spending-by-category-card';
import { Calendar } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { BudgetState } from '@/model/models/budget';
import Transaction from '@/model/models/transaction';

interface BudgetOverviewCarouselProps {
  readonly budgetState: BudgetState;
  readonly budgetTransactions: Transaction[];
}

const DOT_INDICES = [0, 1] as const;

export function BudgetOverviewCarousel({ budgetState, budgetTransactions }: BudgetOverviewCarouselProps) {
  const cardsScrollRef = useRef<ScrollView>(null);
  const pendingScrollIndex = useRef<number | null>(null);
  const [selectedOverviewIndex, setSelectedOverviewIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const fallbackWidth = Math.max(windowWidth - 32, 0);
  const resolvedPageWidth = pageWidth || fallbackWidth;

  useEffect(() => {
    if (resolvedPageWidth > 0) {
      cardsScrollRef.current?.scrollTo({ x: selectedOverviewIndex * resolvedPageWidth, animated: false });
    }
  }, [resolvedPageWidth, selectedOverviewIndex]);

  const handleDotPress = useCallback(
    (index: number) => {
      if (resolvedPageWidth === 0) return;
      const nextIndex = index === selectedOverviewIndex ? (selectedOverviewIndex + 1) % DOT_INDICES.length : index;
      setSelectedOverviewIndex(nextIndex);
      pendingScrollIndex.current = nextIndex;
      cardsScrollRef.current?.scrollTo({ x: nextIndex * resolvedPageWidth, animated: true });
    },
    [resolvedPageWidth, selectedOverviewIndex]
  );

  return (
    <Card variant="elevated" rounded="lg" backgroundColor="secondary" padding="none" className="mb-4">
      <View className="items-center pt-4 pb-2">
        <View className="flex-row items-center justify-center gap-2">
          {DOT_INDICES.map(index => {
            const isActive = selectedOverviewIndex === index;
            return (
              <Pressable key={index} onPress={() => handleDotPress(index)} hitSlop={10}>
                <View
                  className={`${isActive ? 'h-3 w-3' : 'h-2 w-2'} rounded-full ${isActive ? 'bg-white' : 'bg-text-secondary'}`}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView
        ref={cardsScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={event => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== pageWidth) {
            setPageWidth(nextWidth);
          }
        }}
        onMomentumScrollEnd={event => {
          if (pendingScrollIndex.current !== null) {
            setSelectedOverviewIndex(pendingScrollIndex.current);
            pendingScrollIndex.current = null;
            return;
          }
          const layoutWidth = Math.round(event.nativeEvent.layoutMeasurement.width);
          const width = layoutWidth || resolvedPageWidth;
          if (width === 0) return;
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          if (nextIndex !== selectedOverviewIndex) {
            setSelectedOverviewIndex(nextIndex);
          }
        }}
      >
        <View style={{ width: resolvedPageWidth }} className="px-4 pb-4">
          <Calendar budget={budgetState} />
        </View>
        <View style={{ width: resolvedPageWidth }} className="pb-4">
          <SpendingByCategoryCard transactions={budgetTransactions} title="Budget Spending" withCard={false} />
        </View>
      </ScrollView>
    </Card>
  );
}
