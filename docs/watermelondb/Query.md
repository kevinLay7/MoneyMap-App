# Query

WatermelonDB's Query API lets you find records that match specific conditions.

## Basic Queries

```javascript
import { Q } from '@nozbe/watermelondb'

// Fetch all records
const allPosts = await database.get('posts').query().fetch()

// Find by ID
const post = await database.get('posts').find(postId)

// Simple where clause
const pinnedPosts = await database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .fetch()
```

## Where Clauses

### Equality

```javascript
Q.where('is_pinned', true)
Q.where('author', 'John')
Q.where('created_at', 1234567890)
```

### Comparison Operators

```javascript
Q.where('created_at', Q.gt(Date.now() - 7 * 24 * 60 * 60 * 1000))  // Greater than
Q.where('created_at', Q.gte(1234567890))                             // Greater than or equal
Q.where('created_at', Q.lt(Date.now()))                               // Less than
Q.where('created_at', Q.lte(1234567890))                             // Less than or equal
Q.where('title', Q.notEq('Old Title'))                               // Not equal
```

### Like (String Matching)

```javascript
Q.where('title', Q.like('%watermelon%'))   // Contains
Q.where('title', Q.like('Watermelon%'))    // Starts with
Q.where('title', Q.like('%database'))       // Ends with
```

### In / Not In

```javascript
Q.where('author', Q.oneOf(['John', 'Jane', 'Bob']))
Q.where('id', Q.notIn(['id1', 'id2', 'id3']))
```

### Between

```javascript
Q.where('created_at', Q.between(1234567890, 9876543210))
```

### Null / Not Null

```javascript
Q.where('deleted_at', Q.notNull)
Q.where('deleted_at', Q.isNull)
```

## Combining Conditions

### AND

```javascript
const recentPinnedPosts = await database
  .get('posts')
  .query(
    Q.where('is_pinned', true),
    Q.where('created_at', Q.gt(Date.now() - 7 * 24 * 60 * 60 * 1000))
  )
  .fetch()
```

### OR

```javascript
const popularOrPinnedPosts = await database
  .get('posts')
  .query(
    Q.or(
      Q.where('is_pinned', true),
      Q.where('view_count', Q.gt(1000))
    )
  )
  .fetch()
```

### Complex Combinations

```javascript
const posts = await database
  .get('posts')
  .query(
    Q.or(
      Q.where('is_pinned', true),
      Q.and(
        Q.where('view_count', Q.gt(100)),
        Q.where('created_at', Q.gt(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    )
  )
  .fetch()
```

## Sorting

```javascript
// Sort ascending
const posts = await database
  .get('posts')
  .query(
    Q.sortBy('created_at'),
    Q.take(10)
  )
  .fetch()

// Sort descending
const recentPosts = await database
  .get('posts')
  .query(
    Q.sortBy('created_at', Q.desc),
    Q.take(10)
  )
  .fetch()

// Multiple sorts
const sortedPosts = await database
  .get('posts')
  .query(
    Q.sortBy('is_pinned', Q.desc),  // Pinned posts first
    Q.sortBy('created_at', Q.desc)  // Then by date
  )
  .fetch()
```

## Limiting Results

```javascript
// Take first N records
const topPosts = await database
  .get('posts')
  .query(
    Q.sortBy('view_count', Q.desc),
    Q.take(10)
  )
  .fetch()

// Skip N records (pagination)
const page2Posts = await database
  .get('posts')
  .query(
    Q.sortBy('created_at', Q.desc),
    Q.skip(10),
    Q.take(10)
  )
  .fetch()
```

## Counting

```javascript
const count = await database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .fetchCount()
```

## Observing (Reactive Queries)

Use `observe()` to get an observable that updates when data changes:

```javascript
import { Observable } from '@nozbe/watermelondb/utils/rx'

const postsObservable: Observable<Post[]> = database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .observe()

// Subscribe with RxJS
postsObservable.subscribe(posts => {
  console.log('Pinned posts:', posts)
})
```

