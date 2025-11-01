# Performance

WatermelonDB is designed for performance, but following best practices ensures optimal performance.

## Query Performance

### Use Indexes

Always index columns you frequently query on:

```javascript
// ✅ Good - Indexed
tableSchema({
  name: 'posts',
  columns: [
    { name: 'author_id', type: 'string', isIndexed: true },
    { name: 'is_pinned', type: 'boolean', isIndexed: true },
  ],
})

// ❌ Bad - Not indexed
tableSchema({
  name: 'posts',
  columns: [
    { name: 'author_id', type: 'string' }, // Not indexed!
  ],
})
```

### Limit Results

Always use `take()` when you don't need all records:

```javascript
// ✅ Good - Only fetch what you need
const topPosts = await database
  .get('posts')
  .query(
    Q.sortBy('view_count', Q.desc),
    Q.take(10)
  )
  .fetch()

// ❌ Bad - Fetching everything
const allPosts = await database.get('posts').query().fetch()
```

### Use fetchCount() Instead of fetch().length

```javascript
// ✅ Good - Efficient counting
const count = await database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .fetchCount()

// ❌ Bad - Inefficient
const posts = await database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .fetch()
const count = posts.length
```

### Avoid N+1 Queries

```javascript
// ❌ Bad - N+1 query problem
const posts = await database.get('posts').query().fetch()
for (const post of posts) {
  const author = await post.author.fetch() // Query for each post!
}

// ✅ Good - Batch queries
const posts = await database.get('posts').query().fetch()
const authorIds = [...new Set(posts.map(p => p.authorId))]
const authors = await database
  .get('users')
  .query(Q.where('id', Q.oneOf(authorIds)))
  .fetch()
```

## Component Performance

### Optimize Re-renders

Split large components to minimize re-render scope:

```javascript
// ❌ Bad - Large component re-renders on any change
const Post = ({ post, comments, author }) => (
  <View>
    <PostHeader post={post} author={author} />
    <PostBody post={post} />
    <CommentList comments={comments} />
  </View>
)

// ✅ Good - Smaller components re-render independently
const Post = ({ post }) => <PostHeader post={post} />
const PostHeader = ({ post }) => <Text>{post.title}</Text>
const PostBody = ({ post }) => <Text>{post.body}</Text>
const CommentList = ({ comments }) => (
  <FlatList data={comments} renderItem={...} />
)
```

### Use Memoization

Memoize expensive computations:

```javascript
import { useMemo } from 'react'

const Post = ({ post, comments }) => {
  const sortedComments = useMemo(
    () => comments.sort((a, b) => b.createdAt - a.createdAt),
    [comments]
  )

  return (
    <View>
      {sortedComments.map(comment => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </View>
  )
}
```

### Avoid Unnecessary Observations

Only observe what you need:

```javascript
// ❌ Bad - Observing everything
const posts = database.get('posts').query().observe()

// ✅ Good - Only observe what you need
const recentPosts = database
  .get('posts')
  .query(
    Q.sortBy('created_at', Q.desc),
    Q.take(10)
  )
  .observe()
```

## Write Performance

### Batch Operations

Use `database.batch()` for multiple operations:

```javascript
// ❌ Bad - Multiple write operations
await database.write(async () => {
  for (const post of posts) {
    await post.update(p => {
      p.isRead = true
    })
  }
})

// ✅ Good - Batch operations
await database.write(async () => {
  await database.batch(
    ...posts.map(post =>
      post.prepareUpdate(p => {
        p.isRead = true
      })
    )
  )
})
```

### Minimize Write Blocks

Keep write blocks small:

```javascript
// ❌ Bad - Long write block
await database.write(async () => {
  const post = await database.get('posts').create(...)
  // ... lots of operations ...
  const comment = await database.get('comments').create(...)
  // ... more operations ...
})

// ✅ Good - Smaller write blocks
await database.write(async () => {
  const post = await database.get('posts').create(...)
})

await database.write(async () => {
  const comment = await database.get('comments').create(...)
})
```

## Memory Performance

### Lazy Loading

WatermelonDB is lazy by default, but be mindful:

```javascript
// ✅ Good - Only load what you need
const post = await database.get('posts').find(postId)
const comments = await post.comments
  .query(Q.take(10))
  .fetch()

// ❌ Bad - Loading everything
const post = await database.get('posts').find(postId)
const allComments = await post.comments.fetch() // Loading all comments!
```

### Clean Up Observables

Unsubscribe from observables when components unmount:

```javascript
// withObservables handles this automatically, but if using raw observables:
useEffect(() => {
  const subscription = postsObservable.subscribe(setPosts)
  return () => subscription.unsubscribe()
}, [])
```

## Sync Performance

### Limit Sync Frequency

Don't sync too often:

```javascript
// ✅ Good - Sync every 5 minutes
const SYNC_INTERVAL = 5 * 60 * 1000

// ❌ Bad - Syncing every second
const SYNC_INTERVAL = 1000
```

### Incremental Sync

Only sync changed records:

```javascript
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    // Only fetch records changed since lastPulledAt
    const response = await fetch(`/api/sync?since=${lastPulledAt}`)
    const { changes, timestamp } = await response.json()
    return { changes, timestamp }
  },
})
```

### Filter Sync

Sync only what you need:

```javascript
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    // Only sync posts for current user
    const userId = await database.localStorage.get('user_id')
    const response = await fetch(`/api/sync?user=${userId}&since=${lastPulledAt}`)
    const { changes, timestamp } = await response.json()
    return { changes, timestamp }
  },
})
```

## Database Size

### Regular Cleanup

Delete old/unused records:

```javascript
// Delete posts older than 30 days
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
const oldPosts = await database
  .get('posts')
  .query(Q.where('created_at', Q.lt(thirtyDaysAgo)))
  .fetch()

await database.write(async () => {
  await database.batch(
    ...oldPosts.map(post => post.prepareDestroyPermanently())
  )
})
```

### Archive Old Data

Instead of deleting, archive old data:

```javascript
// Move old posts to archive table
await database.write(async () => {
  for (const post of oldPosts) {
    await database.get('archived_posts').create(archived => {
      archived.title = post.title
      archived.body = post.body
      // ...
    })
    await post.destroyPermanently()
  }
})
```

## Profiling

### Measure Query Performance

```javascript
const start = Date.now()
const posts = await database.get('posts').query().fetch()
const duration = Date.now() - start
console.log(`Query took ${duration}ms`)
```

### Monitor Component Re-renders

```javascript
const Post = ({ post }) => {
  console.log('Post component rendered', post.id)
  return <Text>{post.title}</Text>
}
```

## Best Practices Summary

1. **Index frequently queried columns**
2. **Limit query results with `take()`**
3. **Use `fetchCount()` instead of `fetch().length`**
4. **Avoid N+1 queries**
5. **Batch write operations**
6. **Split large components**
7. **Memoize expensive computations**
8. **Only observe what you need**
9. **Limit sync frequency**
10. **Clean up old data regularly**

## Performance Checklist

- [ ] All frequently queried columns are indexed
- [ ] Queries use `take()` when appropriate
- [ ] Components are split appropriately
- [ ] Expensive computations are memoized
- [ ] Write operations are batched
- [ ] Observables are cleaned up
- [ ] Sync frequency is reasonable
- [ ] Old data is cleaned up regularly

## Next Steps

- See [Debugging guide](Debugging.md)
- Check out [Sync documentation](../Sync/README.md)
- Review [Query documentation](../Query.md)

