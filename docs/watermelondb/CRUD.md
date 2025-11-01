# CRUD Operations

WatermelonDB provides simple APIs for Create, Read, Update, and Delete operations.

## Create

Use `create()` to add new records:

```javascript
await database.write(async () => {
  const post = await database.get('posts').create(post => {
    post.title = 'New Post'
    post.body = 'This is the body of the new post.'
    post.isPinned = false
    post.createdAt = Date.now()
  })
})
```

All write operations must be inside a `database.write()` block.

### Creating Related Records

```javascript
await database.write(async () => {
  const post = await database.get('posts').create(post => {
    post.title = 'New Post'
    post.body = 'Content'
  })

  // Create a comment for this post
  const comment = await database.get('comments').create(comment => {
    comment.postId = post.id
    comment.body = 'Great post!'
    comment.author = 'John'
  })
})
```

### Batch Creation

```javascript
await database.write(async () => {
  const posts = await database.batch(
    database.get('posts').prepareCreate(post => {
      post.title = 'Post 1'
      post.body = 'Body 1'
    }),
    database.get('posts').prepareCreate(post => {
      post.title = 'Post 2'
      post.body = 'Body 2'
    }),
  )
})
```

## Read

### Fetch All Records

```javascript
const posts = await database.get('posts').query().fetch()
```

### Find by ID

```javascript
const post = await database.get('posts').find(postId)
```

### Query with Conditions

```javascript
import { Q } from '@nozbe/watermelondb'

const pinnedPosts = await database
  .get('posts')
  .query(Q.where('is_pinned', true))
  .fetch()
```

See [Query documentation](Query.md) for more query examples.

### Observe (Reactive)

Use `observe()` for reactive queries that update when data changes:

```javascript
const postsCollection = database.get('posts')
const postsObservable = postsCollection.query().observe()

// In React component with RxJS
postsObservable.subscribe(posts => {
  setPosts(posts)
})
```

Or use `withObservables` for React components (see [Components documentation](Components.md)).

## Update

Use `update()` to modify existing records:

```javascript
await database.write(async () => {
  await post.update(post => {
    post.title = 'Updated Title'
    post.body = 'Updated body'
  })
})
```

You can also fetch and update in one operation:

```javascript
await database.write(async () => {
  const post = await database.get('posts').find(postId)
  await post.update(post => {
    post.title = 'New Title'
  })
})
```

### Update Related Records

```javascript
await database.write(async () => {
  const post = await database.get('posts').find(postId)
  
  // Update the post
  await post.update(post => {
    post.title = 'Updated'
  })

  // Update all comments for this post
  const comments = await post.comments.fetch()
  for (const comment of comments) {
    await comment.update(comment => {
      comment.isUpdated = true
    })
  }
})
```

### Batch Updates

```javascript
await database.write(async () => {
  const posts = await database.get('posts').query().fetch()
  
  await database.batch(
    ...posts.map(post =>
      post.prepareUpdate(p => {
        p.isRead = true
      })
    )
  )
})
```

## Delete

WatermelonDB supports two types of deletion:

### Soft Delete (Mark as Deleted)

Soft deletes mark records as deleted but keep them in the database:

```javascript
await database.write(async () => {
  await post.markAsDeleted()
})
```

Soft-deleted records:
- Are excluded from queries by default
- Can be restored
- Are useful for sync (know what was deleted)

### Permanent Delete

Permanently removes the record from the database:

```javascript
await database.write(async () => {
  await post.destroyPermanently()
})
```

**Warning:** Permanently deleted records cannot be recovered!

### Batch Deletion

```javascript
await database.write(async () => {
  const oldPosts = await database
    .get('posts')
    .query(Q.where('created_at', Q.lt(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .fetch()

  await database.batch(
    ...oldPosts.map(post => post.prepareDestroyPermanently())
  )
})
```

## Transactions

All write operations in a `database.write()` block are atomic:

```javascript
await database.write(async () => {
  const post = await database.get('posts').create(post => {
    post.title = 'New Post'
  })

  const comment = await database.get('comments').create(comment => {
    comment.postId = post.id
    comment.body = 'Comment'
  })

  // If any operation fails, the entire transaction is rolled back
})
```

## Complete Example

```javascript
import { Q } from '@nozbe/watermelondb'

// Create
async function createPost(title, body) {
  return await database.write(async () => {
    return await database.get('posts').create(post => {
      post.title = title
      post.body = body
      post.createdAt = Date.now()
    })
  })
}

// Read
async function getPosts() {
  return await database.get('posts').query().fetch()
}

async function getPost(id) {
  return await database.get('posts').find(id)
}

async function getPinnedPosts() {
  return await database
    .get('posts')
    .query(Q.where('is_pinned', true))
    .fetch()
}

// Update
async function updatePost(post, updates) {
  await database.write(async () => {
    await post.update(p => {
      Object.assign(p, updates)
    })
  })
}

// Delete
async function deletePost(post) {
  await database.write(async () => {
    await post.markAsDeleted() // or destroyPermanently()
  })
}

// Complex operation
async function repost(post) {
  await database.write(async () => {
    // Update original
    await post.update(p => {
      p.repostCount = (p.repostCount || 0) + 1
    })

    // Create new post
    await database.get('posts').create(newPost => {
      newPost.title = `Repost: ${post.title}`
      newPost.body = post.body
      newPost.originalPostId = post.id
      newPost.createdAt = Date.now()
    })
  })
}
```

## Best Practices

1. **Always use `database.write()` for writes** - All create, update, and delete operations must be in a write block
2. **Batch operations when possible** - Use `database.batch()` for multiple operations
3. **Use soft deletes for sync** - `markAsDeleted()` preserves data for synchronization
4. **Handle errors** - Wrap operations in try/catch blocks
5. **Use transactions** - All operations in a `write()` block are atomic

## Next Steps

- Learn about [Query API](Query.md) for complex queries
- See how to [connect to React components](Components.md)
- Check out [Migrations](Advanced/Migrations.md) for schema changes

