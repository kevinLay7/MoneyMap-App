# Components

WatermelonDB provides React integration to make your components reactive to database changes.

## withObservables

`withObservables` is a higher-order component (HOC) that connects your components to the database:

```javascript
import { withObservables } from '@nozbe/watermelondb/react'

const Post = ({ post }) => (
  <View>
    <Text>{post.title}</Text>
    <Text>{post.body}</Text>
  </View>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
}))

const EnhancedPost = enhance(Post)
```

Now whenever `post` changes in the database, `EnhancedPost` will automatically re-render!

## Basic Usage

### Observing a Single Record

```javascript
import React from 'react'
import { View, Text } from 'react-native'
import { withObservables } from '@nozbe/watermelondb/react'

const Comment = ({ comment }) => (
  <View>
    <Text>{comment.body}</Text>
    <Text>— by {comment.author}</Text>
  </View>
)

const enhance = withObservables(['comment'], ({ comment }) => ({
  comment,
}))

export default enhance(Comment)
```

### Observing Collections

```javascript
const PostList = ({ posts }) => (
  <FlatList
    data={posts}
    renderItem={({ item }) => <Post post={item} />}
    keyExtractor={item => item.id}
  />
)

const enhance = withObservables([], () => ({
  posts: database.get('posts').query().observe(),
}))

export default enhance(PostList)
```

### Observing Related Records

```javascript
const Post = ({ post, comments }) => (
  <View>
    <Text>{post.title}</Text>
    <Text>Comments ({comments.length})</Text>
    {comments.map(comment => (
      <Comment key={comment.id} comment={comment} />
    ))}
  </View>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  comments: post.comments.observe(),
}))

export default enhance(Post)
```

## Passing Props

You can pass both observable and non-observable props:

```javascript
const Post = ({ post, onPress, isSelected }) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
      {post.title}
    </Text>
  </TouchableOpacity>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
}))

// Use it
<EnhancedPost post={post} onPress={() => {}} isSelected={true} />
```

## Using Hooks (Alternative)

If you prefer hooks, you can use the raw observables:

```javascript
import React, { useState, useEffect } from 'react'
import { Observable } from '@nozbe/watermelondb/utils/rx'

function useObservable<T>(observable: Observable<T>): T | null {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    const subscription = observable.subscribe(setValue)
    return () => subscription.unsubscribe()
  }, [observable])

  return value
}

function PostList() {
  const posts = useObservable(
    database.get('posts').query().observe()
  )

  if (!posts) return <Text>Loading...</Text>

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <Post post={item} />}
      keyExtractor={item => item.id}
    />
  )
}
```

However, `withObservables` is recommended as it handles subscriptions and cleanup automatically.

## Complex Examples

### Nested Relationships

```javascript
const Post = ({ post, author, comments }) => (
  <View>
    <Text>{post.title}</Text>
    <Text>By {author.name}</Text>
    <Text>Comments:</Text>
    {comments.map(comment => (
      <View key={comment.id}>
        <Text>{comment.body}</Text>
        <Text>— {comment.author}</Text>
      </View>
    ))}
  </View>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  author: post.author.observe(),
  comments: post.comments.observe(),
}))

export default enhance(Post)
```

### Queries with Conditions

```javascript
const PinnedPosts = ({ pinnedPosts }) => (
  <FlatList
    data={pinnedPosts}
    renderItem={({ item }) => <Post post={item} />}
    keyExtractor={item => item.id}
  />
)

const enhance = withObservables([], () => ({
  pinnedPosts: database
    .get('posts')
    .query(Q.where('is_pinned', true))
    .observe(),
}))

export default enhance(PinnedPosts)
```

### Dynamic Queries

```javascript
const PostList = ({ userId, posts }) => (
  <FlatList
    data={posts}
    renderItem={({ item }) => <Post post={item} />}
    keyExtractor={item => item.id}
  />
)

const enhance = withObservables(['userId'], ({ userId }) => ({
  posts: database
    .get('posts')
    .query(Q.where('author_id', userId))
    .observe(),
}))

// Usage
<EnhancedPostList userId={currentUserId} />
```

