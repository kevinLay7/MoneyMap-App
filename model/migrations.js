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
  ],
});
