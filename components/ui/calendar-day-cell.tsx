import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import { Colors } from '@/constants/colors';
import { BudgetItemState } from '@/model/models/budget-item';
import { BudgetState } from '@/model/models/budget';
import { useHaptics } from '@/hooks/useHaptics';
import { useMoneyFormatter } from '@/hooks/format-money';
import dayjs, { isDateBetween, isSameDate } from '@/helpers/dayjs';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CalendarDayCellProps {
  readonly date: dayjs.Dayjs;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly bills: BudgetItemState[];
  readonly budget?: BudgetState | null;
  readonly dailyData?: { spending: number; income: number } | null;
  readonly mode?: 'bills' | 'spending' | 'both';
  readonly onPress?: (date: Date, bills: BudgetItemState[]) => void;
}

export function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  bills,
  budget,
  dailyData,
  mode = 'bills',
  onPress,
}: CalendarDayCellProps) {
  const haptics = useHaptics();
  const formatMoney = useMoneyFormatter();
  const theme = useColorScheme();

  const budgetRangeInfo = (() => {
    if (!budget || !budget.startDate || !budget.endDate) {
      return { isInRange: false, isStart: false, isEnd: false };
    }

    const isInRange = isDateBetween(date, budget.startDate, budget.endDate);
    if (!isInRange) return { isInRange: false, isStart: false, isEnd: false };

    const startDate = dayjs(budget.startDate).startOf('day');
    const endDate = dayjs(budget.endDate).startOf('day');
    const currentDate = date.startOf('day');

    const isStart = isSameDate(currentDate, startDate);
    const isEnd = isSameDate(currentDate, endDate);

    return { isInRange: true, isStart, isEnd };
  })();

  const hasBills = bills.length > 0;
  const showBills = mode === 'bills' || mode === 'both';
  const showSpending = mode === 'spending' || mode === 'both';

  const handlePress = () => {
    if (onPress && hasBills) {
      haptics.selection();
      onPress(date.toDate(), bills);
    }
  };

  const cellOpacity = isCurrentMonth ? 1 : 0.3;
  const budgetBgColor = theme === 'dark' ? Colors.dark.backgroundTertiary : Colors.light.backgroundTertiary;

  // Calculate border radius for budget range highlighting
  const borderRadius = budgetRangeInfo.isInRange
    ? {
        borderTopLeftRadius: budgetRangeInfo.isStart ? 50 : 0,
        borderBottomLeftRadius: budgetRangeInfo.isStart ? 50 : 0,
        borderTopRightRadius: budgetRangeInfo.isEnd ? 50 : 0,
        borderBottomRightRadius: budgetRangeInfo.isEnd ? 50 : 0,
      }
    : {};

  return (
    <Pressable
      onPress={handlePress}
      disabled={!hasBills || !onPress}
      className="items-center justify-center"
      style={{
        width: '14.28%',
        aspectRatio: 1.2,
        marginVertical: 2,
        opacity: cellOpacity,
        backgroundColor: budgetRangeInfo.isInRange ? budgetBgColor : 'transparent',
        borderWidth: 0,
        ...borderRadius,
      }}
    >
      <View className="flex-1 w-full relative">
        <View className="absolute top-1 left-0 right-0 items-center">
          <ThemedText
            type="defaultSemiBold"
            color={isToday ? 'primary' : 'text'}
            style={{
              fontSize: 14,
            }}
          >
            {date.date()}
          </ThemedText>
        </View>

        <View className="absolute bottom-3 left-0 right-0 items-center justify-center">
          {showBills && hasBills && (
            <View className="flex-row flex-wrap justify-center items-center gap-0.5">
              {bills.slice(0, 3).map((bill, index) => (
                <View
                  key={`${bill.itemId}-${index}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: bill.statusColor,
                  }}
                />
              ))}
              {bills.length > 3 && (
                <ThemedText type="subText" color="textSecondary" style={{ fontSize: 8 }}>
                  +{bills.length - 3}
                </ThemedText>
              )}
            </View>
          )}

          {showSpending && dailyData && (
            <View className="items-center">
              {dailyData.spending > 0 && (
                <ThemedText
                  type="subText"
                  color="warning"
                  style={{
                    fontSize: 9,
                  }}
                >
                  {formatMoney(dailyData.spending)}
                </ThemedText>
              )}
              {dailyData.income > 0 && (
                <ThemedText
                  type="subText"
                  color="success"
                  style={{
                    fontSize: 9,
                  }}
                >
                  +{formatMoney(dailyData.income)}
                </ThemedText>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