### Combining Multiple Queries

```javascript
const Dashboard = ({ recentPosts, pinnedPosts, commentCount }) => (
  <View>
    <Text>Recent Posts: {recentPosts.length}</Text>
    <Text>Pinned Posts: {pinnedPosts.length}</Text>
    <Text>Total Comments: {commentCount}</Text>
  </View>
)

const enhance = withObservables([], () => ({
  recentPosts: database
    .get('posts')
    .query(
      Q.sortBy('created_at', Q.desc),
      Q.take(5)
    )
    .observe(),
  pinnedPosts: database
    .get('posts')
    .query(Q.where('is_pinned', true))
    .observe(),
  commentCount: database
    .get('comments')
    .query()
    .observe()
    .pipe(
      map(comments => comments.length)
    ),
}))

export default enhance(Dashboard)
```

## Performance Considerations

### Optimizing Re-renders

By default, components re-render whenever any observed data changes. To optimize:

1. **Use memoization** for expensive computations:

```javascript
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

2. **Split components** to minimize re-render scope:

```javascript
// Instead of one large component, split into smaller ones
const Post = ({ post }) => <PostHeader post={post} />
const PostHeader = ({ post }) => <Text>{post.title}</Text>

const enhancePost = withObservables(['post'], ({ post }) => ({ post }))
const enhanceHeader = withObservables(['post'], ({ post }) => ({ post }))

export const EnhancedPost = enhancePost(Post)
export const EnhancedPostHeader = enhanceHeader(PostHeader)
```

### Avoiding Unnecessary Queries

Only observe what you need:

```javascript
// ❌ Bad: Observing all posts when you only need recent ones
const posts = database.get('posts').query().observe()

// ✅ Good: Only observe what you need
const recentPosts = database
  .get('posts')
  .query(
    Q.sortBy('created_at', Q.desc),
    Q.take(10)
  )
  .observe()
```

## TypeScript Support

WatermelonDB has full TypeScript support:

```typescript
import { withObservables } from '@nozbe/watermelondb/react'
import { Post } from '../model/Post'

interface Props {
  postId: string
  post?: Post
}

const PostComponent: React.FC<Props> = ({ post }) => {
  if (!post) return null
  return <Text>{post.title}</Text>
}

const enhance = withObservables<Props, { post: Post }>(
  ['postId'],
  ({ postId }) => ({
    post: database.get<Post>('posts').findAndObserve(postId),
  })
)

export default enhance(PostComponent)
```

## Complete Example

```javascript
import React from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { withObservables } from '@nozbe/watermelondb/react'
import { Q } from '@nozbe/watermelondb'
import { database } from '../database'
import Post from './Post'

const PostList = ({ recentPosts, pinnedPosts, onPostPress }) => (
  <View>
    <Text>Pinned</Text>
    <FlatList
      data={pinnedPosts}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onPostPress(item)}>
          <Post post={item} />
        </TouchableOpacity>
      )}
      keyExtractor={item => item.id}
    />
    <Text>Recent</Text>
    <FlatList
      data={recentPosts}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onPostPress(item)}>
          <Post post={item} />
        </TouchableOpacity>
      )}
      keyExtractor={item => item.id}
    />
  </View>
)

const enhance = withObservables([], () => ({
  recentPosts: database
    .get('posts')
    .query(
      Q.sortBy('created_at', Q.desc),
      Q.take(10)
    )
    .observe(),
  pinnedPosts: database
    .get('posts')
    .query(Q.where('is_pinned', true))
    .observe(),
}))

export default enhance(PostList)
```

## Next Steps

- Learn about [CRUD operations](CRUD.md)
- See [Query documentation](Query.md)
- Check out [Advanced topics](Advanced/README.md)

