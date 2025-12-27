import { SyncDatabaseChangeSet, synchronize, SyncConflictResolver } from '@nozbe/watermelondb/sync';
import { fetchLocalChanges, markLocalChangesAsSynced, getLastPulledAt } from '@nozbe/watermelondb/sync/impl';
import database from './database';
import { Sync } from '@/api/gen/Sync';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import { syncEncryptionService } from '@/services';
import { DailyBalanceService } from '@/services/daily-balance-service';

/**
 * Table dependency order for sync operations.
 * Tables must be synced in this order to maintain referential integrity.
 *
 * Dependency hierarchy:
 * 1. categories (synced first, but system categories excluded)
 * 2. items, accounts (circular dependency - must be synced together)
 * 3. transactions (depends on accounts)
 * 4. budgets (depends on accounts)
 * 5. budget_items (depends on budgets)
 * 6. syncs, transaction_syncs (depend on items/accounts)
 */
const SYNC_TABLE_ORDER = [
  'categories',
  'items',
  'accounts',
  'transactions',
  'budgets',
  'budget_items',
  'syncs',
  'transaction_syncs',
] as const;

/**
 * Tables that should be excluded from sync operations
 */
const EXCLUDED_TABLES: readonly string[] = [];

/**
 * Filters out excluded tables from changes object.
 */
function filterExcludedTables(changes: SyncDatabaseChangeSet): SyncDatabaseChangeSet {
  const filtered: Record<string, any> = {};

  for (const [tableName, tableChanges] of Object.entries(changes)) {
    if (!EXCLUDED_TABLES.includes(tableName)) {
      filtered[tableName] = tableChanges;
    }
  }

  return filtered as SyncDatabaseChangeSet;
}

/**
 * Filters out categories whose id starts with "sys" from changes.
 * System categories should not be synced.
 */
function filterSystemCategories(changes: SyncDatabaseChangeSet): SyncDatabaseChangeSet {
  const filtered = { ...changes } as Record<string, any>;

  if (filtered.categories) {
    const categoryChanges = filtered.categories as { created?: any[]; updated?: any[]; deleted?: any[] };
    const filteredCategoryChanges: { created?: any[]; updated?: any[]; deleted?: any[] } = {};

    // Filter created categories
    if (categoryChanges.created) {
      filteredCategoryChanges.created = categoryChanges.created.filter(
        (item: any) => !item.id || !item.id.startsWith('sys')
      );
    }

    // Filter updated categories
    if (categoryChanges.updated) {
      filteredCategoryChanges.updated = categoryChanges.updated.filter(
        (item: any) => !item.id || !item.id.startsWith('sys')
      );
    }

    // Filter deleted categories
    if (categoryChanges.deleted) {
      filteredCategoryChanges.deleted = categoryChanges.deleted.filter((id: string) => !id.startsWith('sys'));
    }

    // Only include categories table if there are changes after filtering
    if (
      filteredCategoryChanges?.created?.length ||
      filteredCategoryChanges?.updated?.length ||
      filteredCategoryChanges?.deleted?.length
    ) {
      filtered.categories = filteredCategoryChanges;
    } else {
      delete filtered.categories;
    }
  }

  return filtered as SyncDatabaseChangeSet;
}

/**
 * Reorders changes object to ensure tables are synced in dependency order.
 * WatermelonDB processes tables in the order they appear in the changes object.
 *
 * For the circular dependency between items and accounts:
 * - Items are synced first (they reference account_id)
 * - Accounts are synced second (they reference item_id)
 * - The backend should ensure account_id exists when creating items
 */
function reorderChangesByDependencies(changes: SyncDatabaseChangeSet): SyncDatabaseChangeSet {
  const orderedChanges: Record<string, any> = {};
  const changesAny = changes as any;

  // Process tables in dependency order
  for (const tableName of SYNC_TABLE_ORDER) {
    if (changesAny[tableName]) {
      orderedChanges[tableName] = changesAny[tableName];
    }
  }

  // Include any tables not in our ordered list (for future-proofing)
  // But exclude tables that are in the excluded list
  for (const [tableName, tableChanges] of Object.entries(changes)) {
    if (!orderedChanges[tableName] && !EXCLUDED_TABLES.includes(tableName)) {
      orderedChanges[tableName] = tableChanges;
    }
  }

  return orderedChanges as SyncDatabaseChangeSet;
}

