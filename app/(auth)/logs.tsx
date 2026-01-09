import { Alert, ScrollView, View } from 'react-native';
import React, { useMemo, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BackgroundContainer } from '@/components/ui/background-container';
import { Header, SharedModal, ThemedText } from '@/components/shared';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import database from '@/model/database';
import Log from '@/model/models/log';
import { useObservableCollection } from '@/hooks/use-observable';
import { useLogger } from '@/hooks/use-logger';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { SelectInput } from '@/components/ui/inputs/select-input';
import { DatePicker } from '@/components/ui/inputs/date-picker';
import { SearchInput } from '@/components/ui/inputs/search-input';
import { LogType } from '@/types/logging';
import dayjs from '@/helpers/dayjs';

const levelClassName = (level: string) => {
  if (level === 'error') {
    return 'text-red-400';
  }
  if (level === 'warn') {
    return 'text-yellow-400';
  }
  return 'text-emerald-400';
};

export default function LogsScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const { clearLogs } = useLogger();

  const logs = useObservableCollection(
    database.get<Log>('logs').query(Q.sortBy('created_at', Q.desc)).observe()
  );

  const orderedLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [logs]);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<Date>(() => dayjs().subtract(7, 'day').toDate());
  const [customEndDate, setCustomEndDate] = useState<Date>(() => dayjs().toDate());
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = useMemo(() => {
    const now = dayjs();
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const startRange = (() => {
      if (timeRange === 'last_24h') {
        return now.subtract(24, 'hour');
      }
      if (timeRange === 'last_7d') {
        return now.subtract(7, 'day');
      }
      if (timeRange === 'last_30d') {
        return now.subtract(30, 'day');
      }
      if (timeRange === 'custom') {
        return dayjs(customStartDate).startOf('day');
      }
      return null;
    })();

    const endRange = timeRange === 'custom' ? dayjs(customEndDate).endOf('day') : null;

    return orderedLogs.filter(log => {
      if (selectedType !== 'all' && log.type !== selectedType) {
        return false;
      }

      if (normalizedQuery.length > 0) {
        const messageMatch = log.message.toLowerCase().includes(normalizedQuery);
        const metadataMatch = (log.metadata || '').toLowerCase().includes(normalizedQuery);
        const typeMatch = log.type.toLowerCase().includes(normalizedQuery);
        const levelMatch = log.level.toLowerCase().includes(normalizedQuery);

        if (!messageMatch && !metadataMatch && !typeMatch && !levelMatch) {
          return false;
        }
      }

      if (!startRange) {
        return true;
      }

      const logTime = dayjs(log.createdAt);
      if (endRange) {
        return logTime.isSameOrAfter(startRange) && logTime.isSameOrBefore(endRange);
      }

      return logTime.isSameOrAfter(startRange);
    });
  }, [orderedLogs, selectedType, timeRange, customStartDate, customEndDate, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const columns: TableColumn<Log>[] = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Time',
        width: 170,
        render: item => (
          <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
            {dayjs(item.createdAt).format('MM/DD/YYYY HH:mm:ss')}
          </ThemedText>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        width: 110,
        render: item => (
          <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
            {item.type}
          </ThemedText>
        ),
      },
      {
        key: 'level',
        label: 'Level',
        width: 90,
        render: item => (
          <ThemedText type="default" className={`uppercase ${levelClassName(item.level)}`} numberOfLines={1}>
            {item.level}
          </ThemedText>
        ),
      },
      {
        key: 'message',
        label: 'Message',
        width: 260,
        render: item => (
          <ThemedText type="default" className="text-text-secondary" numberOfLines={2}>
            {item.message}
          </ThemedText>
        ),
      },
      {
        key: 'metadata',
        label: 'Metadata',
        width: 240,
        render: item => (
          <ThemedText type="default" className="text-text-secondary" numberOfLines={2}>
            {item.metadata || ''}
          </ThemedText>
        ),
      },
    ],
    []
  );

  const typeOptions = useMemo(
    () => [
      { label: 'All Types', value: 'all' },
      ...Object.values(LogType).map(type => ({
        label: type,
        value: type,
      })),
    ],
    []
  );

  const timeRangeOptions = useMemo(
    () => [
      { label: 'All Time', value: 'all' },
      { label: 'Last 24h', value: 'last_24h' },
      { label: 'Last 7 days', value: 'last_7d' },
      { label: 'Last 30 days', value: 'last_30d' },
      { label: 'Custom', value: 'custom' },
    ],
    []
  );

  const pageSizeOptions = useMemo(
    () => [
      { label: '25 / page', value: 25 },
      { label: '50 / page', value: 50 },
      { label: '100 / page', value: 100 },
    ],
    []
  );

  const handleTypeChange = (value: string | number) => {
    setSelectedType(String(value));
    setPage(1);
  };

  const handleTimeRangeChange = (value: string | number) => {
    setTimeRange(String(value));
    setPage(1);
  };

  const handlePageSizeChange = (value: string | number) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleClearLogs = () => {
    Alert.alert('Clear Logs', 'This will permanently remove all stored logs. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearLogs();
          } catch {
            Alert.alert('Error', 'Failed to clear logs.');
          }
        },
      },
    ]);
  };

  return (
    <BackgroundContainer>
      <Header
        leftIcon="arrow-left"
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={<ThemedText type="subtitle">Logs</ThemedText>}
      />

      <AnimatedScrollView animatedRef={animatedRef}>
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            <ThemedText type="subtitle">Local Logs ({filteredLogs.length})</ThemedText>
            <Button
              title="Clear Logs"
              color="error"
              size="sm"
              width="w-auto"
              rounded="rounded-md"
              marginY="0"
              className="px-3"
              onPress={handleClearLogs}
            />
          </View>

          <View className="gap-3 mb-4">
            <SearchInput
              onQueryChange={query => {
                setSearchQuery(query);
                setPage(1);
              }}
              placeholder="Search logs (account id, message, metadata...)"
            />
            <SelectInput
              icon="filter"
              label="Type"
              value={selectedType}
              onValueChange={handleTypeChange}
              items={typeOptions}
              placeholder="All Types"
            />
            <SelectInput
              icon="clock"
              label="Time Range"
              value={timeRange}
              onValueChange={handleTimeRangeChange}
              items={timeRangeOptions}
              placeholder="All Time"
            />
            {timeRange === 'custom' ? (
              <View className="gap-3">
                <DatePicker
                  icon="calendar"
                  label="Start"
                  value={customStartDate}
                  onChange={date => {
                    setCustomStartDate(date);
                    setPage(1);
                  }}
                />
                <DatePicker
                  icon="calendar"
                  label="End"
                  value={customEndDate}
                  onChange={date => {
                    setCustomEndDate(date);
                    setPage(1);
                  }}
                />
              </View>
            ) : null}
          </View>

          {filteredLogs.length === 0 ? (
            <ThemedText type="default" className="text-text-secondary">
              No logs recorded yet.
            </ThemedText>
          ) : (
            <>
              <View className="rounded-lg border border-border bg-background-secondary">
                <DataTable
                  data={pagedLogs}
                  columns={columns}
                  keyExtractor={item => item.id}
                  onRowPress={item => setSelectedLog(item)}
                  emptyMessage="No logs match the current filters."
                  showActions={false}
                />
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <View className="w-40">
                  <SelectInput
                    icon="list"
                    label="Page Size"
                    value={pageSize}
                    onValueChange={handlePageSizeChange}
                    items={pageSizeOptions}
                  />
                </View>
                <ThemedText type="default" className="text-text-secondary">
                  Page {currentPage} of {totalPages}
                </ThemedText>
                <View className="flex-row gap-2">
                  <Button
                    title="Prev"
                    size="sm"
                    color="background"
                    width="w-auto"
                    rounded="rounded-md"
                    marginY="0"
                    className="px-3"
                    onPress={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  />
                  <Button
                    title="Next"
                    size="sm"
                    color="background"
                    width="w-auto"
                    rounded="rounded-md"
                    marginY="0"
                    className="px-3"
                    onPress={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </AnimatedScrollView>

      <SharedModal
        visible={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        position="bottom"
        height="55%"
        swipeToClose
        closeOnBackdropPress
        backdropOpacity={0.4}
        backgroundColor={Colors.dark.backgroundSecondary}
        borderColor={Colors.dark.backgroundTertiary}
        borderWidth={2}
        borderRadius={18}
      >
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <ThemedText type="subtitle">Log Details</ThemedText>
            <Button
              title="Close"
              size="sm"
              color="background"
              width="w-auto"
              rounded="rounded-md"
              marginY="0"
              className="px-3"
              onPress={() => setSelectedLog(null)}
            />
          </View>
          {selectedLog ? (
            <ScrollView className="px-5 py-4">
              <View className="mb-4">
                <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest">
                  Time
                </ThemedText>
                <ThemedText type="default">{dayjs(selectedLog.createdAt).format('MM/DD/YYYY HH:mm:ss')}</ThemedText>
              </View>
              <View className="mb-4">
                <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest">
                  Type
                </ThemedText>
                <ThemedText type="default">{selectedLog.type}</ThemedText>
              </View>
              <View className="mb-4">
                <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest">
                  Level
                </ThemedText>
                <ThemedText type="default" className={`uppercase ${levelClassName(selectedLog.level)}`}>
                  {selectedLog.level}
                </ThemedText>
              </View>
              <View className="mb-4">
                <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest">
                  Message
                </ThemedText>
                <ThemedText type="default">{selectedLog.message}</ThemedText>
              </View>
              {selectedLog.metadata ? (
                <View className="mb-4">
                  <ThemedText type="subText" className="text-text-secondary uppercase tracking-widest">
                    Metadata
                  </ThemedText>
                  <ThemedText type="default" className="text-text-secondary">
                    {selectedLog.metadata}
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </SharedModal>
    </BackgroundContainer>
  );
}
