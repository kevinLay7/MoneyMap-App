import { synchronize } from "@nozbe/watermelondb/sync";
import database from "./database";
import { Sync } from "@/api/gen/Sync";

export async function databaseSynchronize(syncApi: Sync) {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // Convert migration columns from WatermelonDB format to API format
      // WatermelonDB migration.columns is an array of {table: string, columns: string[]}
      // API expects Record<string, string[]>
      const columnsRecord: Record<string, string[]> = {};
      if (migration?.columns) {
        if (Array.isArray(migration.columns)) {
          migration.columns.forEach(
            (item: { table: string; columns: string[] }) => {
              columnsRecord[item.table] = item.columns;
            }
          );
        } else if (typeof migration.columns === "object") {
          // Already in Record format
          Object.assign(columnsRecord, migration.columns);
        }
      }

      // API expects lastPulledAt as object (backend type definition quirk)
      // Pass number directly (numbers are objects in JS) or 0 for first sync
      const response = await syncApi.syncControllerPullChanges({
        lastPulledAt: (lastPulledAt || 0) as unknown as object,
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
      const { changes, timestamp } = response.data;
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      console.log("changes", changes);
      console.log("lastPulledAt", lastPulledAt);
      await syncApi.syncControllerPushChanges({
        changes,
        lastPulledAt: String(lastPulledAt || 0),
        migrations: 1, // Current schema version
      });
    },
    migrationsEnabledAtVersion: 1,
  });
}