/**
 * Conflict resolver that handles cross-device conflicts.
 * Always accepts remote version, overwriting local changes.
 * This ensures that server state (from other devices) takes precedence.
 */
const conflictResolver: SyncConflictResolver = (table, local, remote, resolved) => {
  // If local record was deleted, keep local (deletion wins)
  if (local._status === 'deleted') {
    return local;
  }

  // Always accept remote version, overwriting local changes
  // Keep local id, but use all remote field values and mark as synced
  return {
    ...remote,
    id: local.id, // ID cannot change
    _status: 'synced',
    _chagned: '',
  };
};

/**
 * Encrypts records in changes before sending to server.
 * Only encrypts created and updated records (not deleted IDs).
 */
async function encryptChanges(changes: SyncDatabaseChangeSet): Promise<SyncDatabaseChangeSet> {
  const encryptedChanges: Record<string, any> = {};

  for (const [tableName, tableChanges] of Object.entries(changes)) {
    const typedTableChanges = tableChanges as { created?: any[]; updated?: any[]; deleted?: any[] };
    const encryptedTableChanges: {
      created?: { id: string; record: string }[];
      updated?: { id: string; record: string }[];
      deleted?: any[];
    } = {};

    // Encrypt created records
    if (typedTableChanges.created?.length) {
      encryptedTableChanges.created = await syncEncryptionService.encryptRecords(typedTableChanges.created);
    }

    // Encrypt updated records
    if (typedTableChanges.updated?.length) {
      encryptedTableChanges.updated = await syncEncryptionService.encryptRecords(typedTableChanges.updated);
    }

    // Deleted items are just IDs, don't encrypt them
    if (typedTableChanges.deleted?.length) {
      encryptedTableChanges.deleted = typedTableChanges.deleted;
    }

    // Only include table if it has changes
    if (
      encryptedTableChanges.created?.length ||
      encryptedTableChanges.updated?.length ||
      encryptedTableChanges.deleted?.length
    ) {
      encryptedChanges[tableName] = encryptedTableChanges;
    }
  }

  return encryptedChanges as SyncDatabaseChangeSet;
}

/**
 * Decrypts records in changes received from server.
 * Only decrypts created and updated records (not deleted IDs).
 */
async function decryptChanges(changes: SyncDatabaseChangeSet): Promise<SyncDatabaseChangeSet> {
  const decryptedChanges: Record<string, any> = {};

  for (const [tableName, tableChanges] of Object.entries(changes)) {
    const typedTableChanges = tableChanges as { created?: string[]; updated?: string[]; deleted?: any[] };
    const decryptedTableChanges: { created?: any[]; updated?: any[]; deleted?: any[] } = {
      created: [],
      updated: [],
      deleted: [],
    };

    // Decrypt created records (expecting encrypted strings)
    if (typedTableChanges.created?.length) {
      decryptedTableChanges.created = await syncEncryptionService.decryptRecords(typedTableChanges.created);
    }

    // Decrypt updated records (expecting encrypted strings)
    if (typedTableChanges.updated?.length) {
      decryptedTableChanges.updated = await syncEncryptionService.decryptRecords(typedTableChanges.updated);
    }

    // Deleted items are just IDs, don't decrypt them
    if (typedTableChanges.deleted?.length) {
      decryptedTableChanges.deleted = typedTableChanges.deleted;
    }

    // Only include table if it has changes
    if (
      decryptedTableChanges.created?.length ||
      decryptedTableChanges.updated?.length ||
      decryptedTableChanges.deleted?.length
    ) {
      decryptedChanges[tableName] = decryptedTableChanges;
    }
  }

  return decryptedChanges as SyncDatabaseChangeSet;
}

/**
 * Helper function to push changes to the server.
 * Handles filtering, batching, normalization, and encryption of changes.
 */
