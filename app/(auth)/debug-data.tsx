import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import database from '@/model/database';
import Account from '@/model/models/account';
import Category from '@/model/models/category';
import Item from '@/model/models/item';
import Transaction from '@/model/models/transaction';
import Sync from '@/model/models/sync';
import TransactionSync from '@/model/models/transaction-sync';
import Budget from '@/model/models/budget';
import { Header, ThemedText } from '@/components/shared';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Colors } from '@/constants/colors';
import { clearDatabase, deleteDatabaseFile } from '@/helpers/database-helpers';
import { useObservableCollection } from '@/hooks/use-observable';
import { encryptionCredentialsService } from '@/services/encryption-credentials-service';
import { backgroundTaskService } from '@/services/background-task-service';

type TabType = 'account' | 'category' | 'item' | 'transaction' | 'sync' | 'transactionSync' | 'budget';

export default function DebugDataScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  const [activeTab, setActiveTab] = useState<TabType>('account');

  // Observe collections
  const accounts = useObservableCollection(database.get<Account>('accounts').query().observe());
  const categories = useObservableCollection(database.get<Category>('categories').query().observe());
  const items = useObservableCollection(database.get<Item>('items').query().observe());
  const transactions = useObservableCollection(database.get<Transaction>('transactions').query().observe());
  const syncs = useObservableCollection(database.get<Sync>('syncs').query().observe());
  const transactionSyncs = useObservableCollection(
    database.get<TransactionSync>('transaction_syncs').query().observe()
  );
  const budgets = useObservableCollection(database.get<Budget>('budgets').query().observe());

  const handleClearDatabase = async () => {
    Alert.alert('Clear Database', 'This will permanently delete all data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearDatabase();
            Alert.alert('Success', 'Database cleared successfully');
          } catch (error: any) {
            console.error('Failed to clear database:', error);
            Alert.alert('Error', error.message || 'Failed to clear database');
          }
        },
      },
    ]);
  };

  const handleDeleteDatabase = async () => {
    Alert.alert(
      'Delete Database',
      'This will delete the database file and force a fresh database creation on next app start. The app will need to be restarted. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDatabaseFile();
              Alert.alert(
                'Success',
                'Database file deleted. Please restart the app to recreate the database with the latest schema.'
              );
            } catch (error: any) {
              console.error('Failed to delete database:', error);
              Alert.alert('Error', error.message || 'Failed to delete database file.');
            }
          },
        },
      ]
    );
  };

  const handleClearEncryptionCredentials = async () => {
    Alert.alert('Clear Encryption Credentials', 'This will remove your encryption key and salt. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await encryptionCredentialsService.removeCredentials();
            Alert.alert('Success', 'Encryption credentials cleared successfully');
          } catch (error: any) {
            console.error('Failed to clear encryption credentials:', error);
            Alert.alert('Error', error.message || 'Failed to clear encryption credentials');
          }
        },
      },
    ]);
  };

  const handleTriggerPlaidCheck = async () => {
    try {
      await backgroundTaskService.triggerPlaidCheck();
      Alert.alert('Success', 'Plaid check triggered. Check console logs for details.');
    } catch (error: any) {
      console.error('Failed to trigger plaid check:', error);
      Alert.alert('Error', error.message || 'Failed to trigger plaid check');
    }
  };

  const handleCheckTaskStatus = async () => {
    try {
      const status = await backgroundTaskService.getTaskStatus();
      const message = `
Sync Task: ${status.syncRegistered ? '✅ Registered' : '❌ Not Registered'}
Last Sync: ${status.lastSyncTime?.toLocaleString() || 'Never'}

Check Task: ${status.checkRegistered ? '✅ Registered' : '❌ Not Registered'}
Last Check: ${status.lastCheckTime?.toLocaleString() || 'Never'}
      `.trim();
      Alert.alert('Background Task Status', message);
    } catch (error: any) {
      console.error('Failed to check task status:', error);
      Alert.alert('Error', error.message || 'Failed to check task status');
    }
  };

  const accountColumns: TableColumn<Account>[] = [
    { key: 'accountId', label: 'Account ID', width: 150 },
    { key: 'name', label: 'Name', width: 150 },
    { key: 'type', label: 'Type', width: 100 },
    { key: 'subtype', label: 'Subtype', width: 100 },
    {
      key: 'balanceCurrent',
      label: 'Balance',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          ${item.balanceCurrent.toFixed(2)} {item.isoCurrencyCode || ''}
        </ThemedText>
      ),
    },
    { key: 'mask', label: 'Mask', width: 80 },
    { key: 'itemId', label: 'Item ID', width: 150 },
  ];

  const renderAccountList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Accounts ({accounts.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable
          data={accounts}
          columns={accountColumns}
          keyExtractor={item => item.id}
          emptyMessage="No accounts found."
        />
      </View>
    </View>
  );

  const categoryColumns: TableColumn<Category>[] = [
    { key: 'id', label: 'ID', width: 150 },
    { key: 'name', label: 'Name', width: 150 },
    { key: 'primary', label: 'Primary', width: 120 },
    { key: 'detailed', label: 'Detailed', width: 150 },
    {
      key: 'description',
      label: 'Description',
      width: 200,
      render: item => (
        <ThemedText type="default" className="text-text-secondary" numberOfLines={2}>
          {item.description}
        </ThemedText>
      ),
    },
    {
      key: 'ignored',
      label: 'Ignored',
      width: 80,
      render: item => (
        <ThemedText type="default" className={item.ignored ? 'text-yellow-500' : 'text-text-secondary'}>
          {item.ignored ? 'Yes' : 'No'}
        </ThemedText>
      ),
    },
    { key: 'icon', label: 'Icon', width: 100 },
    { key: 'color', label: 'Color', width: 100 },
  ];

  const renderCategoryList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Categories ({categories.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable
          data={categories}
          columns={categoryColumns}
          keyExtractor={item => item.id}
          emptyMessage="No categories found."
        />
      </View>
    </View>
  );

  const itemColumns: TableColumn<Item>[] = [
    { key: 'institutionName', label: 'Institution', width: 150 },
    { key: 'plaidItemId', label: 'Plaid Item ID', width: 200 },
    { key: 'institutionId', label: 'Institution ID', width: 150 },
    { key: 'status', label: 'Status', width: 100 },
    {
      key: 'isActive',
      label: 'Active',
      width: 80,
      render: item => (
        <ThemedText type="default" className={item.isActive ? 'text-green-500' : 'text-text-secondary'}>
          {item.isActive ? 'Yes' : 'No'}
        </ThemedText>
      ),
    },
    { key: 'accountId', label: 'Account ID', width: 150 },
    { key: 'lastSuccessfulUpdate', label: 'Last Update', width: 150 },
  ];

  const renderItemList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Items ({items.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable data={items} columns={itemColumns} keyExtractor={item => item.id} emptyMessage="No items found." />
      </View>
    </View>
  );

  const transactionColumns: TableColumn<Transaction>[] = [
    {
      key: 'name',
      label: 'Name',
      width: 180,
      render: item => (
        <ThemedText type="default" className="text-text" numberOfLines={1}>
          {item.name}
        </ThemedText>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          ${item.amount.toFixed(2)} {item.isoCurrencyCode || ''}
        </ThemedText>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: 150,
      render: item => (
        <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
          {item.category?.name || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'categoryId',
      label: 'Category ID',
      width: 150,
      render: item => (
        <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
          {item.categoryId || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'personalFinanceCategoryPrimary',
      label: 'PFC Primary',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
          {item.personalFinanceCategoryPrimary || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'personalFinanceCategoryDetailed',
      label: 'PFC Detailed',
      width: 150,
      render: item => (
        <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
          {item.personalFinanceCategoryDetailed || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'personalFinanceCategoryConfidenceLevel',
      label: 'Confidence',
      width: 120,
      render: item => {
        const confidence = item.personalFinanceCategoryConfidenceLevel;
        let colorClass = 'text-text-secondary';
        if (confidence === 'HIGH') {
          colorClass = 'text-green-500';
        } else if (confidence === 'MEDIUM') {
          colorClass = 'text-yellow-500';
        } else if (confidence === 'LOW') {
          colorClass = 'text-red-500';
        }
        return (
          <ThemedText type="default" className={colorClass}>
            {confidence || '-'}
          </ThemedText>
        );
      },
    },
    { key: 'date', label: 'Date', width: 120 },
    { key: 'transactionId', label: 'Transaction ID', width: 200 },
    { key: 'accountId', label: 'Account ID', width: 150 },
    {
      key: 'pending',
      label: 'Pending',
      width: 80,
      render: item => (
        <ThemedText type="default" className={item.pending ? 'text-yellow-500' : 'text-text-secondary'}>
          {item.pending ? 'Yes' : 'No'}
        </ThemedText>
      ),
    },
    { key: 'paymentChannel', label: 'Channel', width: 120 },
    { key: 'merchantName', label: 'Merchant', width: 150 },
  ];

  const renderTransactionList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Transactions ({transactions.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable
          data={transactions}
          columns={transactionColumns}
          keyExtractor={item => item.id}
          emptyMessage="No transactions found."
        />
      </View>
    </View>
  );

  const syncColumns: TableColumn<Sync>[] = [
    { key: 'action', label: 'Action', width: 120 },
    { key: 'accountId', label: 'Account ID', width: 150 },
    { key: 'userId', label: 'User ID', width: 150 },
    { key: 'plaidItemId', label: 'Plaid Item ID', width: 200 },
  ];

  const renderSyncList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Syncs ({syncs.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable data={syncs} columns={syncColumns} keyExtractor={item => item.id} emptyMessage="No syncs found." />
      </View>
    </View>
  );

  const transactionSyncColumns: TableColumn<TransactionSync>[] = [
    { key: 'plaidItemId', label: 'Plaid Item ID', width: 200 },
    { key: 'transactionsUpdateStatus', label: 'Status', width: 150 },
    { key: 'nextCursor', label: 'Next Cursor', width: 200 },
    {
      key: 'hasMore',
      label: 'Has More',
      width: 100,
      render: item => (
        <ThemedText type="default" className={item.hasMore ? 'text-green-500' : 'text-text-secondary'}>
          {item.hasMore ? 'Yes' : 'No'}
        </ThemedText>
      ),
    },
    { key: 'requestId', label: 'Request ID', width: 200 },
  ];

  const renderTransactionSyncList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Transaction Syncs ({transactionSyncs.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable
          data={transactionSyncs}
          columns={transactionSyncColumns}
          keyExtractor={item => item.id}
          emptyMessage="No transaction syncs found."
        />
      </View>
    </View>
  );

  const budgetColumns: TableColumn<Budget>[] = [
    {
      key: 'startDate',
      label: 'Start Date',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          {item.startDate?.toLocaleDateString() || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'endDate',
      label: 'End Date',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          {item.endDate?.toLocaleDateString() || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          ${item.balance.toFixed(2)}
        </ThemedText>
      ),
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          ${item.totalSpent.toFixed(2)}
        </ThemedText>
      ),
    },
    {
      key: 'totalRemaining',
      label: 'Remaining',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          ${item.totalRemaining.toFixed(2)}
        </ThemedText>
      ),
    },
    { key: 'balanceSource', label: 'Balance Source', width: 130 },
    { key: 'accountBalanceSource', label: 'Account Source', width: 130 },
    { key: 'duration', label: 'Duration', width: 100 },
    {
      key: 'accountId',
      label: 'Account ID',
      width: 150,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          {item.accountId || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'account',
      label: 'Account Name',
      width: 150,
      render: item => (
        <ThemedText type="default" className="text-text-secondary" numberOfLines={1}>
          {item.account?.name || '-'}
        </ThemedText>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      width: 120,
      render: item => (
        <ThemedText type="default" className="text-text-secondary">
          {item.createdAt?.toLocaleDateString() || '-'}
        </ThemedText>
      ),
    },
  ];

  const renderBudgetList = () => (
    <View className="flex-1">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText type="subtitle">Budgets ({budgets.length})</ThemedText>
      </View>
      <View className="flex-1 px-2">
        <DataTable
          data={budgets}
          columns={budgetColumns}
          keyExtractor={item => item.id}
          emptyMessage="No budgets found."
        />
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountList();
      case 'category':
        return renderCategoryList();
      case 'item':
        return renderItemList();
      case 'transaction':
        return renderTransactionList();
      case 'sync':
        return renderSyncList();
      case 'transactionSync':
        return renderTransactionSyncList();
      case 'budget':
        return renderBudgetList();
      default:
        return null;
    }
  };

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        leftIcon="arrow-left"
        centerComponent={<ThemedText type="subtitle">Database Viewer</ThemedText>}
      />
      <AnimatedScrollView animatedRef={animatedRef}>
        <SafeAreaView className="flex-1">
          <View className="p-4 border-b border-border">
            <ThemedText type="defaultSemiBold" className="mb-2">
              Database Actions
            </ThemedText>
            <View className="mb-4 flex-col gap-2">
              <Button title="Clear All Data" onPress={handleClearDatabase} color="error" />
              <Button title="Clear Encryption Key" onPress={handleClearEncryptionCredentials} color="error" />
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2 mt-4">
              Background Tasks
            </ThemedText>
            <View className="mb-4 flex-col gap-2">
              <Button title="Check Task Status" onPress={handleCheckTaskStatus} color="primary" />
              <Button title="Trigger Plaid Check" onPress={handleTriggerPlaidCheck} color="primary" />
            </View>
          </View>

          <View className="p-4 border-b border-border">
            <ThemedText type="defaultSemiBold" className="mb-2">
              Data Tables
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              <View className="flex-row gap-2">
                {(
                  [
                    { key: 'account', label: 'Account' },
                    { key: 'category', label: 'Category' },
                    { key: 'item', label: 'Item' },
                    { key: 'transaction', label: 'Transaction' },
                    { key: 'sync', label: 'Sync' },
                    { key: 'transactionSync', label: 'Transaction Sync' },
                    { key: 'budget', label: 'Budget' },
                  ] as const
                ).map(tab => (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      setActiveTab(tab.key as TabType);
                    }}
                    className={`px-4 py-2 rounded-full mr-2 ${activeTab === tab.key ? 'bg-primary' : 'bg-gray-500'}`}
                  >
                    <Text className={`font-semibold ${activeTab === tab.key ? 'text-white' : 'text-white'}`}>
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          {renderContent()}
        </SafeAreaView>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
