import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync';
import database from './database';
import { Sync } from '@/api/gen/Sync';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import dayjs from 'dayjs';

/**
 * Table dependency order for sync operations.
 * Tables must be synced in this order to maintain referential integrity.
 *
 * Dependency hierarchy:
 * 1. items, accounts (circular dependency - must be synced together)
 * 2. transactions (depends on accounts)
 * 3. budgets (depends on accounts)
 * 4. budget_items (depends on budgets)
 * 5. syncs, transaction_syncs (depend on items/accounts)
 *
 * Note: categories are NOT synced - they are loaded locally via CategoryService
 */
const SYNC_TABLE_ORDER = [
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
const EXCLUDED_TABLES = ['categories'] as const;

/**
 * Filters out excluded tables from changes object.
 */
function filterExcludedTables(changes: SyncDatabaseChangeSet): SyncDatabaseChangeSet {
  const filtered: Record<string, any> = {};

  for (const [tableName, tableChanges] of Object.entries(changes)) {
    if (!EXCLUDED_TABLES.includes(tableName as any)) {
      filtered[tableName] = tableChanges;
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
    if (!orderedChanges[tableName] && !EXCLUDED_TABLES.includes(tableName as any)) {
      orderedChanges[tableName] = tableChanges;
    }
  }

  return orderedChanges as SyncDatabaseChangeSet;
}

export async function databaseSynchronize(syncApi: Sync, logger: SyncLogger) {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
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

      // Filter out excluded tables (e.g., categories)
      const filteredChanges = filterExcludedTables(changes);

      // Reorder changes to ensure dependency order is maintained
      // This ensures parent records (items, accounts) are synced before children (transactions, budgets)
      const orderedChanges = reorderChangesByDependencies(filteredChanges);

      return { changes: orderedChanges, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }: { changes: SyncDatabaseChangeSet; lastPulledAt: number }) => {
      // Filter out excluded tables (e.g., categories) before pushing
      const filteredChanges = filterExcludedTables(changes);

      const BATCH_SIZE = 50;

      // Count total items across all tables
      let totalItems = 0;
      for (const tableChanges of Object.values(filteredChanges)) {
        const typedTableChanges = tableChanges as { created?: any[]; updated?: any[]; deleted?: any[] };
        totalItems += typedTableChanges.created?.length || 0;
        totalItems += typedTableChanges.updated?.length || 0;
        totalItems += typedTableChanges.deleted?.length || 0;
      }

      // If total items <= BATCH_SIZE, send as-is
      if (totalItems <= BATCH_SIZE) {
        // Ensure all tables have created, updated, and deleted arrays
        const normalizedChanges: Record<string, any> = {};
        for (const [tableName, tableChanges] of Object.entries(filteredChanges)) {
          const typedTableChanges = tableChanges as { created?: any[]; updated?: any[]; deleted?: any[] };
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
      for (const [tableName, tableChanges] of Object.entries(filteredChanges)) {
        const typedTableChanges = tableChanges as { created?: any[]; updated?: any[]; deleted?: any[] };
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

        console.log('--------------------------------');
        console.log('batchChanges', batchChanges);
        console.log('--------------------------------');

        await syncApi.syncControllerPushChanges({
          changes: batchChanges,
          lastPulledAt: String(lastPulledAt || 0),
          migrations: 1,
        });
      }
    },
    migrationsEnabledAtVersion: 1,
    log: logger.newLog(),
    onWillApplyRemoteChanges: async (info: { remoteChangeCount: number }) => {
      console.log('--------------------------------');
      console.log('onWillApplyRemoteChanges', info.remoteChangeCount);
      console.log('--------------------------------');
      return Promise.resolve();
    },
    onDidPullChanges: async ({ messages }) => {
      if (messages) {
        messages.forEach(message => {
          alert(message);
        });
      }
    },
  });
}
