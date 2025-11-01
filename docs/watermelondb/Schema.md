# Schema

The schema defines the structure of your database: what tables exist and what columns each table has.

## Defining a Schema

```javascript
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'is_pinned', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'comments',
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'body', type: 'string' },
        { name: 'author', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
```

## Column Types

WatermelonDB supports these column types:

- `'string'` - Text data
- `'number'` - Numeric data (integers and floats)
- `'boolean'` - Boolean values (true/false)

## Column Options

### Indexed Columns

For columns you'll frequently query on, add `isIndexed: true`:

```javascript
{ name: 'post_id', type: 'string', isIndexed: true }
{ name: 'email', type: 'string', isIndexed: true }
```

Indexed columns make queries faster, especially for `where` clauses.

### Required Columns

By default, all columns are optional. To make a column required, use a [migration](Advanced/Migrations.md) or handle it in your model validation.

## Schema Versioning

**Always increment the schema version when you make changes!**

```javascript
export const mySchema = appSchema({
  version: 2, // Increment when schema changes
  tables: [
    // ...
  ],
})
```

When you change the schema, you **must**:

1. Increment the version number
2. Write a [migration](Advanced/Migrations.md) to update existing databases

If you change the schema without incrementing the version or writing a migration, you may lose user data!

## Schema Best Practices

1. **Use snake_case for column names** - This is the convention
2. **Index foreign keys** - Always index `_id` columns used for relations
3. **Add timestamps** - `created_at` and `updated_at` are useful for syncing
4. **Plan ahead** - Think about what queries you'll need before defining columns

## Example: Complete Schema

```javascript
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'avatar_url', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'author_id', type: 'string', isIndexed: true },
        { name: 'is_pinned', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'comments',
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'author_id', type: 'string', isIndexed: true },
        { name: 'body', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
```

## Next Steps

- [Create Models](Models.md) that match your schema
- Learn about [Migrations](Advanced/Migrations.md) for schema changes

