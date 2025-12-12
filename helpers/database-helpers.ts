import { Database } from '@nozbe/watermelondb';
import database from '@/model/database';
import Account from '@/model/models/account';
import Transaction from '@/model/models/transaction';
import Item from '@/model/models/item';
import Sync from '@/model/models/sync';
import Category from '@/model/models/category';
import TransactionSync from '@/model/models/transaction-sync';

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

    // Delete all records permanently
    await Promise.all([
      ...accounts.map(record => record.destroyPermanently()),
      ...transactions.map(record => record.destroyPermanently()),
      ...items.map(record => record.destroyPermanently()),
      ...syncs.map(record => record.destroyPermanently()),
      ...categories.map(record => record.destroyPermanently()),
      ...transactionSyncs.map(record => record.destroyPermanently()),
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
