import {
  schemaMigrations,
  createTable,
} from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        // Add categories table
        createTable({
          name: "categories",
          columns: [
            { name: "name", type: "string" },
            { name: "primary", type: "string" },
            { name: "detailed", type: "string" },
            { name: "description", type: "string" },
            { name: "icon", type: "string", isOptional: true },
            { name: "color", type: "string", isOptional: true },
            { name: "ignored", type: "boolean" },
            { name: "children", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        // Create accounts table
        createTable({
          name: "accounts",
          columns: [
            { name: "account_id", type: "string", isIndexed: true },
            { name: "name", type: "string" },
            { name: "official_name", type: "string", isOptional: true },
            { name: "type", type: "string" },
            { name: "subtype", type: "string" },
            { name: "mask", type: "string", isOptional: true },
            { name: "balance_current", type: "number" },
            { name: "balance_available", type: "number", isOptional: true },
            { name: "iso_currency_code", type: "string", isOptional: true },
            {
              name: "unofficial_currency_code",
              type: "string",
              isOptional: true,
            },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Create transactions table
        createTable({
          name: "transactions",
          columns: [
            { name: "transaction_id", type: "string", isIndexed: true },
            { name: "account_id", type: "string", isIndexed: true },
            { name: "amount", type: "number" },
            { name: "iso_currency_code", type: "string", isOptional: true },
            {
              name: "unofficial_currency_code",
              type: "string",
              isOptional: true,
            },
            { name: "category", type: "string", isOptional: true },
            { name: "category_id", type: "string", isOptional: true },
            { name: "check_number", type: "string", isOptional: true },
            { name: "date", type: "string" },
            { name: "authorized_date", type: "string", isOptional: true },
            { name: "authorized_datetime", type: "string", isOptional: true },
            { name: "datetime", type: "string", isOptional: true },
            { name: "payment_channel", type: "string" },
            {
              name: "personal_finance_category_primary",
              type: "string",
              isOptional: true,
            },
            {
              name: "personal_finance_category_detailed",
              type: "string",
              isOptional: true,
            },
            {
              name: "personal_finance_category_confidence_level",
              type: "string",
              isOptional: true,
            },
            {
              name: "personal_finance_category_icon_url",
              type: "string",
              isOptional: true,
            },
            { name: "name", type: "string" },
            { name: "merchant_name", type: "string", isOptional: true },
            { name: "merchant_entity_id", type: "string", isOptional: true },
            { name: "logo_url", type: "string", isOptional: true },
            { name: "website", type: "string", isOptional: true },
            { name: "pending", type: "boolean" },
            { name: "transaction_code", type: "string", isOptional: true },
            { name: "counterparties", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Create items table
        createTable({
          name: "items",
          columns: [
            { name: "account_id", type: "string", isIndexed: true },
            { name: "plaid_item_id", type: "string", isIndexed: true },
            { name: "institution_id", type: "string" },
            { name: "institution_name", type: "string" },
            { name: "status", type: "string" },
            {
              name: "last_successful_update",
              type: "string",
              isOptional: true,
            },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "is_active", type: "boolean" },
          ],
        }),
        // Create syncs table
        createTable({
          name: "syncs",
          columns: [
            { name: "account_id", type: "string", isIndexed: true },
            { name: "user_id", type: "string", isIndexed: true },
            { name: "plaid_item_id", type: "string", isIndexed: true },
            { name: "action", type: "string" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        // Create transaction_syncs table
        createTable({
          name: "transaction_syncs",
          columns: [
            { name: "plaid_item_id", type: "string", isIndexed: true },
            { name: "transactions_update_status", type: "string" },
            { name: "next_cursor", type: "string" },
            { name: "has_more", type: "boolean" },
            { name: "request_id", type: "string" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
  ],
});
