# Models

Models define the structure and behavior of your data. They map to tables in your schema.

## Basic Model

```javascript
import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  static table = 'posts'

  @field('title') title
  @field('body') body
  @field('is_pinned') isPinned
}
```

## Field Decorator

Use `@field('column_name')` to map a property to a database column:

```javascript
class Post extends Model {
  static table = 'posts'

  @field('title') title           // maps to 'title' column
  @field('body') body             // maps to 'body' column
  @field('is_pinned') isPinned    // maps to 'is_pinned' column (snake_case to camelCase)
}
```

The decorator takes the database column name (usually snake_case) and creates a JavaScript property (usually camelCase).

## Relations

WatermelonDB supports three types of relations:

### Children (One-to-Many)

Use `@children` to define one-to-many relationships:

```javascript
import { children } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  static table = 'posts'

  @children('comments') comments  // All comments where comment.post_id === post.id
}

class Comment extends Model {
  static table = 'comments'

  @field('post_id') postId
  @field('body') body
}
```

This creates a `post.comments` collection containing all comments for that post.

### Relations (Many-to-One, Belongs-To)

Use `@relation` to define many-to-one relationships:

```javascript
import { relation } from '@nozbe/watermelondb/decorators'

class Comment extends Model {
  static table = 'comments'

  @field('post_id') postId
  @relation('posts', 'post_id') post  // The post this comment belongs to
}

class Post extends Model {
  static table = 'posts'

  @children('comments') comments
}
```

This creates a `comment.post` property pointing to the parent post.

### Many-to-Many Relations

Many-to-many relations require a join table:

```javascript
// Join table
class PostTag extends Model {
  static table = 'post_tags'

  @field('post_id') postId
  @field('tag_id') tagId
  @relation('posts', 'post_id') post
  @relation('tags', 'tag_id') tag
}

class Post extends Model {
  static table = 'posts'

  @children('post_tags') postTags
  get tags() {
    return this.postTags.map(pt => pt.tag)
  }
}

class Tag extends Model {
  static table = 'tags'

  @field('name') name
  @children('post_tags') postTags
}
```

## Computed Properties

You can add computed properties (getters) that aren't stored in the database:

```javascript
class Post extends Model {
  static table = 'posts'

  @field('title') title
  @field('body') body

  get excerpt() {
    return this.body.substring(0, 100) + '...'
  }

  get wordCount() {
    return this.body.split(' ').length
  }
}
```

## Actions (Writing to Database)

Models provide methods for database operations:

```javascript
// Create
const post = await database.get('posts').create(post => {
  post.title = 'New Post'
  post.body = 'This is the body'
})

// Update
await post.update(post => {
  post.title = 'Updated Title'
})

// Delete (soft delete - marks as deleted)
await post.markAsDeleted()

// Permanently delete
await post.destroyPermanently()
```

All write operations must be inside a `database.write()` block:

```javascript
await database.write(async () => {
  await post.update(post => {
    post.title = 'New Title'
  })
})
```

## Model Methods

Add custom methods to your models:

```javascript
class Post extends Model {
  static table = 'posts'

  @field('title') title
  @field('body') body
  @field('is_pinned') isPinned

  async pin() {
    await this.update(post => {
      post.isPinned = true
    })
  }

  async unpin() {
    await this.update(post => {
      post.isPinned = false
    })
  }

  async addComment(body, author) {
    return await database.get('comments').create(comment => {
      comment.postId = this.id
      comment.body = body
      comment.author = author
    })
  }
}
```

## All Decorators

- `@field('column_name')` - Map to a database column
- `@relation('table_name', 'foreign_key_column')` - Belongs-to relationship
- `@children('table_name')` - Has-many relationship
- `@text('column_name')` - Same as `@field` but optimized for large text
- `@date('column_name')` - Same as `@field` but automatically converts Date objects
- `@readonly` - Mark field as read-only (for synced data)
- `@immutableRelation('table_name', 'foreign_key_column')` - Immutable relation (can't be changed)

## TypeScript Support

WatermelonDB has full TypeScript support:

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, relation, children } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  static table = 'posts'

  @field('title') title!: string
  @field('body') body!: string
  @field('is_pinned') isPinned!: boolean
  @children('comments') comments!: Comment[]
}
```

## Example: Complete Model

```javascript
import { Model } from '@nozbe/watermelondb'
import { field, relation, children, date } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  static table = 'posts'

  @field('title') title
  @field('body') body
  @field('author_id') authorId
  @field('is_pinned') isPinned
  @date('created_at') createdAt
  @date('updated_at') updatedAt

  @relation('users', 'author_id') author
  @children('comments') comments

  get excerpt() {
    return this.body.substring(0, 100) + '...'
  }

  async togglePin() {
    await this.update(post => {
      post.isPinned = !post.isPinned
    })
  }
}
```

## Next Steps

- Learn about [CRUD operations](CRUD.md)
- See how to [query models](Query.md)
- Connect models to [React components](Components.md)

