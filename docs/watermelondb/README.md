# WatermelonDB Documentation

A reactive database framework for building powerful React and React Native apps that scale from hundreds to tens of thousands of records and remain fast ⚡️

## Overview

**WatermelonDB** is a new way of dealing with user data in React Native and React web apps.

It's optimized for building **complex applications** in React Native, and the number one goal is **real-world performance**. In simple words, _your app must launch fast_.

For simple apps, using Redux or MobX with a persistence adapter is the easiest way to go. But when you start scaling to thousands or tens of thousands of database records, your app will now be slow to launch (especially on slower Android devices). Loading a full database into JavaScript is expensive!

Watermelon fixes it **by being lazy**. Nothing is loaded until it's requested. And since all querying is performed directly on the rock-solid SQLite database on a separate native thread, most queries resolve in an instant.

But unlike using SQLite directly, Watermelon is **fully observable**. So whenever you change a record, all UI that depends on it will automatically re-render. For example, completing a task in a to-do app will re-render the task component, the list (to reorder), and all relevant task counters.

## Key Features

- ⚡️ **Launch your app instantly** no matter how much data you have
- 📈 **Highly scalable** from hundreds to tens of thousands of records
- 😎 **Lazy loaded**. Only load data when you need it
- 🔄 **Offline-first.** [Sync](Sync/README.md) with your own backend
- 📱 **Multiplatform**. iOS, Android, Windows, web, and Node.js
- ⚛️ **Optimized for React.** Easily plug data into components
- 🧰 **Framework-agnostic.** Use JS API to plug into other UI frameworks
- ⏱ **Fast.** And getting faster with every release!
- ✅ **Proven.** Powers [Nozbe Teams](https://nozbe.com/teams) since 2017
- ✨ **Reactive.** (Optional) [RxJS](https://github.com/ReactiveX/rxjs) API
- 🔗 **Relational.** Built on rock-solid [SQLite](https://www.sqlite.org) foundation
- ⚠️ **Static typing** with [Flow](https://flow.org) or [TypeScript](https://typescriptlang.org)

## Quick Example

```javascript
class Post extends Model {
  @field('name') name
  @field('body') body
  @children('comments') comments
}

class Comment extends Model {
  @field('body') body
  @field('author') author
}

// Connect components to make them reactive
const Comment = ({ comment }) => (
  <View style={styles.commentBox}>
    <Text>{comment.body} — by {comment.author}</Text>
  </View>
)

const enhance = withObservables(['comment'], ({ comment }) => ({
  comment,
}))
const EnhancedComment = enhance(Comment)
```

The result is fully reactive! Whenever a post or comment is added, changed, or removed, the right components **will automatically re-render** on screen.

## Documentation Index

- [Installation](Installation.md) - Setup guide for React Native and web
- [Schema](Schema.md) - Defining your database schema
- [Models](Models.md) - Creating models with decorators
- [CRUD](CRUD.md) - Create, Read, Update, Delete operations
- [Query](Query.md) - Querying data with the Query API
- [Components](Components.md) - Connecting React components
- [Sync](Sync/README.md) - Synchronization with backends
- [Advanced](Advanced/README.md) - Migrations, LocalStorage, and more
- [Contributing](Contributing.md) - How to contribute to WatermelonDB

## Resources

- **Official Website**: https://watermelondb.dev
- **GitHub Repository**: https://github.com/Nozbe/WatermelonDB
- **Demo App**: https://watermelondb.now.sh/
- **Video**: [Next-generation React databases](https://www.youtube.com/watch?v=UlZ1QnFF4Cw)

## License

MIT License - See LICENSE file for more info.

**WatermelonDB** was created by [@Nozbe](https://nozbe.com).