async function pushChangesToServer(syncApi: Sync, changes: SyncDatabaseChangeSet, lastPulledAt: number): Promise<void> {
  // Filter out excluded tables before pushing
  const filteredChanges = filterExcludedTables(changes);

  // Filter out system categories (ids starting with "sys") before pushing
  const filteredCategoryChanges = filterSystemCategories(filteredChanges);

  // Encrypt records before sending to server
  const encryptedChanges = await encryptChanges(filteredCategoryChanges);

  const BATCH_SIZE = 50;

  // Count total items across all tables
  let totalItems = 0;
  for (const tableChanges of Object.values(encryptedChanges)) {
    const typedTableChanges = tableChanges as { created?: string[]; updated?: string[]; deleted?: any[] };
    totalItems += typedTableChanges.created?.length || 0;
    totalItems += typedTableChanges.updated?.length || 0;
    totalItems += typedTableChanges.deleted?.length || 0;
  }

  // If total items <= BATCH_SIZE, send as-is
  if (totalItems <= BATCH_SIZE) {
    // Ensure all tables have created, updated, and deleted arrays
    const normalizedChanges: Record<string, any> = {};
    for (const [tableName, tableChanges] of Object.entries(encryptedChanges)) {
      const typedTableChanges = tableChanges as { created?: string[]; updated?: string[]; deleted?: any[] };
      normalizedChanges[tableName] = {
        created: typedTableChanges.created || [],
        updated: typedTableChanges.updated || [],
        deleted: typedTableChanges.deleted || [],
      };
    }
    await syncApi.syncControllerPushChanges({
      changes: normalizedChanges,
      lastPulledAt: String(lastPulledAt || 0),
      migrations: 1,
    });
    return;
  }

  // Flatten all changes into a list of operations
  type ChangeOperation = {
    table: string;
    type: 'created' | 'updated' | 'deleted';
    items: any[];
  };

  const operations: ChangeOperation[] = [];
  for (const [tableName, tableChanges] of Object.entries(encryptedChanges)) {
    const typedTableChanges = tableChanges as { created?: string[]; updated?: string[]; deleted?: any[] };
    if (typedTableChanges.created?.length) {
      operations.push({
        table: tableName,
        type: 'created',
        items: typedTableChanges.created,
      });
    }
    if (typedTableChanges.updated?.length) {
      operations.push({
        table: tableName,
        type: 'updated',
        items: typedTableChanges.updated,
      });
    }
    if (typedTableChanges.deleted?.length) {
      operations.push({
        table: tableName,
        type: 'deleted',
        items: typedTableChanges.deleted,
      });
    }
  }

  // Split operations into batches of BATCH_SIZE items
  const batches: ChangeOperation[][] = [];
  let currentBatch: ChangeOperation[] = [];
  let currentBatchSize = 0;

  for (const operation of operations) {
    let remainingItems = operation.items;

    while (remainingItems.length > 0) {
      const spaceInBatch = BATCH_SIZE - currentBatchSize;
      const itemsToAdd = remainingItems.slice(0, spaceInBatch);
      const remaining = remainingItems.slice(spaceInBatch);

      const lastOp = currentBatch.at(-1);
      if (!lastOp || lastOp.table !== operation.table || lastOp.type !== operation.type) {
        // New operation in batch
        currentBatch.push({
          table: operation.table,
          type: operation.type,
          items: itemsToAdd,
        });
      } else {
        // Append to existing operation in batch
        const lastOp = currentBatch.at(-1);
        if (lastOp) {
          lastOp.items.push(...itemsToAdd);
        }
      }

      currentBatchSize += itemsToAdd.length;
      remainingItems = remaining;

      // If batch is full, start a new one
      if (currentBatchSize >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
    }
  }

  // Add remaining items as final batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Send each batch sequentially
  for (const batch of batches) {
    // Reconstruct changes object for this batch
    const batchChanges: Record<string, any> = {};
    for (const operation of batch) {
      if (!batchChanges[operation.table]) {
        batchChanges[operation.table] = {
          created: [],
          updated: [],
          deleted: [],
        };
      }
      batchChanges[operation.table][operation.type] = operation.items;
    }
    await syncApi.syncControllerPushChanges({
      changes: batchChanges,
      lastPulledAt: String(lastPulledAt || 0),
      migrations: 1,
    });
  }
}

/**
 * Push-only sync function that sends local changes to the server without pulling.
 * This allows for more frequent pushes while keeping full syncs at longer intervals.
 */
export async function pushOnlyChanges(syncApi: Sync): Promise<void> {
  try {
    // Get local changes from WatermelonDB
    const localChanges = await fetchLocalChanges(database);

    // Return early if no changes exist
    if (!localChanges.changes || Object.keys(localChanges.changes).length === 0) {
      return;
    }

    // Get lastPulledAt from WatermelonDB's internal storage
    const lastPulledAt = (await getLastPulledAt(database)) || 0;

    // Push changes to server
    await pushChangesToServer(syncApi, localChanges.changes, lastPulledAt);

    // Mark changes as synced after successful push
    await markLocalChangesAsSynced(database, localChanges);
  } catch (error) {
    console.error('Push-only sync failed:', error);
    // Don't throw - allow the app to continue even if push fails
    // The changes will be retried on the next push or full sync
  }
}

/**
 * Creates the sync configuration object
 */
function createSyncConfig(syncApi: Sync, logger: SyncLogger) {
  return {
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }: any) => {
      // Convert migration columns from WatermelonDB format to API format
      // WatermelonDB migration.columns is an array of {table: string, columns: string[]}
      // API expects Record<string, string[]>
      const columnsRecord: Record<string, string[]> = {};
      if (migration?.columns) {
        if (Array.isArray(migration.columns)) {
          migration.columns.forEach((item: { table: string; columns: string[] }) => {
            columnsRecord[item.table] = item.columns;
          });
        } else if (typeof migration.columns === 'object') {
          // Already in Record format
          Object.assign(columnsRecord, migration.columns);
        }
      }

      const lastPull = lastPulledAt ?? 0;
      // API expects lastPulledAt as object (backend type definition quirk)
      // Pass number directly (numbers are objects in JS) or 0 for first sync
      const response = await syncApi.syncControllerPullChanges({
        lastPulledAt: lastPull as unknown as object,
        migration: {
          // If migration exists, it means we migrated from schemaVersion-1 to schemaVersion
          // If no migration, from equals to (no schema change)
          from: migration ? schemaVersion - 1 : schemaVersion,
          to: schemaVersion,
          tables: migration?.tables || [],
          columns: columnsRecord,
        },
      });

      // Extract data from axios response
      const { changes, timestamp } = (response as any).data as { changes: any; timestamp: number };

      // Decrypt records received from server
      const decryptedChanges = await decryptChanges(changes);

      // Filter out excluded tables
      const filteredChanges = filterExcludedTables(decryptedChanges);

      // Filter out system categories (ids starting with "sys")
      const filteredCategoryChanges = filterSystemCategories(filteredChanges);

      return { changes: filteredCategoryChanges, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }: { changes: SyncDatabaseChangeSet; lastPulledAt: number }) => {
      await pushChangesToServer(syncApi, changes, lastPulledAt);
    },
    migrationsEnabledAtVersion: 1,
    conflictResolver,
    log: logger.newLog(),
    onWillApplyRemoteChanges: async (info: { remoteChangeCount: number }) => {
      if (info.remoteChangeCount > 0) {
        console.log('onWillApplyRemoteChanges', info.remoteChangeCount);
      }
    },
    onDidPullChanges: async (info: { remoteChangeCount: number }) => {
      // Calculate daily balances in background after pulling transaction changes
      // This runs asynchronously and doesn't block the sync completion
      if (info.remoteChangeCount > 0) {
        console.log('Sync pulled changes, scheduling daily balance calculation');
        // Use setImmediate to ensure this runs after sync completes, not blocking UI
        setImmediate(async () => {
          try {
            const dailyBalanceService = new DailyBalanceService(database);
            await dailyBalanceService.calculateAllAccountBalances();
            console.log('Daily balance calculation completed');
          } catch (error) {
            console.error('Failed to calculate daily balances after sync:', error);
          }
        });
      }
    },
  };
}

export async function databaseSynchronize(syncApi: Sync, logger: SyncLogger) {
  // Wrap sync in try-catch to handle "Cannot update a record with pending changes" errors
  // This can happen if a record is being edited elsewhere while sync is running
  try {
    await synchronize(createSyncConfig(syncApi, logger));
  } catch (error: any) {
    // Handle "Cannot update a record with pending changes" error
    // This can happen if a record is being edited while sync is running
    const isPendingChangesError =
      error?.message?.includes('Cannot update a record with pending changes') || error?.name === 'Diagnostic error';

    if (isPendingChangesError) {
      console.warn('Sync failed due to pending changes, retrying after marking changes as synced...');

      // Wait a moment for any active write transactions to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to mark all local changes as synced again
      try {
        const localChanges = await fetchLocalChanges(database);
        if (localChanges.changes && Object.keys(localChanges.changes).length > 0) {
          await markLocalChangesAsSynced(database, localChanges);
        }
      } catch (markError) {
        console.error('Error marking local changes as synced on retry:', markError);
      }

      // Retry sync once
      console.log('Retrying sync after marking changes as synced');
      await synchronize(createSyncConfig(syncApi, logger));
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}
