import { Pressable, ScrollView, View } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { SharedModal, ThemedText } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/colors';
import { withObservables } from '@nozbe/watermelondb/react';
import Account from '@/model/models/account';
import database from '@/model/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface TransactionFilters {
  accountIds: string[];
}

interface TransactionFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: TransactionFilters) => void;
  currentFilters: TransactionFilters;
}

function TransactionFilterModalInternal({
  visible,
  onClose,
  onApply,
  currentFilters,
  accounts,
}: Readonly<TransactionFilterModalProps & { accounts: Account[] }>) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Initialize with current filters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedAccountIds(currentFilters.accountIds);
    }
  }, [visible, currentFilters]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const handleApply = () => {
    onApply({ accountIds: selectedAccountIds });
    onClose();
  };

  const handleClearAll = () => {
    setSelectedAccountIds([]);
  };

  const handleSelectAll = () => {
    setSelectedAccountIds(accounts.map(a => a.accountId));
  };

  const hasFilters = selectedAccountIds.length > 0;
  const allSelected = accounts.length > 0 && selectedAccountIds.length === accounts.length;

  return (
    <SharedModal
      visible={visible}
      onClose={onClose}
      position="bottom"
      width="100%"
      height="75%"
      borderColor={Colors.dark.backgroundTertiary}
      borderWidth={2}
      borderRadius={20}
      backgroundColor={Colors.dark.backgroundSecondary}
    >
      <View className="w-full h-full rounded-2xl">
        {/* Drag indicator */}
        <View className="flex-row items-center justify-center py-4">
          <View className="w-1/6 bg-text-secondary h-1 rounded-full"></View>
        </View>

        {/* Header */}
        <View className="flex-row items-center px-4 pb-4 border-b border-background-tertiary">
          <ThemedText type="title" className="text-lg">
            Filter Transactions
          </ThemedText>
          <Pressable onPress={onClose} className="ml-auto">
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </View>

        <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          {/* Accounts Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <FontAwesome6 name="wallet" size={16} color={iconColor} />
                <ThemedText type="defaultSemiBold" className="ml-2">
                  Accounts
                </ThemedText>
              </View>
              <View className="flex-row">
                <Pressable onPress={handleSelectAll} className="mr-4">
                  <ThemedText type="link" className="text-sm">
                    {allSelected ? 'Selected' : 'Select All'}
                  </ThemedText>
                </Pressable>
                {hasFilters && (
                  <Pressable onPress={handleClearAll}>
                    <ThemedText type="link" className="text-sm">
                      Clear
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>

            {accounts.length === 0 ? (
              <View className="py-8 items-center">
                <ThemedText className="text-text-secondary">No accounts available</ThemedText>
              </View>
            ) : (
              <View className="space-y-2">
                {accounts.map(account => {
                  const isSelected = selectedAccountIds.includes(account.accountId);
                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => toggleAccount(account.accountId)}
                      className={`flex-row items-center p-4 rounded-lg ${
                        isSelected
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-background-tertiary border-2 border-background-tertiary'
                      }`}
                    >
                      <View className="flex-1">
                        <ThemedText type="defaultSemiBold">{account.name}</ThemedText>
                        <ThemedText className="text-text-secondary text-sm">...{account.mask}</ThemedText>
                      </View>
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          isSelected ? 'bg-primary border-primary' : 'border-text-secondary'
                        }`}
                      >
                        {isSelected && <FontAwesome6 name="check" size={12} color="white" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Apply Button */}
          <View className="mb-6">
            <Button
              title={hasFilters ? `Apply Filter (${selectedAccountIds.length})` : 'Apply Filter'}
              onPress={handleApply}
            />
          </View>
        </ScrollView>
      </View>
    </SharedModal>
  );
}

const enhancedTransactionFilterModal = withObservables([], () => ({
  accounts: database.get<Account>('accounts').query().observe(),
}));

export const TransactionFilterModal = enhancedTransactionFilterModal(TransactionFilterModalInternal);
