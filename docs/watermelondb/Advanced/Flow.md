# Flow Support

WatermelonDB has full support for Flow static type checking.

## Installation

```bash
yarn add --dev flow-bin
```

## Setup

### 1. Initialize Flow

```bash
flow init
```

### 2. Configure Flow

Add WatermelonDB to your `.flowconfig`:

```ini
[libs]
node_modules/@nozbe/watermelondb/flow/

[options]
module.name_mapper='^@nozbe/watermelondb/(.*)$' -> '<PROJECT_ROOT>/node_modules/@nozbe/watermelondb/flow/\1'
```

### 3. Add Flow Types

```javascript
// @flow
import { Model } from '@nozbe/watermelondb'
import { field, relation, children } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  static table = 'posts'

  @field('title') title: string
  @field('body') body: string
  @field('is_pinned') isPinned: boolean

  @relation('users', 'author_id') author: User
  @children('comments') comments: Comment[]
}
```

## Type Definitions

### Model Types

```javascript
// @flow
import type { Model } from '@nozbe/watermelondb'

class Post extends Model {
  static table: string = 'posts'
  
  @field('title') title: string
  @field('body') body: string
}
```

### Collection Types

```javascript
// @flow
import type { Collection } from '@nozbe/watermelondb'

const postsCollection: Collection<Post> = database.get('posts')
```

### Query Types

```javascript
// @flow
import type { Query } from '@nozbe/watermelondb'
import { Q } from '@nozbe/watermelondb'

const query: Query<Post> = database
  .get('posts')
  .query(Q.where('is_pinned', true))
```

### Observable Types

```javascript
// @flow
import type { Observable } from '@nozbe/watermelondb/utils/rx'

const postsObservable: Observable<Post[]> = database
  .get('posts')
  .query()
  .observe()
```

## Type Safety Examples

### Typed Models

```javascript
// @flow
import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  static table: string = 'posts'

  @field('title') title: string
  @field('body') body: string
  @field('created_at') createdAt: number

  @relation('users', 'author_id') author: User
}

// Type-safe access
const post: Post = await database.get('posts').find(postId)
console.log(post.title) // Flow knows this is a string
console.log(post.createdAt) // Flow knows this is a number
```

### Typed Queries

```javascript
// @flow
import { Q } from '@nozbe/watermelondb'

async function getPinnedPosts(): Promise<Post[]> {
  return await database
    .get('posts')
    .query(Q.where('is_pinned', true))
    .fetch()
}
```

### Typed Components

```javascript
// @flow
import React from 'react'
import { withObservables } from '@nozbe/watermelondb/react'
import type { Post } from '../model/Post'

type Props = {
  post: Post,
  onPress: (Post) => void,
}

const PostComponent = ({ post, onPress }: Props) => (
  <TouchableOpacity onPress={() => onPress(post)}>
    <Text>{post.title}</Text>
  </TouchableOpacity>
)

const enhance = withObservables<Props, { post: Post }>(
  ['post'],
  ({ post }) => ({ post })
)

export default enhance(PostComponent)
```

## Best Practices

1. **Use Flow everywhere** - Add `// @flow` to all files
2. **Type your models** - Add types to all model properties
3. **Type function parameters** - Especially database operations
4. **Use type aliases** - Create reusable types for collections

## Type Aliases

```javascript
// @flow
import type { Model } from '@nozbe/watermelondb'

type Post = Model & {
  title: string,
  body: string,
  isPinned: boolean,
}

type Comment = Model & {
  postId: string,
  body: string,
  author: string,
}
```

## Troubleshooting

### Type Errors

If you get type errors:

1. **Check Flow version** - Use compatible version
2. **Verify .flowconfig** - Check configuration
3. **Clear Flow cache** - `flow stop && flow start`

### Missing Types

If types are missing:

1. **Check imports** - Make sure imports are correct
2. **Verify decorators** - Decorators add types automatically
3. **Check Flow config** - Make sure WatermelonDB libs are included

## Next Steps

- See [Performance tips](Performance.md)
- Check out [Debugging guide](Debugging.md)
- Review [TypeScript documentation](https://watermelondb.dev/docs) for TypeScript users

