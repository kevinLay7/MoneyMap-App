import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/shared';

export interface DateHeaderProps {
  dateLabel: string;
  total: number;
  formatMoney: (amount: number) => string;
}

export function DateHeader({ dateLabel, total, formatMoney }: DateHeaderProps) {
  return (
    <View className="bg-background px-4 py-2 flex-row w-full">
      <ThemedText type="subtitle" className="text-text-secondary">
        {dateLabel}
      </ThemedText>
      <ThemedText type="defaultBold" className="ml-auto">
        {formatMoney(total)}
      </ThemedText>
    </View>
  );
}
