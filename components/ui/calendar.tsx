import { useState, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/shared/themed-text';
import { CalendarDayCell } from './calendar-day-cell';
import { CalendarDayModal } from './calendar-day-modal';
import { BudgetState } from '@/model/models/budget';
import { BudgetItemState } from '@/model/models/budget-item';
import dayjs, { isSameDate, formatDateOnly } from '@/helpers/dayjs';
import { FontAwesome6 } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/colors';

interface CalendarProps {
  readonly budget?: BudgetState | null;
  readonly bills?: { date: Date; item: BudgetItemState }[];
  readonly dailyData?: Map<string, { spending: number; income: number }>;
  readonly onDayPress?: (date: Date, bills: BudgetItemState[]) => void;
  readonly initialMonth?: Date;
  readonly mode?: 'bills' | 'spending' | 'both';
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({ budget, bills, dailyData, onDayPress, initialMonth, mode = 'bills' }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => (initialMonth ? dayjs(initialMonth) : dayjs()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBills, setSelectedBills] = useState<BudgetItemState[]>([]);
  const theme = useColorScheme();

  const today = dayjs().startOf('day');
  const arrowColor = theme === 'dark' ? Colors.dark.textSecondary : Colors.light.textSecondary;

  const billsByDate = useMemo(() => {
    const map = new Map<string, BudgetItemState[]>();

    if (budget) {
      budget.allItems
        .filter(item => item.dueDate && item.isExpense)
        .forEach(item => {
          const dateKey = formatDateOnly(item.dueDate!);
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(item);
        });
    } else if (bills) {
      bills.forEach(({ date, item }) => {
        const dateKey = formatDateOnly(date);
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(item);
      });
    }

    return map;
  }, [budget, bills]);

  const calendarDays = useMemo(() => {
    const monthStart = currentMonth.startOf('month');
    const monthEnd = currentMonth.endOf('month');
    const startDate = monthStart.startOf('week');
    const endDate = monthEnd.endOf('week');

    const days: dayjs.Dayjs[] = [];
    let currentDate = startDate;

    while (currentDate.isSameOrBefore(endDate, 'day')) {
      days.push(currentDate);
      currentDate = currentDate.add(1, 'day');
    }

    return days;
  }, [currentMonth]);

  const handleDayPress = (date: Date, billsForDay: BudgetItemState[]) => {
    setSelectedDate(date);
    setSelectedBills(billsForDay);
    setModalVisible(true);
    onDayPress?.(date, billsForDay);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => prev.add(1, 'month'));
  };

  const monthYearText = currentMonth.format('MMMM YYYY');

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 py-3 ">
        <Pressable onPress={handlePreviousMonth} className="p-2">
          <FontAwesome6 name="chevron-left" size={16} color={arrowColor} />
        </Pressable>

        <ThemedText type="defaultBold" color="text" style={{ fontSize: 18 }}>
          {monthYearText}
        </ThemedText>

        <Pressable onPress={handleNextMonth} className="p-2">
          <FontAwesome6 name="chevron-right" size={16} color={arrowColor} />
        </Pressable>
      </View>

      <View className="flex-row px-2 py-2 border-background-tertiary">
        {DAYS_OF_WEEK.map(day => (
          <View key={day} className="flex-1 items-center">
            <ThemedText type="subText" color="textSecondary" style={{ fontSize: 12 }}>
              {day}
            </ThemedText>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {calendarDays.map((day, index) => {
          const dateKey = formatDateOnly(day);
          const dayBills = billsByDate.get(dateKey) || [];
          const dayData = dailyData?.get(dateKey) || null;
          const isCurrentMonth = day.month() === currentMonth.month();
          const isToday = isSameDate(day, today);

          return (
            <CalendarDayCell
              key={`${day.format('YYYY-MM-DD')}-${index}`}
              date={day}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              bills={dayBills}
              budget={budget}
              dailyData={dayData}
              mode={mode}
              onPress={handleDayPress}
            />
          );
        })}
      </View>

      <CalendarDayModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        date={selectedDate}
        bills={selectedBills}
      />
    </View>
  );
}
