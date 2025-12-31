import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'budgets',
          columns: [
            { name: 'start_date', type: 'number' },
            { name: 'end_date', type: 'number' },
            { name: 'balance', type: 'number' },
            { name: 'total_remaining', type: 'number' },
            { name: 'total_spent', type: 'number' },
            { name: 'balance_source', type: 'string' },
            { name: 'account_balance_source', type: 'string' },
            { name: 'account_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'budget_items',
          columns: [
            { name: 'budget_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'budgets',
          columns: [{ name: 'duration', type: 'string' }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'budget_items',
          columns: [
            { name: 'funding_account_id', type: 'string', isOptional: true },
            { name: 'amount', type: 'number' },
            { name: 'type', type: 'string' },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'budgets',
          columns: [{ name: 'status', type: 'string' }],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        createTable({
          name: 'account_daily_balances',
          columns: [
            { name: 'account_id', type: 'string', isIndexed: true },
            { name: 'item_id', type: 'string', isIndexed: true },

            { name: 'balance', type: 'number' },
            { name: 'date', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'items',
          columns: [{ name: 'last_local_refresh', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        createTable({
          name: 'merchants',
          columns: [
            { name: 'entity_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'logo_url', type: 'string', isOptional: true },
            { name: 'website', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        addColumns({
          table: 'transactions',
          columns: [{ name: 'merchant_id', type: 'string', isOptional: true, isIndexed: true }],
        }),
        addColumns({
          table: 'budget_items',
          columns: [
            { name: 'merchant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'status', type: 'string' },
          ],
        }),
      ],
    },
    {
      toVersion: 11,
      steps: [
        addColumns({
          table: 'budget_items',
          columns: [
            { name: 'tracking_mode', type: 'string', isOptional: true },
            { name: 'category_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
      ],
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: 'budget_items',
          columns: [
            { name: 'due_date', type: 'number', isOptional: true },
            { name: 'is_auto_pay', type: 'boolean', isOptional: true },
            { name: 'exclude_from_balance', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
