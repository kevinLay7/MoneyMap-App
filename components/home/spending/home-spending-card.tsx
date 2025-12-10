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
import dayjs, { getCurrentDate, getMonthRange, getMonthInfo, formatDateOnly, isDateBetween } from '@/helpers/dayjs';
import SpendingLineChart, { type DataPoint } from './line-chart';

// Constants
const DATA_POINT_CONFIG = {
  color: '#fff',
  radius: 3,
  height: 10,
  width: 10,
} as const;

const COMPARISON_COLORS = {
  above: '#f59e0b',
  below: '#10b981',
  same: '#3b82f6',
} as const;

type ComparisonStatus = 'above' | 'below' | 'same as';
type ComparisonIcon = 'circle-up' | 'circle-down' | 'circle-check';

interface ComparisonMetrics {
  vsLastMonth: number;
  aboveBelow: ComparisonStatus;
  vsLastMonthIcon: ComparisonIcon;
  vsLastMonthColor: string;
}

// Helper functions
function calculateComparisonMetrics(currentTotal: number, previousTotalAtSameDay: number): ComparisonMetrics {
  const vsLastMonth = currentTotal - previousTotalAtSameDay;
  const aboveBelow: ComparisonStatus = vsLastMonth > 0 ? 'above' : vsLastMonth < 0 ? 'below' : 'same as';
  const vsLastMonthIcon: ComparisonIcon =
    vsLastMonth > 0 ? 'circle-up' : vsLastMonth < 0 ? 'circle-down' : 'circle-check';
  const vsLastMonthColor =
    vsLastMonth > 0 ? COMPARISON_COLORS.above : vsLastMonth < 0 ? COMPARISON_COLORS.below : COMPARISON_COLORS.same;

  return { vsLastMonth, aboveBelow, vsLastMonthIcon, vsLastMonthColor };
}

function buildCumulativeData(dailyTotals: Map<number, number>, daysInMonth: number): DataPoint[] {
  const data: DataPoint[] = [];
  let cumulative = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    cumulative += dailyTotals.get(day) || 0;
    data.push({ dayOfMonth: day, value: cumulative });
  }

  return data;
}

function highlightLastDataPoint(data: DataPoint[]): DataPoint[] {
  if (data.length <= 1) return data;

  const result = [...data];
  const lastIndex = result.length - 1;
  result[lastIndex] = {
    ...result[lastIndex],
    hideDataPoint: false,
    dataPointColor: DATA_POINT_CONFIG.color,
    dataPointRadius: DATA_POINT_CONFIG.radius,
    dataPointHeight: DATA_POINT_CONFIG.height,
    dataPointWidth: DATA_POINT_CONFIG.width,
  };

  return result;
}

function processTransactions(
  transactions: Transaction[],
  currentMonthRange: { start: dayjs.Dayjs; end: dayjs.Dayjs },
  previousMonthRange: { start: dayjs.Dayjs; end: dayjs.Dayjs }
) {
  const currentMonthTotals = new Map<number, number>();
  const previousMonthTotals = new Map<number, number>();
  let currentTotal = 0;
  let previousTotal = 0;

  for (const transaction of transactions) {
    if (transaction.amount <= 0) continue;

    const date = dayjs(transaction.date);
    const dayOfMonth = date.date();

    if (isDateBetween(date, currentMonthRange.start, currentMonthRange.end)) {
      currentMonthTotals.set(dayOfMonth, (currentMonthTotals.get(dayOfMonth) || 0) + transaction.amount);
      currentTotal += transaction.amount;
    } else if (isDateBetween(date, previousMonthRange.start, previousMonthRange.end)) {
      previousMonthTotals.set(dayOfMonth, (previousMonthTotals.get(dayOfMonth) || 0) + transaction.amount);
      previousTotal += transaction.amount;
    }
  }

  return { currentMonthTotals, previousMonthTotals, currentTotal, previousTotal };
}

// Header Component
const SpendingHeader = memo(function SpendingHeader({
  currentTotal,
  vsLastMonth,
  aboveBelow,
  vsLastMonthIcon,
  vsLastMonthColor,
  formatMoney,
}: {
  currentTotal: number;
  vsLastMonth: number;
  aboveBelow: ComparisonStatus;
  vsLastMonthIcon: ComparisonIcon;
  vsLastMonthColor: string;
  formatMoney: (value: number) => string;
}) {
  return (
    <View className="mb-6 px-4" style={{ minHeight: 50 }} collapsable={false}>
      <View>
        <ThemedText type="subtitle">{formatMoney(currentTotal)}</ThemedText>
        <ThemedText type="subText">Spent this month</ThemedText>
      </View>
      <View
        className="flex-row items-center"
        style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}
        pointerEvents="box-none"
        collapsable={false}
      >
        <View>
          <FontAwesome6 name={vsLastMonthIcon} size={24} color={vsLastMonthColor} />
        </View>
        <View className="ml-3 justify-center flex-col">
          <ThemedText type="default">{`${formatMoney(vsLastMonth)} ${aboveBelow}`}</ThemedText>
          <ThemedText type="default">last month</ThemedText>
        </View>
      </View>
    </View>
  );
});

export const HomeSpendingGraphCard = memo(function HomeSpendingGraphCard() {
  const formatMoney = useMoneyFormatter();

  const dateRanges = useMemo(() => {
    const now = getCurrentDate();
    const currentMonth = getMonthRange(now);
    const previousMonth = getMonthRange(now, -1);
    const currentMonthInfo = getMonthInfo(now);
    const previousMonthInfo = getMonthInfo(now, -1);

    return {
      currentMonthRange: currentMonth,
      previousMonthRange: previousMonth,
      currentMonthDays: now.date(),
      previousMonthDays: previousMonthInfo.daysInMonth,
      beginningOfPreviousMonth: formatDateOnly(previousMonth.start),
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
    const { currentMonthTotals, previousMonthTotals, currentTotal, previousTotal } = processTransactions(
      data,
      dateRanges.currentMonthRange,
      dateRanges.previousMonthRange
    );

    const currentMonthData = highlightLastDataPoint(
      buildCumulativeData(currentMonthTotals, dateRanges.currentMonthDays)
    );
    const previousMonthData = buildCumulativeData(previousMonthTotals, dateRanges.previousMonthDays);

    const comparisonDay = Math.min(dateRanges.currentMonthDays, previousMonthData.length - 1);
    const previousTotalAtSameDay = previousMonthData[comparisonDay]?.value || 0;
    const comparisonMetrics = calculateComparisonMetrics(currentTotal, previousTotalAtSameDay);

    const maxValue = Math.max(
      previousMonthData[previousMonthData.length - 1]?.value || 0,
      currentMonthData[currentMonthData.length - 1]?.value || 0
    );

    return {
      currentMonthData,
      previousMonthData,
      currentTotal,
      previousTotal,
      maxValue,
      hasCurrentSpending: currentTotal > 0,
      hasPreviousSpending: previousTotal > 0,
      ...comparisonMetrics,
    };
  }, [data, dateRanges]);

  return (
    <Card variant="elevated" rounded="xl" backgroundColor="secondary" className="p-4 mb-4">
      <SpendingHeader
        currentTotal={chartData.currentTotal}
        vsLastMonth={chartData.vsLastMonth}
        aboveBelow={chartData.aboveBelow}
        vsLastMonthIcon={chartData.vsLastMonthIcon}
        vsLastMonthColor={chartData.vsLastMonthColor}
        formatMoney={formatMoney}
      />

      <View>
        <SpendingLineChart chartData={chartData} />
      </View>
    </Card>
  );
});
