import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import database from '@/model/database';
import Account from '@/model/models/account';
import Category from '@/model/models/category';
import Item from '@/model/models/item';
import Transaction from '@/model/models/transaction';
import Sync from '@/model/models/sync';
import TransactionSync from '@/model/models/transaction-sync';
import { Header, ThemedText } from '@/components/shared';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextInput } from '@/components/ui/inputs/text-input';
import { Colors } from '@/constants/colors';
import { useDependency } from '@/context/dependencyContext';
import { PlaidService } from '@/services/plaid-service';
import { clearDatabase } from '@/helpers/database-helpers';

export default function DebugDataScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const { plaidApi } = useDependency();

  // Account form state
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [subtype, setSubtype] = useState('');
  const [mask, setMask] = useState('');
  const [balanceCurrent, setBalanceCurrent] = useState('');
  const [balanceAvailable, setBalanceAvailable] = useState('');
  const [isoCurrencyCode, setIsoCurrencyCode] = useState('');
  const [unofficialCurrencyCode, setUnofficialCurrencyCode] = useState('');
  const [fetchPlaidItemId, setFetchPlaidItemId] = useState('');
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);

  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [primary, setPrimary] = useState('');
  const [detailed, setDetailed] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [ignored, setIgnored] = useState(false);
  const [children, setChildren] = useState('');

  // Item form state
  const [itemAccountId, setItemAccountId] = useState('');
  const [plaidItemId, setPlaidItemId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [status, setStatus] = useState('');
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Transaction form state
  const [transactionId, setTransactionId] = useState('');
  const [transactionAccountId, setTransactionAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionIsoCurrencyCode, setTransactionIsoCurrencyCode] = useState('');
  const [transactionUnofficialCurrencyCode, setTransactionUnofficialCurrencyCode] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [date, setDate] = useState('');
  const [authorizedDate, setAuthorizedDate] = useState('');
  const [authorizedDatetime, setAuthorizedDatetime] = useState('');
  const [datetime, setDatetime] = useState('');
  const [paymentChannel, setPaymentChannel] = useState('');
  const [personalFinanceCategoryPrimary, setPersonalFinanceCategoryPrimary] = useState('');
  const [personalFinanceCategoryDetailed, setPersonalFinanceCategoryDetailed] = useState('');
  const [personalFinanceCategoryConfidenceLevel, setPersonalFinanceCategoryConfidenceLevel] = useState('');
  const [personalFinanceCategoryIconUrl, setPersonalFinanceCategoryIconUrl] = useState('');
  const [transactionName, setTransactionName] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantEntityId, setMerchantEntityId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [transactionCode, setTransactionCode] = useState('');
  const [counterparties, setCounterparties] = useState('');

  // Sync form state
  const [syncAccountId, setSyncAccountId] = useState('');
  const [userId, setUserId] = useState('');
  const [syncPlaidItemId, setSyncPlaidItemId] = useState('');
  const [action, setAction] = useState('');

  // TransactionSync form state
  const [tsPlaidItemId, setTsPlaidItemId] = useState('');
  const [transactionsUpdateStatus, setTransactionsUpdateStatus] = useState('');
  const [nextCursor, setNextCursor] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [requestId, setRequestId] = useState('');

  const [activeTab, setActiveTab] = useState<
    'account' | 'category' | 'item' | 'transaction' | 'sync' | 'transactionSync'
  >('account');

  const handleCreateAccount = async () => {
    if (!accountId || !accountName || !accountType || !subtype || !balanceCurrent) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<Account>('accounts').create(account => {
          account.accountId = accountId;
          account.name = accountName;
          account.officialName = officialName || undefined;
          account.type = accountType;
          account.subtype = subtype;
          account.mask = mask || undefined;
          account.balanceCurrent = parseFloat(balanceCurrent);
          account.balanceAvailable = balanceAvailable ? parseFloat(balanceAvailable) : undefined;
          account.isoCurrencyCode = isoCurrencyCode || undefined;
          account.unofficialCurrencyCode = unofficialCurrencyCode || undefined;
        });
      });
      Alert.alert('Success', 'Account created');
      // Reset form
      setAccountId('');
      setAccountName('');
      setOfficialName('');
      setAccountType('');
      setSubtype('');
      setMask('');
      setBalanceCurrent('');
      setBalanceAvailable('');
      setIsoCurrencyCode('');
      setUnofficialCurrencyCode('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    }
  };

  const handleFetchAccounts = async () => {
    if (!fetchPlaidItemId) {
      Alert.alert('Error', 'Please enter a Plaid Item ID');
      return;
    }

    setIsFetchingAccounts(true);
    try {
      const plaidService = new PlaidService(plaidApi, database);
      await plaidService.fetchAndStoreAccounts(fetchPlaidItemId);
      Alert.alert('Success', 'Accounts fetched and stored successfully');
      setFetchPlaidItemId('');
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error);
      Alert.alert('Error', error?.message || 'Failed to fetch accounts. Check console for details.');
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName || !primary || !detailed || !description) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<Category>('categories').create(category => {
          category.name = categoryName;
          category.primary = primary;
          category.detailed = detailed;
          category.description = description;
          category.icon = icon || undefined;
          category.color = color || undefined;
          category.ignored = ignored;
          category.children = children || undefined;
        });
      });
      Alert.alert('Success', 'Category created');
      // Reset form
      setCategoryName('');
      setPrimary('');
      setDetailed('');
      setDescription('');
      setIcon('');
      setColor('');
      setIgnored(false);
      setChildren('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create category');
    }
  };

  const handleCreateItem = async () => {
    if (!itemAccountId || !plaidItemId || !institutionId || !institutionName || !status) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<Item>('items').create(item => {
          item.accountId = itemAccountId;
          item.plaidItemId = plaidItemId;
          item.institutionId = institutionId;
          item.institutionName = institutionName;
          item.status = status;
          item.lastSuccessfulUpdate = lastSuccessfulUpdate || undefined;
          item.isActive = isActive;
        });
      });
      Alert.alert('Success', 'Item created');
      // Reset form
      setItemAccountId('');
      setPlaidItemId('');
      setInstitutionId('');
      setInstitutionName('');
      setStatus('');
      setLastSuccessfulUpdate('');
      setIsActive(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create item');
    }
  };

  const handleCreateTransaction = async () => {
    if (!transactionId || !transactionAccountId || !amount || !date || !paymentChannel || !transactionName) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<Transaction>('transactions').create(transaction => {
          transaction.transactionId = transactionId;
          transaction.accountId = transactionAccountId;
          transaction.amount = parseFloat(amount);
          transaction.isoCurrencyCode = transactionIsoCurrencyCode || undefined;
          transaction.unofficialCurrencyCode = transactionUnofficialCurrencyCode || undefined;
          transaction.category = category || undefined;
          transaction.categoryId = categoryId || undefined;
          transaction.checkNumber = checkNumber || undefined;
          transaction.date = date;
          transaction.authorizedDate = authorizedDate || undefined;
          transaction.authorizedDatetime = authorizedDatetime || undefined;
          transaction.datetime = datetime || undefined;
          transaction.paymentChannel = paymentChannel;
          transaction.personalFinanceCategoryPrimary = personalFinanceCategoryPrimary || undefined;
          transaction.personalFinanceCategoryDetailed = personalFinanceCategoryDetailed || undefined;
          transaction.personalFinanceCategoryConfidenceLevel = personalFinanceCategoryConfidenceLevel || undefined;
          transaction.personalFinanceCategoryIconUrl = personalFinanceCategoryIconUrl || undefined;
          transaction.name = transactionName;
          transaction.merchantName = merchantName || undefined;
          transaction.merchantEntityId = merchantEntityId || undefined;
          transaction.logoUrl = logoUrl || undefined;
          transaction.website = website || undefined;
          transaction.pending = pending;
          transaction.transactionCode = transactionCode || undefined;
          transaction.counterparties = counterparties || undefined;
        });
      });
      Alert.alert('Success', 'Transaction created');
      // Reset form
      setTransactionId('');
      setTransactionAccountId('');
      setAmount('');
      setTransactionIsoCurrencyCode('');
      setTransactionUnofficialCurrencyCode('');
      setCategory('');
      setCategoryId('');
      setCheckNumber('');
      setDate('');
      setAuthorizedDate('');
      setAuthorizedDatetime('');
      setDatetime('');
      setPaymentChannel('');
      setPersonalFinanceCategoryPrimary('');
      setPersonalFinanceCategoryDetailed('');
      setPersonalFinanceCategoryConfidenceLevel('');
      setPersonalFinanceCategoryIconUrl('');
      setTransactionName('');
      setMerchantName('');
      setMerchantEntityId('');
      setLogoUrl('');
      setWebsite('');
      setPending(false);
      setTransactionCode('');
      setCounterparties('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create transaction');
    }
  };

  const handleCreateSync = async () => {
    if (!syncAccountId || !userId || !syncPlaidItemId || !action) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<Sync>('syncs').create(sync => {
          sync.accountId = syncAccountId;
          sync.userId = userId;
          sync.plaidItemId = syncPlaidItemId;
          sync.action = action;
        });
      });
      Alert.alert('Success', 'Sync created');
      // Reset form
      setSyncAccountId('');
      setUserId('');
      setSyncPlaidItemId('');
      setAction('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create sync');
    }
  };

  const handleCreateTransactionSync = async () => {
    if (!tsPlaidItemId || !transactionsUpdateStatus || !nextCursor || !requestId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        await database.get<TransactionSync>('transaction_syncs').create(ts => {
          ts.plaidItemId = tsPlaidItemId;
          ts.transactionsUpdateStatus = transactionsUpdateStatus;
          ts.nextCursor = nextCursor;
          ts.hasMore = hasMore;
          ts.requestId = requestId;
        });
      });
      Alert.alert('Success', 'TransactionSync created');
      // Reset form
      setTsPlaidItemId('');
      setTransactionsUpdateStatus('');
      setNextCursor('');
      setHasMore(false);
      setRequestId('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create transaction sync');
    }
  };

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

  const renderAccountForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <ThemedText type="title" className="mb-4">
        Create Account
      </ThemedText>
      <TextInput
        icon="hashtag"
        label="Account ID *"
        value={accountId}
        onChangeText={setAccountId}
        placeholder="account_id"
      />
      <TextInput icon="tag" label="Name *" value={accountName} onChangeText={setAccountName} placeholder="name" />
      <TextInput
        icon="building"
        label="Official Name"
        value={officialName}
        onChangeText={setOfficialName}
        placeholder="official_name"
      />
      <TextInput
        icon="list"
        label="Type *"
        value={accountType}
        onChangeText={setAccountType}
        placeholder="depository, credit, loan, etc."
      />
      <TextInput
        icon="layer-group"
        label="Subtype *"
        value={subtype}
        onChangeText={setSubtype}
        placeholder="checking, savings, etc."
      />
      <TextInput icon="mask" label="Mask" value={mask} onChangeText={setMask} placeholder="0000" />
      <TextInput
        icon="dollar-sign"
        label="Balance Current *"
        value={balanceCurrent}
        onChangeText={setBalanceCurrent}
        placeholder="0.00"
      />
      <TextInput
        icon="wallet"
        label="Balance Available"
        value={balanceAvailable}
        onChangeText={setBalanceAvailable}
        placeholder="0.00"
      />
      <TextInput
        icon="globe"
        label="ISO Currency Code"
        value={isoCurrencyCode}
        onChangeText={setIsoCurrencyCode}
        placeholder="USD"
      />
      <TextInput
        icon="coins"
        label="Unofficial Currency Code"
        value={unofficialCurrencyCode}
        onChangeText={setUnofficialCurrencyCode}
        placeholder=""
      />
      <Button title="Create Account" onPress={handleCreateAccount} />

      <View className="mt-6 pt-6 border-t border-border">
        <ThemedText type="subtitle" className="mb-4">
          Fetch Accounts from Plaid
        </ThemedText>
        <TextInput
          icon="link"
          label="Plaid Item ID"
          value={fetchPlaidItemId}
          onChangeText={setFetchPlaidItemId}
          placeholder="Enter Plaid Item ID"
        />
        <Button
          title={isFetchingAccounts ? 'Fetching...' : 'Fetch Accounts'}
          onPress={handleFetchAccounts}
          disabled={isFetchingAccounts}
        />
      </View>
    </Card>
  );

  const renderCategoryForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <ThemedText type="title" className="mb-4">
        Create Category
      </ThemedText>
      <TextInput icon="tag" label="Name *" value={categoryName} onChangeText={setCategoryName} placeholder="name" />
      <TextInput icon="circle" label="Primary *" value={primary} onChangeText={setPrimary} placeholder="primary" />
      <TextInput icon="list" label="Detailed *" value={detailed} onChangeText={setDetailed} placeholder="detailed" />
      <TextInput
        icon="file-text"
        label="Description *"
        value={description}
        onChangeText={setDescription}
        placeholder="description"
      />
      <TextInput icon="image" label="Icon" value={icon} onChangeText={setIcon} placeholder="icon" />
      <TextInput icon="palette" label="Color" value={color} onChangeText={setColor} placeholder="#000000" />
      <View className="flex-row items-center mb-3">
        <Text className="text-text font-semibold mr-2">Ignored</Text>
        <Switch value={ignored} onValueChange={setIgnored} />
      </View>
      <TextInput icon="sitemap" label="Children" value={children} onChangeText={setChildren} placeholder="children" />
      <Button title="Create Category" onPress={handleCreateCategory} />
    </Card>
  );

  const renderItemForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <ThemedText type="title" className="mb-4">
        Create Item
      </ThemedText>
      <TextInput
        icon="hashtag"
        label="Account ID *"
        value={itemAccountId}
        onChangeText={setItemAccountId}
        placeholder="account_id"
      />
      <TextInput
        icon="link"
        label="Plaid Item ID *"
        value={plaidItemId}
        onChangeText={setPlaidItemId}
        placeholder="plaid_item_id"
      />
      <TextInput
        icon="hashtag"
        label="Institution ID *"
        value={institutionId}
        onChangeText={setInstitutionId}
        placeholder="institution_id"
      />
      <TextInput
        icon="building"
        label="Institution Name *"
        value={institutionName}
        onChangeText={setInstitutionName}
        placeholder="institution_name"
      />
      <TextInput icon="circle-check" label="Status *" value={status} onChangeText={setStatus} placeholder="status" />
      <TextInput
        icon="clock"
        label="Last Successful Update"
        value={lastSuccessfulUpdate}
        onChangeText={setLastSuccessfulUpdate}
        placeholder="ISO date string"
      />
      <View className="flex-row items-center mb-3">
        <Text className="text-text font-semibold mr-2">Is Active</Text>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>
      <Button title="Create Item" onPress={handleCreateItem} />
    </Card>
  );

  const renderTransactionForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <ThemedText type="title" className="mb-4">
        Create Transaction
      </ThemedText>
      <TextInput
        icon="hashtag"
        label="Transaction ID *"
        value={transactionId}
        onChangeText={setTransactionId}
        placeholder="transaction_id"
      />
      <TextInput
        icon="hashtag"
        label="Account ID *"
        value={transactionAccountId}
        onChangeText={setTransactionAccountId}
        placeholder="account_id"
      />
      <TextInput icon="dollar-sign" label="Amount *" value={amount} onChangeText={setAmount} placeholder="0.00" />
      <TextInput
        icon="globe"
        label="ISO Currency Code"
        value={transactionIsoCurrencyCode}
        onChangeText={setTransactionIsoCurrencyCode}
        placeholder="USD"
      />
      <TextInput
        icon="coins"
        label="Unofficial Currency Code"
        value={transactionUnofficialCurrencyCode}
        onChangeText={setTransactionUnofficialCurrencyCode}
        placeholder=""
      />
      <TextInput icon="tag" label="Category" value={category} onChangeText={setCategory} placeholder="category" />
      <TextInput
        icon="hashtag"
        label="Category ID"
        value={categoryId}
        onChangeText={setCategoryId}
        placeholder="category_id"
      />
      <TextInput
        icon="file-invoice"
        label="Check Number"
        value={checkNumber}
        onChangeText={setCheckNumber}
        placeholder="check_number"
      />
      <TextInput icon="calendar" label="Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <TextInput
        icon="calendar-check"
        label="Authorized Date"
        value={authorizedDate}
        onChangeText={setAuthorizedDate}
        placeholder="YYYY-MM-DD"
      />
      <TextInput
        icon="clock"
        label="Authorized Datetime"
        value={authorizedDatetime}
        onChangeText={setAuthorizedDatetime}
        placeholder="ISO datetime"
      />
      <TextInput icon="clock" label="Datetime" value={datetime} onChangeText={setDatetime} placeholder="ISO datetime" />
      <TextInput
        icon="credit-card"
        label="Payment Channel *"
        value={paymentChannel}
        onChangeText={setPaymentChannel}
        placeholder="in_store, online, etc."
      />
      <TextInput
        icon="list"
        label="Personal Finance Category Primary"
        value={personalFinanceCategoryPrimary}
        onChangeText={setPersonalFinanceCategoryPrimary}
        placeholder=""
      />
      <TextInput
        icon="list-ul"
        label="Personal Finance Category Detailed"
        value={personalFinanceCategoryDetailed}
        onChangeText={setPersonalFinanceCategoryDetailed}
        placeholder=""
      />
      <TextInput
        icon="chart-line"
        label="Personal Finance Category Confidence Level"
        value={personalFinanceCategoryConfidenceLevel}
        onChangeText={setPersonalFinanceCategoryConfidenceLevel}
        placeholder=""
      />
      <TextInput
        icon="image"
        label="Personal Finance Category Icon URL"
        value={personalFinanceCategoryIconUrl}
        onChangeText={setPersonalFinanceCategoryIconUrl}
        placeholder=""
      />
      <TextInput
        icon="tag"
        label="Name *"
        value={transactionName}
        onChangeText={setTransactionName}
        placeholder="transaction name"
      />
      <TextInput
        icon="store"
        label="Merchant Name"
        value={merchantName}
        onChangeText={setMerchantName}
        placeholder="merchant_name"
      />
      <TextInput
        icon="hashtag"
        label="Merchant Entity ID"
        value={merchantEntityId}
        onChangeText={setMerchantEntityId}
        placeholder="merchant_entity_id"
      />
      <TextInput icon="image" label="Logo URL" value={logoUrl} onChangeText={setLogoUrl} placeholder="logo_url" />
      <TextInput icon="globe" label="Website" value={website} onChangeText={setWebsite} placeholder="website" />
      <View className="flex-row items-center mb-3">
        <Text className="text-text font-semibold mr-2">Pending</Text>
        <Switch value={pending} onValueChange={setPending} />
      </View>
      <TextInput
        icon="barcode"
        label="Transaction Code"
        value={transactionCode}
        onChangeText={setTransactionCode}
        placeholder="transaction_code"
      />
      <TextInput
        icon="users"
        label="Counterparties"
        value={counterparties}
        onChangeText={setCounterparties}
        placeholder="counterparties"
      />
      <Button title="Create Transaction" onPress={handleCreateTransaction} />
    </Card>
  );

  const renderSyncForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <ThemedText type="title" className="mb-4">
        Create Sync
      </ThemedText>
      <TextInput
        icon="hashtag"
        label="Account ID *"
        value={syncAccountId}
        onChangeText={setSyncAccountId}
        placeholder="account_id"
      />
      <TextInput icon="user" label="User ID *" value={userId} onChangeText={setUserId} placeholder="user_id" />
      <TextInput
        icon="link"
        label="Plaid Item ID *"
        value={syncPlaidItemId}
        onChangeText={setSyncPlaidItemId}
        placeholder="plaid_item_id"
      />
      <TextInput icon="gear" label="Action *" value={action} onChangeText={setAction} placeholder="action" />
      <Button title="Create Sync" onPress={handleCreateSync} />
    </Card>
  );

  const renderTransactionSyncForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <ThemedText type="title" className="mb-4">
        Create Transaction Sync
      </ThemedText>
      <TextInput
        icon="link"
        label="Plaid Item ID *"
        value={tsPlaidItemId}
        onChangeText={setTsPlaidItemId}
        placeholder="plaid_item_id"
      />
      <TextInput
        icon="circle-check"
        label="Transactions Update Status *"
        value={transactionsUpdateStatus}
        onChangeText={setTransactionsUpdateStatus}
        placeholder="transactions_update_status"
      />
      <TextInput
        icon="arrow-right"
        label="Next Cursor *"
        value={nextCursor}
        onChangeText={setNextCursor}
        placeholder="next_cursor"
      />
      <View className="flex-row items-center mb-3">
        <Text className="text-text font-semibold mr-2">Has More</Text>
        <Switch value={hasMore} onValueChange={setHasMore} />
      </View>
      <TextInput
        icon="hashtag"
        label="Request ID *"
        value={requestId}
        onChangeText={setRequestId}
        placeholder="request_id"
      />
      <Button title="Create Transaction Sync" onPress={handleCreateTransactionSync} />
    </Card>
  );

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        leftIcon="left"
        centerComponent={<ThemedText type="subtitle">Debug Data Entry</ThemedText>}
      />
      <AnimatedScrollView animatedRef={animatedRef}>
        <SafeAreaView className="flex-1">
          <View className="p-4 border-b border-border">
            <View className="mb-4">
              <Button title="Clear All Data" onPress={handleClearDatabase} color="error" />
            </View>
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
                  ] as const
                ).map(tab => (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
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
          <ScrollView>
            {activeTab === 'account' && renderAccountForm()}
            {activeTab === 'category' && renderCategoryForm()}
            {activeTab === 'item' && renderItemForm()}
            {activeTab === 'transaction' && renderTransactionForm()}
            {activeTab === 'sync' && renderSyncForm()}
            {activeTab === 'transactionSync' && renderTransactionSyncForm()}
          </ScrollView>
        </SafeAreaView>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}
