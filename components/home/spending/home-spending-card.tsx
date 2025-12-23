import { ThemedText } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useMoneyFormatter } from '@/hooks/format-money';
import { useObservableCollection } from '@/hooks/use-observable';
import database from '@/model/database';
import Transaction from '@/model/models/transaction';
import Account from '@/model/models/account';
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
  readonly vsLastMonth: number;
  readonly aboveBelow: ComparisonStatus;
  readonly vsLastMonthIcon: ComparisonIcon;
  readonly vsLastMonthColor: string;
}

// Helper functions
function calculateComparisonMetrics(currentTotal: number, previousTotalAtSameDay: number): ComparisonMetrics {
  const vsLastMonth = currentTotal - previousTotalAtSameDay;

  let aboveBelow: ComparisonStatus;
  let vsLastMonthIcon: ComparisonIcon;
  let vsLastMonthColor: string;

  if (vsLastMonth > 0) {
    aboveBelow = 'above';
    vsLastMonthIcon = 'circle-up';
    vsLastMonthColor = COMPARISON_COLORS.above;
  } else if (vsLastMonth < 0) {
    aboveBelow = 'below';
    vsLastMonthIcon = 'circle-down';
    vsLastMonthColor = COMPARISON_COLORS.below;
  } else {
    aboveBelow = 'same as';
    vsLastMonthIcon = 'circle-check';
    vsLastMonthColor = COMPARISON_COLORS.same;
  }

  return { vsLastMonth, aboveBelow, vsLastMonthIcon, vsLastMonthColor };
}

function buildCumulativeData(cumulativeTotals: Map<number, number>, daysInMonth: number): DataPoint[] {
  const data: DataPoint[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    data.push({ dayOfMonth: day, value: cumulativeTotals.get(day) || 0 });
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

  function calculateDayTotal(date: dayjs.Dayjs, transactions: Transaction[]) {
    const dayTransactions = transactions.filter(transaction =>
      isDateBetween(dayjs(transaction.date), date, date.endOf('day'))
    );

    const dayOfMonth = date.date();
    const previousDay = dayOfMonth === 1 ? date : date.subtract(1, 'day');
    const isCurrentMonth = isDateBetween(date, currentMonthRange.start, currentMonthRange.end);
    const previousDayTotal = isCurrentMonth
      ? currentMonthTotals.get(previousDay.date()) || 0
      : previousMonthTotals.get(previousDay.date()) || 0;

    // Set date value to previous day total + day transactions total
    if (isCurrentMonth) {
      currentMonthTotals.set(
        dayOfMonth,
        previousDayTotal + (dayTransactions?.reduce((acc, transaction) => acc + transaction.amount, 0) || 0)
      );
      currentTotal += dayTransactions?.reduce((acc, transaction) => acc + transaction.amount, 0) || 0;
    } else {
      previousMonthTotals.set(
        dayOfMonth,
        previousDayTotal + (dayTransactions?.reduce((acc, transaction) => acc + transaction.amount, 0) || 0)
      );
      previousTotal += dayTransactions?.reduce((acc, transaction) => acc + transaction.amount, 0) || 0;
    }
  }

  for (let day = 1; day <= currentMonthRange.end.date(); day++) {
    calculateDayTotal(dayjs(currentMonthRange.start).add(day - 1, 'day'), transactions);
  }
  for (let day = 1; day <= previousMonthRange.end.date(); day++) {
    calculateDayTotal(dayjs(previousMonthRange.start).add(day - 1, 'day'), transactions);
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
    const previousMonthInfo = getMonthInfo(now, -1);

    return {
      currentMonthRange: currentMonth,
      previousMonthRange: previousMonth,
      currentMonthDays: now.date(),
      previousMonthDays: previousMonthInfo.daysInMonth,
      beginningOfPreviousMonth: formatDateOnly(previousMonth.start),
    };
  }, []);

  const accountsQuery = useMemo(
    () =>
      database
        .get<Account>('accounts')
        .query(
          Q.where('type', Q.oneOf(['depository', 'credit'])),
          Q.where('subtype', Q.oneOf(['checking', 'savings', 'credit card']))
        )
        .observe(),
    []
  );

  const accounts = useObservableCollection(accountsQuery);
  const accountIds = useMemo(() => accounts.map(account => account.accountId), [accounts]);

  console.log('accountIds', accountIds);

  const transactionsQuery = useMemo(
    () =>
      database
        .get<Transaction>('transactions')
        .query(
          Q.where('date', Q.gte(dateRanges.beginningOfPreviousMonth)),
          Q.where('account_id', Q.oneOf(accountIds)),
          Q.where('amount', Q.gt(0))
        )
        .observe(),
    [dateRanges.beginningOfPreviousMonth, accountIds]
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

    // Compare the same day number (e.g., day 16 of current month vs day 16 of previous month)
    // If the current day doesn't exist in previous month (e.g., day 31 vs month with 30 days), use the last day of previous month
    const currentDayOfMonth = dateRanges.currentMonthDays;
    const currentDayData = currentMonthData.find(d => d.dayOfMonth === currentDayOfMonth);
    const previousDayData = previousMonthData.find(d => d.dayOfMonth === currentDayOfMonth) || previousMonthData.at(-1); // Fallback to last day if current day doesn't exist
    const currentTotalAtSameDay = currentDayData?.value || 0;
    const previousTotalAtSameDay = previousDayData?.value || 0;
    const comparisonMetrics = calculateComparisonMetrics(currentTotalAtSameDay, previousTotalAtSameDay);

    const maxValue = Math.max(previousMonthData.at(-1)?.value || 0, currentMonthData.at(-1)?.value || 0);

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
