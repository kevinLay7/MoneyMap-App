import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';

import { schema } from './schema';
import migrations from './migrations';
import Account from './models/account';
import Transaction from './models/transaction';
import Item from './models/item';
import Sync from './models/sync';
import Category from './models/category';
import TransactionSync from './models/transaction-sync';
import Budget from './models/budget';
import BudgetItem from './models/budget-item';
import AccountDailyBalance from './models/account-daily-balance';
import Merchant from './models/merchant';

// Create adapter with JSI disabled for dev client compatibility
// JSI requires native build - enable it only when running built app
// Set jsi: true after running `npm run ios` or building the app
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // Disable JSI for compatibility with dev client
  // Enable JSI after building: jsi: Platform.OS === 'ios'
  jsi: false,
  onSetUpError: error => {
    console.error('Database setup error:', error);
  },
});

// Then, make a Watermelon database from it!
const database = new Database({
  adapter,
  modelClasses: [Account, Transaction, Item, Sync, Category, TransactionSync, Budget, BudgetItem, AccountDailyBalance, Merchant],
});

export default database;
