import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'transactions',
          columns: [{ name: 'source', type: 'string' }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        // Removed 'category' string field - now using relation via 'category_id'
        // Columns are not physically removed, just not used
      ],
    },
  ],
});
