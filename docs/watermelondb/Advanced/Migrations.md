# Migrations

Migrations allow you to change your database schema without losing user data.

## Why Migrations?

When you change your schema (add/remove tables or columns), you must:

1. **Increment the schema version**
2. **Write a migration** to transform existing data

Without migrations, users upgrading your app will lose their data!

## Basic Migration

```javascript
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'
import { schema } from '../schema'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'posts',
          columns: [
            { name: 'is_pinned', type: 'boolean' },
          ],
        }),
      ],
    },
  ],
})
```

## Migration Steps

### Adding Columns

```javascript
import { addColumns } from '@nozbe/watermelondb/Schema/migrations'

{
  toVersion: 2,
  steps: [
    addColumns({
      table: 'posts',
      columns: [
        { name: 'is_pinned', type: 'boolean' },
        { name: 'view_count', type: 'number' },
      ],
    }),
  ],
}
```

### Removing Columns

```javascript
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

// Note: Removing columns is not directly supported
// Instead, mark them as unused in your models
{
  toVersion: 3,
  steps: [
    // Columns are not physically removed, just not used
  ],
}
```

### Creating Tables

```javascript
import { createTable } from '@nozbe/watermelondb/Schema/migrations'

{
  toVersion: 2,
  steps: [
    createTable({
      name: 'comments',
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'body', type: 'string' },
        { name: 'author', type: 'string' },
      ],
    }),
  ],
}
```

### Multiple Steps

```javascript
{
  toVersion: 3,
  steps: [
    addColumns({
      table: 'posts',
      columns: [
        { name: 'is_pinned', type: 'boolean' },
      ],
    }),
    createTable({
      name: 'tags',
      columns: [
        { name: 'name', type: 'string' },
      ],
    }),
    createTable({
      name: 'post_tags',
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'tag_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
}
```

## Using Migrations

### 1. Update Your Schema

```javascript
// schema.js
export const schema = appSchema({
  version: 3, // Increment version!
  tables: [
    // ... your tables
  ],
})
```

### 2. Create Migration File

```javascript
// migrations.js
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'posts',
          columns: [{ name: 'is_pinned', type: 'boolean' }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'posts',
          columns: [{ name: 'view_count', type: 'number' }],
        }),
      ],
    },
  ],
})
```

### 3. Connect to Database

```javascript
// database.js
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import migrations from './migrations'
import Post from './model/Post'
import Comment from './model/Comment'

const adapter = new SQLiteAdapter({
  schema,
  migrations, // Pass migrations here
  // (You might need additional config depending on your app)
})

export const database = new Database({
  adapter,
  modelClasses: [
    Post,
    Comment,
  ],
})
```

## Migration Best Practices

1. **Always increment schema version** when changing schema
2. **Write migrations immediately** when changing schema
3. **Test migrations** on sample data before releasing
4. **Never skip versions** - migrations must be sequential
5. **Handle data transformation** when needed

## Data Transformation

Sometimes you need to transform existing data during migration:

```javascript
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

// Note: Data transformation in migrations is limited
// Consider doing it in your app code on first launch after migration
{
  toVersion: 2,
  steps: [
    addColumns({
      table: 'posts',
      columns: [
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
}

// Then in your app code, set defaults:
async function migrateData() {
  const posts = await database.get('posts').query().fetch()
  for (const post of posts) {
    if (!post.createdAt) {
      await post.update(p => {
        p.createdAt = Date.now()
      })
    }
  }
}
```

## Available Migration Steps

- `addColumns({ table, columns })` - Add columns to existing table
- `createTable({ name, columns })` - Create new table
- Custom steps can be written for complex migrations

## Example: Complete Migration

```javascript
import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    // Version 1 -> 2: Add is_pinned to posts
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'posts',
          columns: [
            { name: 'is_pinned', type: 'boolean' },
          ],
        }),
      ],
    },
    // Version 2 -> 3: Add comments table
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'comments',
          columns: [
            { name: 'post_id', type: 'string', isIndexed: true },
            { name: 'body', type: 'string' },
            { name: 'author', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    // Version 3 -> 4: Add view_count to posts
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'posts',
          columns: [
            { name: 'view_count', type: 'number' },
          ],
        }),
      ],
    },
  ],
})
```

## Troubleshooting

### Migration not running

- Check that schema version is incremented
- Verify migrations are passed to adapter
- Check that migration steps are correct

### Data loss after migration

- Always test migrations on sample data
- Back up data before complex migrations
- Consider gradual migrations for large changes

## Next Steps

- Learn about [LocalStorage](LocalStorage.md)
- See [Performance tips](Performance.md)
- Check out [Debugging](Debugging.md)

