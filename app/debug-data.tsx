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
import { TransactionSource } from '@/types/transaction';
import { Header, ThemedText } from '@/components/shared';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { BackgroundContainer } from '@/components/ui/background-container';
import AnimatedScrollView from '@/components/ui/animated-scrollview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextInput } from '@/components/ui/inputs/text-input';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Colors } from '@/constants/colors';
import { useDependency } from '@/context/dependencyContext';
import { PlaidService } from '@/services/plaid-service';
import { clearDatabase } from '@/helpers/database-helpers';
import { useObservableCollection } from '@/hooks/use-observable';

type TabType = 'account' | 'category' | 'item' | 'transaction' | 'sync' | 'transactionSync';

export default function DebugDataScreen() {
  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);
  const { plaidApi } = useDependency();

  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Observe collections
  const accounts = useObservableCollection(database.get<Account>('accounts').query().observe());
  const categories = useObservableCollection(database.get<Category>('categories').query().observe());
  const items = useObservableCollection(database.get<Item>('items').query().observe());
  const transactions = useObservableCollection(database.get<Transaction>('transactions').query().observe());
  const syncs = useObservableCollection(database.get<Sync>('syncs').query().observe());
  const transactionSyncs = useObservableCollection(
    database.get<TransactionSync>('transaction_syncs').query().observe()
  );

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
  const [itemId, setItemId] = useState('');
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

  const resetAccountForm = () => {
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
    setItemId('');
    setEditingRecord(null);
    setShowCreateForm(false);
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setPrimary('');
    setDetailed('');
    setDescription('');
    setIcon('');
    setColor('');
    setIgnored(false);
    setChildren('');
    setEditingRecord(null);
    setShowCreateForm(false);
  };

  const resetItemForm = () => {
    setItemAccountId('');
    setPlaidItemId('');
    setInstitutionId('');
    setInstitutionName('');
    setStatus('');
    setLastSuccessfulUpdate('');
    setIsActive(true);
    setEditingRecord(null);
    setShowCreateForm(false);
  };

  const resetTransactionForm = () => {
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
    setEditingRecord(null);
    setShowCreateForm(false);
  };

  const resetSyncForm = () => {
    setSyncAccountId('');
    setUserId('');
    setSyncPlaidItemId('');
    setAction('');
    setEditingRecord(null);
    setShowCreateForm(false);
  };

  const resetTransactionSyncForm = () => {
    setTsPlaidItemId('');
    setTransactionsUpdateStatus('');
    setNextCursor('');
    setHasMore(false);
    setRequestId('');
    setEditingRecord(null);
    setShowCreateForm(false);
  };

  const loadAccountForEdit = (account: Account) => {
    setAccountId(account.accountId);
    setAccountName(account.name);
    setOfficialName(account.officialName || '');
    setAccountType(account.type);
    setSubtype(account.subtype);
    setMask(account.mask || '');
    setBalanceCurrent(account.balanceCurrent.toString());
    setBalanceAvailable(account.balanceAvailable?.toString() || '');
    setIsoCurrencyCode(account.isoCurrencyCode || '');
    setUnofficialCurrencyCode(account.unofficialCurrencyCode || '');
    setItemId(account.itemId);
    setEditingRecord(account.id);
    setShowCreateForm(true);
  };

  const loadCategoryForEdit = (category: Category) => {
    setCategoryName(category.name);
    setPrimary(category.primary);
    setDetailed(category.detailed);
    setDescription(category.description);
    setIcon(category.icon || '');
    setColor(category.color || '');
    setIgnored(category.ignored);
    setChildren(category.children || '');
    setEditingRecord(category.id);
    setShowCreateForm(true);
  };

  const loadItemForEdit = (item: Item) => {
    setItemAccountId(item.accountId);
    setPlaidItemId(item.plaidItemId);
    setInstitutionId(item.institutionId);
    setInstitutionName(item.institutionName);
    setStatus(item.status);
    setLastSuccessfulUpdate(item.lastSuccessfulUpdate || '');
    setIsActive(item.isActive);
    setEditingRecord(item.id);
    setShowCreateForm(true);
  };

  const loadTransactionForEdit = (transaction: Transaction) => {
    setTransactionId(transaction.transactionId);
    setTransactionAccountId(transaction.accountId);
    setAmount(transaction.amount.toString());
    setTransactionIsoCurrencyCode(transaction.isoCurrencyCode || '');
    setTransactionUnofficialCurrencyCode(transaction.unofficialCurrencyCode || '');
    setCategory(transaction.category || '');
    setCategoryId(transaction.categoryId || '');
    setCheckNumber(transaction.checkNumber || '');
    setDate(transaction.date);
    setAuthorizedDate(transaction.authorizedDate || '');
    setAuthorizedDatetime(transaction.authorizedDatetime || '');
    setDatetime(transaction.datetime || '');
    setPaymentChannel(transaction.paymentChannel);
    setPersonalFinanceCategoryPrimary(transaction.personalFinanceCategoryPrimary || '');
    setPersonalFinanceCategoryDetailed(transaction.personalFinanceCategoryDetailed || '');
    setPersonalFinanceCategoryConfidenceLevel(transaction.personalFinanceCategoryConfidenceLevel || '');
    setPersonalFinanceCategoryIconUrl(transaction.personalFinanceCategoryIconUrl || '');
    setTransactionName(transaction.name);
    setMerchantName(transaction.merchantName || '');
    setMerchantEntityId(transaction.merchantEntityId || '');
    setLogoUrl(transaction.logoUrl || '');
    setWebsite(transaction.website || '');
    setPending(transaction.pending);
    setTransactionCode(transaction.transactionCode || '');
    setCounterparties(transaction.counterparties || '');
    setEditingRecord(transaction.id);
    setShowCreateForm(true);
  };

  const loadSyncForEdit = (sync: Sync) => {
    setSyncAccountId(sync.accountId);
    setUserId(sync.userId);
    setSyncPlaidItemId(sync.plaidItemId);
    setAction(sync.action);
    setEditingRecord(sync.id);
    setShowCreateForm(true);
  };

  const loadTransactionSyncForEdit = (ts: TransactionSync) => {
    setTsPlaidItemId(ts.plaidItemId);
    setTransactionsUpdateStatus(ts.transactionsUpdateStatus);
    setNextCursor(ts.nextCursor);
    setHasMore(ts.hasMore);
    setRequestId(ts.requestId);
    setEditingRecord(ts.id);
    setShowCreateForm(true);
  };

  const handleCreateOrUpdateAccount = async () => {
    if (!accountId || !accountName || !accountType || !subtype || !balanceCurrent || !itemId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        if (editingRecord) {
          const account = await database.get<Account>('accounts').find(editingRecord);
          await account.update(acc => {
            acc.accountId = accountId;
            acc.name = accountName;
            acc.officialName = officialName || undefined;
            acc.type = accountType;
            acc.subtype = subtype;
            acc.mask = mask || undefined;
            acc.balanceCurrent = parseFloat(balanceCurrent);
            acc.balanceAvailable = balanceAvailable ? parseFloat(balanceAvailable) : undefined;
            acc.isoCurrencyCode = isoCurrencyCode || undefined;
            acc.unofficialCurrencyCode = unofficialCurrencyCode || undefined;
            acc.itemId = itemId;
          });
          Alert.alert('Success', 'Account updated');
        } else {
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
            account.itemId = itemId;
          });
          Alert.alert('Success', 'Account created');
        }
      });
      resetAccountForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    Alert.alert('Delete Account', 'Are you sure you want to delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const account = await database.get<Account>('accounts').find(id);
              await account.markAsDeleted();
            });
            Alert.alert('Success', 'Account deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete account');
          }
        },
      },
    ]);
  };

  const handleCreateOrUpdateCategory = async () => {
    if (!categoryName || !primary || !detailed || !description) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        if (editingRecord) {
          const category = await database.get<Category>('categories').find(editingRecord);
          await category.update(cat => {
            cat.name = categoryName;
            cat.primary = primary;
            cat.detailed = detailed;
            cat.description = description;
            cat.icon = icon || undefined;
            cat.color = color || undefined;
            cat.ignored = ignored;
            cat.children = children || undefined;
          });
          Alert.alert('Success', 'Category updated');
        } else {
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
          Alert.alert('Success', 'Category created');
        }
      });
      resetCategoryForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert('Delete Category', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const category = await database.get<Category>('categories').find(id);
              await category.markAsDeleted();
            });
            Alert.alert('Success', 'Category deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete category');
          }
        },
      },
    ]);
  };

  const handleCreateOrUpdateItem = async () => {
    if (!itemAccountId || !plaidItemId || !institutionId || !institutionName || !status) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        if (editingRecord) {
          const item = await database.get<Item>('items').find(editingRecord);
          await item.update(it => {
            it.accountId = itemAccountId;
            it.plaidItemId = plaidItemId;
            it.institutionId = institutionId;
            it.institutionName = institutionName;
            it.status = status;
            it.lastSuccessfulUpdate = lastSuccessfulUpdate || undefined;
            it.isActive = isActive;
          });
          Alert.alert('Success', 'Item updated');
        } else {
          await database.get<Item>('items').create(item => {
            item.accountId = itemAccountId;
            item.plaidItemId = plaidItemId;
            item.institutionId = institutionId;
            item.institutionName = institutionName;
            item.status = status;
            item.lastSuccessfulUpdate = lastSuccessfulUpdate || undefined;
            item.isActive = isActive;
          });
          Alert.alert('Success', 'Item created');
        }
      });
      resetItemForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const item = await database.get<Item>('items').find(id);
              await item.markAsDeleted();
            });
            Alert.alert('Success', 'Item deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleCreateOrUpdateTransaction = async () => {
    if (!transactionId || !transactionAccountId || !amount || !date || !paymentChannel || !transactionName) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        if (editingRecord) {
          const transaction = await database.get<Transaction>('transactions').find(editingRecord);
          await transaction.update(tr => {
            tr.transactionId = transactionId;
            tr.accountId = transactionAccountId;
            tr.amount = parseFloat(amount);
            tr.isoCurrencyCode = transactionIsoCurrencyCode || undefined;
            tr.unofficialCurrencyCode = transactionUnofficialCurrencyCode || undefined;
            tr.category = category || undefined;
            tr.categoryId = categoryId || undefined;
            tr.checkNumber = checkNumber || undefined;
            tr.date = date;
            tr.authorizedDate = authorizedDate || undefined;
            tr.authorizedDatetime = authorizedDatetime || undefined;
            tr.datetime = datetime || undefined;
            tr.paymentChannel = paymentChannel;
            tr.personalFinanceCategoryPrimary = personalFinanceCategoryPrimary || undefined;
            tr.personalFinanceCategoryDetailed = personalFinanceCategoryDetailed || undefined;
            tr.personalFinanceCategoryConfidenceLevel = personalFinanceCategoryConfidenceLevel || undefined;
            tr.personalFinanceCategoryIconUrl = personalFinanceCategoryIconUrl || undefined;
            tr.name = transactionName;
            tr.merchantName = merchantName || undefined;
            tr.merchantEntityId = merchantEntityId || undefined;
            tr.logoUrl = logoUrl || undefined;
            tr.website = website || undefined;
            tr.pending = pending;
            tr.transactionCode = transactionCode || undefined;
            tr.counterparties = counterparties || undefined;
          });
          Alert.alert('Success', 'Transaction updated');
        } else {
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
            transaction.source = TransactionSource.Local;
          });
          Alert.alert('Success', 'Transaction created');
        }
      });
      resetTransactionForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const transaction = await database.get<Transaction>('transactions').find(id);
              await transaction.markAsDeleted();
            });
            Alert.alert('Success', 'Transaction deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete transaction');
          }
        },
      },
    ]);
  };

  const handleCreateOrUpdateSync = async () => {
    if (!syncAccountId || !userId || !syncPlaidItemId || !action) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        if (editingRecord) {
          const sync = await database.get<Sync>('syncs').find(editingRecord);
          await sync.update(s => {
            s.accountId = syncAccountId;
            s.userId = userId;
            s.plaidItemId = syncPlaidItemId;
            s.action = action;
          });
          Alert.alert('Success', 'Sync updated');
        } else {
          await database.get<Sync>('syncs').create(sync => {
            sync.accountId = syncAccountId;
            sync.userId = userId;
            sync.plaidItemId = syncPlaidItemId;
            sync.action = action;
          });
          Alert.alert('Success', 'Sync created');
        }
      });
      resetSyncForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save sync');
    }
  };

  const handleDeleteSync = async (id: string) => {
    Alert.alert('Delete Sync', 'Are you sure you want to delete this sync?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const sync = await database.get<Sync>('syncs').find(id);
              await sync.markAsDeleted();
            });
            Alert.alert('Success', 'Sync deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete sync');
          }
        },
      },
    ]);
  };

  const handleCreateOrUpdateTransactionSync = async () => {
    if (!tsPlaidItemId || !transactionsUpdateStatus || !nextCursor || !requestId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await database.write(async () => {
        if (editingRecord) {
          const ts = await database.get<TransactionSync>('transaction_syncs').find(editingRecord);
          await ts.update(t => {
            t.plaidItemId = tsPlaidItemId;
            t.transactionsUpdateStatus = transactionsUpdateStatus;
            t.nextCursor = nextCursor;
            t.hasMore = hasMore;
            t.requestId = requestId;
          });
          Alert.alert('Success', 'TransactionSync updated');
        } else {
          await database.get<TransactionSync>('transaction_syncs').create(ts => {
            ts.plaidItemId = tsPlaidItemId;
            ts.transactionsUpdateStatus = transactionsUpdateStatus;
            ts.nextCursor = nextCursor;
            ts.hasMore = hasMore;
            ts.requestId = requestId;
          });
          Alert.alert('Success', 'TransactionSync created');
        }
      });
      resetTransactionSyncForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save transaction sync');
    }
  };

  const handleDeleteTransactionSync = async (id: string) => {
    Alert.alert('Delete Transaction Sync', 'Are you sure you want to delete this transaction sync?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.write(async () => {
              const ts = await database.get<TransactionSync>('transaction_syncs').find(id);
              await ts.markAsDeleted();
            });
            Alert.alert('Success', 'TransactionSync deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete transaction sync');
          }
        },
      },
    ]);
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
        <Button
          title="+ New"
          onPress={() => {
            resetAccountForm();
            setShowCreateForm(true);
          }}
          size="sm"
          width="w-1/4"
        />
      </View>
      {showCreateForm && renderAccountForm()}
      <View className="flex-1 px-2">
        <DataTable
          data={accounts}
          columns={accountColumns}
          keyExtractor={item => item.id}
          onRowPress={loadAccountForEdit}
          onDelete={item => handleDeleteAccount(item.id)}
          emptyMessage="No accounts found. Create one to get started."
        />
      </View>
    </View>
  );

  const renderAccountForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText type="title">{editingRecord ? 'Edit' : 'Create'} Account</ThemedText>
        <Button title="Cancel" onPress={resetAccountForm} variant="outlined" size="sm" width="w-1/4" />
      </View>
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
      <TextInput icon="hashtag" label="Item ID *" value={itemId} onChangeText={setItemId} placeholder="item_id" />
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
      <Button title={editingRecord ? 'Update Account' : 'Create Account'} onPress={handleCreateOrUpdateAccount} />

      {!editingRecord && (
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
      )}
    </Card>
  );

  const categoryColumns: TableColumn<Category>[] = [
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
        <Button
          title="+ New"
          onPress={() => {
            resetCategoryForm();
            setShowCreateForm(true);
          }}
          size="sm"
          width="w-1/4"
        />
      </View>
      {showCreateForm && renderCategoryForm()}
      <View className="flex-1 px-2">
        <DataTable
          data={categories}
          columns={categoryColumns}
          keyExtractor={item => item.id}
          onRowPress={loadCategoryForEdit}
          onDelete={item => handleDeleteCategory(item.id)}
          emptyMessage="No categories found. Create one to get started."
        />
      </View>
    </View>
  );

  const renderCategoryForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText type="title">{editingRecord ? 'Edit' : 'Create'} Category</ThemedText>
        <Button title="Cancel" onPress={resetCategoryForm} variant="outlined" size="sm" width="w-1/4" />
      </View>
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
      <Button title={editingRecord ? 'Update Category' : 'Create Category'} onPress={handleCreateOrUpdateCategory} />
    </Card>
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
        <Button
          title="+ New"
          onPress={() => {
            resetItemForm();
            setShowCreateForm(true);
          }}
          size="sm"
          width="w-1/4"
        />
      </View>
      {showCreateForm && renderItemForm()}
      <View className="flex-1 px-2">
        <DataTable
          data={items}
          columns={itemColumns}
          keyExtractor={item => item.id}
          onRowPress={loadItemForEdit}
          onDelete={item => handleDeleteItem(item.id)}
          emptyMessage="No items found. Create one to get started."
        />
      </View>
    </View>
  );

  const renderItemForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText type="title">{editingRecord ? 'Edit' : 'Create'} Item</ThemedText>
        <Button title="Cancel" onPress={resetItemForm} variant="outlined" size="sm" width="w-1/4" />
      </View>
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
      <Button title={editingRecord ? 'Update Item' : 'Create Item'} onPress={handleCreateOrUpdateItem} />
    </Card>
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
          {item.category || '-'}
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
        <Button
          title="+ New"
          onPress={() => {
            resetTransactionForm();
            setShowCreateForm(true);
          }}
          size="sm"
          width="w-1/4"
        />
      </View>
      {showCreateForm && renderTransactionForm()}
      <View className="flex-1 px-2">
        <DataTable
          data={transactions}
          columns={transactionColumns}
          keyExtractor={item => item.id}
          onRowPress={loadTransactionForEdit}
          onDelete={item => handleDeleteTransaction(item.id)}
          emptyMessage="No transactions found. Create one to get started."
        />
      </View>
    </View>
  );

  const renderTransactionForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText type="title">{editingRecord ? 'Edit' : 'Create'} Transaction</ThemedText>
        <Button title="Cancel" onPress={resetTransactionForm} variant="outlined" size="sm" width="w-1/4" />
      </View>
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
      <Button
        title={editingRecord ? 'Update Transaction' : 'Create Transaction'}
        onPress={handleCreateOrUpdateTransaction}
      />
    </Card>
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
        <Button
          title="+ New"
          onPress={() => {
            resetSyncForm();
            setShowCreateForm(true);
          }}
          size="sm"
          width="w-1/4"
        />
      </View>
      {showCreateForm && renderSyncForm()}
      <View className="flex-1 px-2">
        <DataTable
          data={syncs}
          columns={syncColumns}
          keyExtractor={item => item.id}
          onRowPress={loadSyncForEdit}
          onDelete={item => handleDeleteSync(item.id)}
          emptyMessage="No syncs found. Create one to get started."
        />
      </View>
    </View>
  );

  const renderSyncForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText type="title">{editingRecord ? 'Edit' : 'Create'} Sync</ThemedText>
        <Button title="Cancel" onPress={resetSyncForm} variant="outlined" size="sm" width="w-1/4" />
      </View>
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
      <Button title={editingRecord ? 'Update Sync' : 'Create Sync'} onPress={handleCreateOrUpdateSync} />
    </Card>
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
        <Button
          title="+ New"
          onPress={() => {
            resetTransactionSyncForm();
            setShowCreateForm(true);
          }}
          size="sm"
          width="w-1/4"
        />
      </View>
      {showCreateForm && renderTransactionSyncForm()}
      <View className="flex-1 px-2">
        <DataTable
          data={transactionSyncs}
          columns={transactionSyncColumns}
          keyExtractor={item => item.id}
          onRowPress={loadTransactionSyncForEdit}
          onDelete={item => handleDeleteTransactionSync(item.id)}
          emptyMessage="No transaction syncs found. Create one to get started."
        />
      </View>
    </View>
  );

  const renderTransactionSyncForm = () => (
    <Card className="m-4" padding="lg" backgroundColor="secondary">
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText type="title">{editingRecord ? 'Edit' : 'Create'} Transaction Sync</ThemedText>
        <Button title="Cancel" onPress={resetTransactionSyncForm} variant="outlined" size="sm" width="w-1/4" />
      </View>
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
      <Button
        title={editingRecord ? 'Update Transaction Sync' : 'Create Transaction Sync'}
        onPress={handleCreateOrUpdateTransactionSync}
      />
    </Card>
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
      default:
        return null;
    }
  };

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        leftIcon="left"
        centerComponent={<ThemedText type="subtitle">Database Editor</ThemedText>}
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
                    onPress={() => {
                      setActiveTab(tab.key as TabType);
                      setShowCreateForm(false);
                      setEditingRecord(null);
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
