import { ThemedText } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useObservableCollection } from '@/hooks/use-observable';
import database from '@/model/database';
import Transaction from '@/model/models/transaction';
import { Q } from '@nozbe/watermelondb';
import { useMemo, memo } from 'react';
import dayjs, { getCurrentDate, getMonthRange, getMonthInfo, formatDateOnly } from '@/helpers/dayjs';
import SpendingLineChart from './line-chart';

export const HomeSpendingGraphCard = memo(function HomeSpendingGraphCard() {
  const formatMoney = useMoneyFormatter();

  // Memoize expensive date calculations
  const dateRanges = useMemo(() => {
    const now = getCurrentDate();
    const currentMonth = getMonthRange(now);
    const previousMonth = getMonthRange(now, -1);
    const currentMonthInfo = getMonthInfo(now);
    const previousMonthInfo = getMonthInfo(now, -1);

    return {
      beginningOfPreviousMonth: formatDateOnly(previousMonth.start),
      endOfPreviousMonth: formatDateOnly(previousMonth.end),
      beginningOfCurrentMonth: formatDateOnly(currentMonth.start),
      endOfCurrentMonth: formatDateOnly(currentMonth.end),
      previousMonth: previousMonthInfo.month,
      currentMonth: currentMonthInfo.month,
      currentMonthDays: now.date(),
      previousMonthDays: previousMonthInfo.daysInMonth,
    };
  }, []);

  const transactionsQuery = useMemo(
    () =>
      database
        .get<Transaction>('transactions')
        .query(Q.where('date', Q.gte(dateRanges.beginningOfPreviousMonth)))
        .observe(),
    [dateRanges.beginningOfPreviousMonth]
  );

  const data = useObservableCollection(transactionsQuery);

  const chartData = useMemo(() => {
    const currentMonthTotals = new Map<number, number>();
    const previousMonthTotals = new Map<number, number>();
    let currentTotal = 0;
    let previousTotal = 0;

    // Group transactions by day and calculate totals
    for (const transaction of data) {
      if (transaction.amount <= 0) continue;

      const date = dayjs(transaction.date);
      const dayOfMonth = date.date();

      if (date.month() === dateRanges.currentMonth) {
        currentMonthTotals.set(dayOfMonth, (currentMonthTotals.get(dayOfMonth) || 0) + transaction.amount);
        currentTotal += transaction.amount;
      } else if (date.month() === dateRanges.previousMonth) {
        previousMonthTotals.set(dayOfMonth, (previousMonthTotals.get(dayOfMonth) || 0) + transaction.amount);
        previousTotal += transaction.amount;
      }

      const dateKey = date.valueOf();
      if (!currentMonthTotals.has(dateKey)) {
        currentMonthTotals.set(dateKey, 0);
      }
    }

    const currentMonthData: { dayOfMonth: number; value: number }[] = [];
    const previousMonthData: { dayOfMonth: number; value: number }[] = [];

    let currentCumulative = 0;
    for (let day = 1; day <= dateRanges.currentMonthDays; day++) {
      currentCumulative += currentMonthTotals.get(day) || 0;
      currentMonthData.push({ dayOfMonth: day, value: currentCumulative });
    }

    let previousCumulative = 0;
    for (let day = 1; day <= dateRanges.previousMonthDays; day++) {
      previousCumulative += previousMonthTotals.get(day) || 0;
      previousMonthData.push({ dayOfMonth: day, value: previousCumulative });
    }

    // Highlight the last data point for current month
    if (currentMonthData.length > 1) {
      const lastIndex = currentMonthData.length - 1;
      currentMonthData[lastIndex] = {
        ...currentMonthData[lastIndex],
        hideDataPoint: false,
        dataPointColor: '#fff',
        dataPointRadius: 3,
        dataPointHeight: 10,
        dataPointWidth: 10,
      } as any;
    }

    // Calculate comparison metrics
    const comparisonDay = Math.min(dateRanges.currentMonthDays, previousMonthData.length - 1);
    const previousTotalAtSameDay = previousMonthData[comparisonDay]?.value || 0;
    const vsLastMonth = currentTotal - previousTotalAtSameDay;
    const aboveBelow: 'above' | 'below' | 'same as' = vsLastMonth > 0 ? 'above' : vsLastMonth < 0 ? 'below' : 'same as';
    const vsLastMonthIcon: 'circle-up' | 'circle-down' | 'circle-check' =
      vsLastMonth > 0 ? 'circle-up' : vsLastMonth < 0 ? 'circle-down' : 'circle-check';
    const vsLastMonthColor = vsLastMonth > 0 ? '#f59e0b' : vsLastMonth < 0 ? '#10b981' : '#3b82f6';

    const maxValue = Math.max(
      previousMonthData[previousMonthData.length - 1]?.value || 0,
      currentMonthData[currentMonthData.length - 1]?.value || 0
    );

    return {
      currentMonthData,
      previousMonthData,
      currentTotal,
      vsLastMonth,
      aboveBelow,
      vsLastMonthIcon,
      vsLastMonthColor,
      maxValue,
      hasCurrentSpending: currentTotal > 0,
      hasPreviousSpending: previousTotal > 0,
    };
  }, [data, dateRanges]);

  // Use absolute positioning to prevent layout recalculations during animations
  const headerContent = (
    <View className="mb-6 px-4" style={{ minHeight: 50 }} collapsable={false}>
      <View>
        <ThemedText type="subtitle">{formatMoney(chartData.currentTotal)}</ThemedText>
        <ThemedText type="subText">Spent this month</ThemedText>
      </View>
      <View
        className="flex-row items-center"
        style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}
        pointerEvents="box-none"
        collapsable={false}
      >
        <View>
          <FontAwesome6 name={chartData.vsLastMonthIcon} size={24} color={chartData.vsLastMonthColor} />
        </View>
        <View className="ml-3 justify-center flex-col">
          <ThemedText type="default">{`${formatMoney(chartData.vsLastMonth)} ${chartData.aboveBelow}`}</ThemedText>
          <ThemedText type="default">last month</ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <Card variant="elevated" rounded="xl" backgroundColor="secondary" className="p-4 mb-4">
      {headerContent}

      <View>
        <SpendingLineChart chartData={chartData} />
      </View>
    </Card>
  );
});
