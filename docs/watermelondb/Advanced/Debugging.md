# Debugging

Tools and techniques for debugging WatermelonDB applications.

## Console Logging

### Basic Logging

```javascript
// Log database operations
console.log('Creating post...')
const post = await database.get('posts').create(post => {
  post.title = 'Test'
})
console.log('Post created:', post.id)

// Log queries
const posts = await database.get('posts').query().fetch()
console.log('Posts:', posts.length)
```

### Debug Mode

Enable debug logging:

```javascript
import { logger } from '@nozbe/watermelondb/utils/common'

// Enable debug logging
logger.isEnabled = true

// Now all database operations will be logged
```

## Database Inspection

### View All Tables

```javascript
const tables = database.adapter.schema.tables.map(t => t.name)
console.log('Tables:', tables)
```

### Count Records

```javascript
const postCount = await database.get('posts').query().fetchCount()
const commentCount = await database.get('comments').query().fetchCount()
console.log(`Posts: ${postCount}, Comments: ${commentCount}`)
```

### Inspect Records

```javascript
const post = await database.get('posts').find(postId)
console.log('Post:', {
  id: post.id,
  title: post.title,
  body: post.body,
  createdAt: post.createdAt,
})

// Inspect raw data
console.log('Raw post:', post._raw)
```

## Query Debugging

### Log Query Execution

```javascript
const query = database.get('posts').query(Q.where('is_pinned', true))
console.log('Query:', query.toString())

const posts = await query.fetch()
console.log('Results:', posts.length)
```

### Measure Query Time

```javascript
const start = Date.now()
const posts = await database.get('posts').query().fetch()
const duration = Date.now() - start
console.log(`Query took ${duration}ms for ${posts.length} posts`)
```

## Component Debugging

### Log Component Re-renders

```javascript
const Post = ({ post }) => {
  console.log('Post component rendered:', post.id)
  return <Text>{post.title}</Text>
}
```

### Debug Observable Subscriptions

```javascript
const postsObservable = database.get('posts').query().observe()

postsObservable.subscribe({
  next: (posts) => {
    console.log('Posts updated:', posts.length)
  },
  error: (error) => {
    console.error('Observable error:', error)
  },
})
```

## Sync Debugging

### Log Sync Operations

```javascript
async function sync() {
  console.log('Starting sync...')
  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        console.log('Pulling changes since:', lastPulledAt)
        // ... sync logic
      },
      pushChanges: async ({ changes }) => {
        console.log('Pushing changes:', Object.keys(changes))
        // ... sync logic
      },
    })
    console.log('Sync completed')
  } catch (error) {
    console.error('Sync failed:', error)
  }
}
```

### Track Sync Status

```javascript
await database.localStorage.set('last_sync_time', Date.now())
await database.localStorage.set('last_sync_status', 'success')

const lastSync = await database.localStorage.get('last_sync_time')
const syncStatus = await database.localStorage.get('last_sync_status')
console.log(`Last sync: ${new Date(lastSync)}, Status: ${syncStatus}`)
```

## Migration Debugging

### Check Current Schema Version

```javascript
const currentVersion = database.adapter.schema.version
console.log('Current schema version:', currentVersion)
```

### Test Migrations

```javascript
// Create test database to test migrations
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import migrations from './migrations'

const testAdapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'test_db',
})

const testDatabase = new Database({
  adapter: testAdapter,
  modelClasses: [Post, Comment],
})

// Test your migrations
await testDatabase.write(async () => {
  // Create test data
  await testDatabase.get('posts').create(post => {
    post.title = 'Test Post'
  })
})

console.log('Migration test completed')
```

## Error Handling

### Catch Database Errors

```javascript
try {
  await database.write(async () => {
    await post.update(post => {
      post.title = 'New Title'
    })
  })
} catch (error) {
  console.error('Database error:', error)
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
  })
}
```

### Handle Query Errors

```javascript
try {
  const posts = await database.get('posts').query().fetch()
} catch (error) {
  console.error('Query error:', error)
}
```

## React Native Debugging

### React Native Debugger

Install React Native Debugger for enhanced debugging:

```bash
brew install react-native-debugger
```

### Flipper Integration

WatermelonDB works with Flipper for database inspection. Install Flipper plugins for WatermelonDB.

## Common Issues

### Records Not Appearing

```javascript
// Check if records are soft-deleted
const allPosts = await database
  .get('posts')
  .query()
  .fetch()

console.log('Total posts:', allPosts.length)

// Check for soft-deleted records
const deletedPosts = await database
  .get('posts')
  .query(Q.where('_status', 'deleted'))
  .fetch()

console.log('Deleted posts:', deletedPosts.length)
```

### Queries Too Slow

```javascript
// Check if columns are indexed
const schema = database.adapter.schema
const postsTable = schema.tables.find(t => t.name === 'posts')
const authorIdColumn = postsTable.columns.find(c => c.name === 'author_id')
console.log('author_id indexed:', authorIdColumn.isIndexed)
```

### Component Not Re-rendering

```javascript
// Check if observable is working
const postsObservable = database.get('posts').query().observe()

postsObservable.subscribe(posts => {
  console.log('Observable emitted:', posts.length)
})

// Make a change
await database.write(async () => {
  await database.get('posts').create(post => {
    post.title = 'New Post'
  })
})

// Should see "Observable emitted: X" in console
```

## Development Tools

### SQLite Browser

For React Native, you can inspect the SQLite database directly:

- **iOS**: Database is in app's Documents directory
- **Android**: Database is in `/data/data/YOUR_PACKAGE/databases/`

Use SQLite browser tools:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Studio](https://sqlitestudio.pl/)

### Network Debugging

For sync debugging, use network inspection tools:

```javascript
// Add logging to fetch calls
const originalFetch = global.fetch
global.fetch = async (...args) => {
  console.log('Fetch:', args[0], args[1])
  const response = await originalFetch(...args)
  console.log('Response:', response.status, response.ok)
  return response
}
```

## Debugging Checklist

- [ ] Enable debug logging
- [ ] Log database operations
- [ ] Measure query performance
- [ ] Check component re-renders
- [ ] Monitor sync operations
- [ ] Verify schema version
- [ ] Inspect database records
- [ ] Test migrations
- [ ] Handle errors properly

## Best Practices

1. **Use console.log strategically** - Don't log everything in production
2. **Measure performance** - Track query times
3. **Monitor re-renders** - Ensure components update correctly
4. **Test migrations** - Test on sample data
5. **Handle errors gracefully** - Don't crash on errors
6. **Use development tools** - SQLite browsers, debuggers
7. **Document issues** - Keep notes on common problems

## Next Steps

- See [Performance guide](Performance.md)
- Check out [Sync documentation](../Sync/README.md)
- Review [Troubleshooting section](../README.md#troubleshooting)

