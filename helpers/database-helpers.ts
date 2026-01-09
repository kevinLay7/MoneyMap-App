import { Database } from '@nozbe/watermelondb';
import database from '@/model/database';
import Account from '@/model/models/account';
import Transaction from '@/model/models/transaction';
import Item from '@/model/models/item';
import Sync from '@/model/models/sync';
import Category from '@/model/models/category';
import TransactionSync from '@/model/models/transaction-sync';
import Budget from '@/model/models/budget';
import BudgetItem from '@/model/models/budget-item';
import AccountDailyBalance from '@/model/models/account-daily-balance';
import Merchant from '@/model/models/merchant';
import Log from '@/model/models/log';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

/**
 * Clears all data from the WatermelonDB database
 * This permanently deletes all records from all tables
 */
export async function clearDatabase(): Promise<void> {
  await database.write(async () => {
    // Fetch all records from all tables
    const accounts = await database.get<Account>('accounts').query().fetch();
    const transactions = await database.get<Transaction>('transactions').query().fetch();
    const items = await database.get<Item>('items').query().fetch();
    const syncs = await database.get<Sync>('syncs').query().fetch();
    const categories = await database.get<Category>('categories').query().fetch();
    const transactionSyncs = await database.get<TransactionSync>('transaction_syncs').query().fetch();
    const budgets = await database.get<Budget>('budgets').query().fetch();
    const budgetItems = await database.get<BudgetItem>('budget_items').query().fetch();
    const accountDailyBalances = await database.get<AccountDailyBalance>('account_daily_balances').query().fetch();
    const merchants = await database.get<Merchant>('merchants').query().fetch();
    const logs = await database.get<Log>('logs').query().fetch();

    // Delete all records permanently
    await Promise.all([
      ...accounts.map(record => record.destroyPermanently()),
      ...transactions.map(record => record.destroyPermanently()),
      ...items.map(record => record.destroyPermanently()),
      ...syncs.map(record => record.destroyPermanently()),
      ...categories.map(record => record.destroyPermanently()),
      ...transactionSyncs.map(record => record.destroyPermanently()),
      ...budgets.map(record => record.destroyPermanently()),
      ...budgetItems.map(record => record.destroyPermanently()),
      ...accountDailyBalances.map(record => record.destroyPermanently()),
      ...merchants.map(record => record.destroyPermanently()),
      ...logs.map(record => record.destroyPermanently()),
    ]);
  });
}

/**
 * Executes an async function within a database write context.
 * If already in a write context, executes directly. Otherwise, wraps in database.write().
 *
 * @param database - The WatermelonDB database instance
 * @param fn - The async function to execute
 * @param inWriteContext - If true, assumes we're already in a write context and executes directly
 * @returns The result of the function execution
 *
 * @example
 * // When called from within a write block
 * await database.write(async () => {
 *   await executeInWriteContext(database, async () => {
 *     await record.update(r => { r.field = 'value'; });
 *   }, true);
 * });
 *
 * @example
 * // When called standalone
 * await executeInWriteContext(database, async () => {
 *   await record.update(r => { r.field = 'value'; });
 * });
 */
export async function executeInWriteContext<T>(
  database: Database,
  fn: () => Promise<T>,
  inWriteContext: boolean = false
): Promise<T> {
  if (inWriteContext) {
    return await fn();
  } else {
    return await database.write(fn);
  }
}

/**
 * Deletes the local database file to force a fresh database creation on next app start.
 * This will clear all data and reset the database schema version.
 *
 * Note: This requires the app to be restarted after deletion.
 */
export async function deleteDatabaseFile(): Promise<void> {
  try {
    // Access the adapter to get the database path
    const adapter = (database as any).adapter;
    const underlyingAdapter = (adapter as any).underlyingAdapter;

    if (!underlyingAdapter) {
      throw new Error('Unable to access database adapter');
    }

    // Get the database path from the adapter
    const dbPath = underlyingAdapter.dbName || underlyingAdapter.databasePath || underlyingAdapter.path;

    if (!dbPath) {
      throw new Error(
        'Unable to determine database file path. Check the logs for the database path and delete it manually.'
      );
    }

    // Try to delete the file using available file system libraries
    let deleted = false;

    // Try expo-file-system
    try {
      const FileSystem = require('expo-file-system');
      if (FileSystem?.deleteAsync) {
        await FileSystem.deleteAsync(dbPath, { idempotent: true });
        logger.info(LogType.Database, 'Database file deleted using expo-file-system');
        deleted = true;
      }
    } catch (e) {
      // expo-file-system not available or failed
    }

    // Try react-native-fs if expo-file-system didn't work
    if (!deleted) {
      try {
        const RNFS = require('react-native-fs');
        if (RNFS?.unlink) {
          await RNFS.unlink(dbPath);
          logger.info(LogType.Database, 'Database file deleted using react-native-fs');
          deleted = true;
        }
      } catch (e) {
        // react-native-fs not available or failed
      }
    }

    // If we couldn't delete programmatically, provide the path and instructions
    if (!deleted) {
      throw new Error(
        `Database file path:\n${dbPath}\n\n` +
          'Unable to delete programmatically. Please delete the file manually:\n' +
          '1. Close the app completely\n' +
          '2. Delete the file at the path above (or delete the app from simulator)\n' +
          '3. Restart the app'
      );
    }
  } catch (error: any) {
    logger.error(LogType.Database, 'Failed to delete database file', { error });
    throw error;
  }
}