For React components, use `withObservables` (see [Components documentation](Components.md)).

## Querying Relations

### Query Children

```javascript
const post = await database.get('posts').find(postId)

// Get all comments for this post
const comments = await post.comments.query().fetch()

// Get verified comments
const verifiedComments = await post.comments
  .query(Q.where('is_verified', true))
  .fetch()
```

### Query Through Relations

```javascript
// Find posts by a specific author
const author = await database.get('users').find(authorId)
const authorPosts = await author.posts.query().fetch()

// Find comments on pinned posts
const pinnedPostIds = await database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .fetchAll()

const comments = await database
  .get('comments')
  .query(Q.where('post_id', Q.oneOf(pinnedPostIds.map(p => p.id))))
  .fetch()
```

## Advanced Queries

### Excluding Soft-Deleted Records

By default, soft-deleted records are excluded. To include them:

```javascript
const allIncludingDeleted = await database
  .get('posts')
  .query(
    Q.where('is_pinned', true),
    Q.experimentalJoinTables(['posts'])  // Include deleted
  )
  .fetch()
```

### Using Indexes

For better performance, index columns you frequently query on:

```javascript
// In your schema
tableSchema({
  name: 'posts',
  columns: [
    { name: 'author_id', type: 'string', isIndexed: true },
    { name: 'is_pinned', type: 'boolean', isIndexed: true },
    // ...
  ],
})
```

## Complete Examples

```javascript
// Get top 10 most viewed posts from the last week
const topPosts = await database
  .get('posts')
  .query(
    Q.where('created_at', Q.gte(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    Q.sortBy('view_count', Q.desc),
    Q.take(10)
  )
  .fetch()

// Get all comments by a user on pinned posts
const userComments = await database
  .get('comments')
  .query(
    Q.where('author', 'John'),
    Q.where('post_id', Q.oneOf(
      await database
        .get('posts')
        .query(Q.where('is_pinned', true))
        .fetchAll()
        .then(posts => posts.map(p => p.id))
    ))
  )
  .fetch()

// Get posts matching search term
const searchTerm = 'watermelon'
const searchResults = await database
  .get('posts')
  .query(
    Q.or(
      Q.where('title', Q.like(`%${searchTerm}%`)),
      Q.where('body', Q.like(`%${searchTerm}%`))
    ),
    Q.sortBy('created_at', Q.desc)
  )
  .fetch()
```

## Query API Reference

- `Q.where(column, value)` - Equality check
- `Q.where(column, Q.gt(value))` - Greater than
- `Q.where(column, Q.gte(value))` - Greater than or equal
- `Q.where(column, Q.lt(value))` - Less than
- `Q.where(column, Q.lte(value))` - Less than or equal
- `Q.where(column, Q.notEq(value))` - Not equal
- `Q.where(column, Q.like(pattern))` - String matching
- `Q.where(column, Q.oneOf([...]))` - In array
- `Q.where(column, Q.notIn([...]))` - Not in array
- `Q.where(column, Q.between(min, max))` - Between values
- `Q.where(column, Q.isNull)` - Is null
- `Q.where(column, Q.notNull)` - Is not null
- `Q.and(...conditions)` - AND logic
- `Q.or(...conditions)` - OR logic
- `Q.sortBy(column)` - Sort ascending
- `Q.sortBy(column, Q.desc)` - Sort descending
- `Q.take(n)` - Limit results
- `Q.skip(n)` - Skip results

## Performance Tips

1. **Index frequently queried columns** - Add `isIndexed: true` in your schema
2. **Use `fetchCount()` instead of `fetch().length`** - More efficient
3. **Limit results with `take()`** - Don't fetch more than you need
4. **Query on indexed columns** - Indexed columns are much faster
5. **Avoid N+1 queries** - Use batch operations when possible

## Next Steps

- See [Components documentation](Components.md) for reactive queries in React
- Learn about [CRUD operations](CRUD.md)
- Check out [Advanced topics](Advanced/README.md)

