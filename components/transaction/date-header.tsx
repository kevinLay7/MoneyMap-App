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
    <View className="bg-background-secondary px-4 py-2 flex-row w-full">
      <ThemedText className="text-text-secondary">{dateLabel}</ThemedText>
      <ThemedText type="defaultSemiBold" className="ml-auto">
        {formatMoney(total)}
      </ThemedText>
    </View>
  );
}
