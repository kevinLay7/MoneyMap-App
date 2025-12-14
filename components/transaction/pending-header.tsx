import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/shared';

export function PendingHeader() {
  return (
    <View className="bg-background-secondary px-4 py-2">
      <ThemedText type="subtitle" className="text-text-secondary">
        Pending
      </ThemedText>
    </View>
  );
}

