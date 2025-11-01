# Sync

WatermelonDB provides a powerful synchronization system for syncing data with your backend.

## Overview

WatermelonDB's sync system allows you to:

- **Pull changes** from your backend
- **Push changes** to your backend
- **Handle conflicts** intelligently
- **Work offline** - changes are queued locally
- **Resume sync** after network issues

## Sync Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Backend   │ ◄────► │  Sync Layer  │ ◄────► │ WatermelonDB│
│   Server    │         │  (Pull/Push) │         │   Database  │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Basic Sync Setup

### 1. Define Sync Protocol

Your backend needs to implement the sync protocol:

```javascript
// sync.js
export async function pullChanges(lastPulledAt, schema, migrations) {
  // Fetch changes from your backend
  const response = await fetch('/api/sync/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastPulledAt }),
  })
  
  const { changes, timestamp } = await response.json()
  
  return { changes, timestamp }
}

export async function pushChanges(changes, lastPulledAt) {
  // Push changes to your backend
  await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes, lastPulledAt }),
  })
}
```

### 2. Create Sync Function

```javascript
import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from './database'

export async function sync() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schema, migrations }) => {
      // Your pull logic
      const response = await fetch('/api/sync/pull', {
        method: 'POST',
        body: JSON.stringify({ lastPulledAt }),
      })
      const { changes, timestamp } = await response.json()
      return { changes, timestamp }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // Your push logic
      await fetch('/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({ changes, lastPulledAt }),
      })
    },
    migrationsEnabledAtVersion: 1,
  })
}
```

### 3. Call Sync Periodically

```javascript
import { sync } from './sync'

// Sync every minute
setInterval(async () => {
  try {
    await sync()
  } catch (error) {
    console.error('Sync failed:', error)
  }
}, 60 * 1000)

// Or sync on app start/foreground
import { AppState } from 'react-native'

AppState.addEventListener('change', async (state) => {
  if (state === 'active') {
    await sync()
  }
})
```

## Sync Protocol

### Pull Changes Format

Your backend should return changes in this format:

```javascript
{
  changes: {
    posts: {
      created: [
        { id: 'post1', title: 'Post 1', body: 'Content' },
      ],
      updated: [
        { id: 'post2', title: 'Updated Post' },
      ],
      deleted: ['post3'],
    },
    comments: {
      created: [
        { id: 'comment1', post_id: 'post1', body: 'Comment' },
      ],
      updated: [],
      deleted: [],
    },
  },
  timestamp: 1234567890,
}
```

### Push Changes Format

WatermelonDB sends changes in this format:

```javascript
{
  changes: {
    posts: {
      created: [...],
      updated: [...],
      deleted: [...],
    },
    comments: {
      created: [...],
      updated: [...],
      deleted: [...],
    },
  },
  lastPulledAt: 1234567890,
}
```

## Conflict Resolution

WatermelonDB handles conflicts automatically:

- **Last write wins** - By default, most recent change wins
- **Custom resolution** - Implement your own conflict resolution
- **Backend decides** - Let your backend resolve conflicts

### Custom Conflict Resolution

```javascript
export async function sync() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      // ... pull logic
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // ... push logic
    },
    conflictResolver: (local, remote) => {
      // Custom conflict resolution
      // Return the record that should be kept
      if (local.updated_at > remote.updated_at) {
        return local
      }
      return remote
    },
  })
}
```

## Sync Best Practices

### 1. Sync Frequency

```javascript
// Sync every 5 minutes when app is active
const SYNC_INTERVAL = 5 * 60 * 1000

let syncInterval

function startSync() {
  syncInterval = setInterval(async () => {
    try {
      await sync()
    } catch (error) {
      console.error('Sync error:', error)
    }
  }, SYNC_INTERVAL)
}

function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
  }
}

// Start sync when app becomes active
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    startSync()
    sync() // Immediate sync
  } else {
    stopSync()
  }
})
```

### 2. Error Handling

```javascript
async function sync() {
  try {
    await synchronize({
      // ... sync config
    })
  } catch (error) {
    if (error.code === 'SYNC_ERROR_NETWORK') {
      // Network error - will retry later
      console.log('Network error, will retry')
    } else if (error.code === 'SYNC_ERROR_AUTH') {
      // Auth error - might need to re-login
      console.log('Auth error')
    } else {
      // Other errors
      console.error('Sync error:', error)
    }
    throw error
  }
}
```

### 3. Sync Status

```javascript
import { database } from './database'

// Track sync status
await database.localStorage.set('last_sync_time', Date.now())

// Check if sync is needed
async function shouldSync() {
  const lastSync = await database.localStorage.get('last_sync_time')
  const fiveMinutes = 5 * 60 * 1000
  return !lastSync || (Date.now() - lastSync > fiveMinutes)
}

// Sync if needed
if (await shouldSync()) {
  await sync()
}
```

## Advanced Sync

### Partial Sync (Filtering)

Sync only specific records:

```javascript
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    const response = await fetch('/api/sync/pull', {
      method: 'POST',
      body: JSON.stringify({
        lastPulledAt,
        userId: await database.localStorage.get('user_id'),
      }),
    })
    const { changes, timestamp } = await response.json()
    return { changes, timestamp }
  },
  // ... other config
})
```

### Incremental Sync

Only sync changed records:

```javascript
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    // Backend should only return records changed since lastPulledAt
    const response = await fetch(`/api/sync/pull?since=${lastPulledAt}`)
    const { changes, timestamp } = await response.json()
    return { changes, timestamp }
  },
  // ... other config
})
```

## Backend Implementation

### Example Backend (Node.js/Express)

```javascript
// Express.js example
app.post('/api/sync/pull', async (req, res) => {
  const { lastPulledAt } = req.body
  
  // Get changes since lastPulledAt
  const changes = {
    posts: {
      created: await getCreatedPosts(lastPulledAt),
      updated: await getUpdatedPosts(lastPulledAt),
      deleted: await getDeletedPosts(lastPulledAt),
    },
    comments: {
      created: await getCreatedComments(lastPulledAt),
      updated: await getUpdatedComments(lastPulledAt),
      deleted: await getDeletedComments(lastPulledAt),
    },
  }
  
  res.json({
    changes,
    timestamp: Date.now(),
  })
})

app.post('/api/sync/push', async (req, res) => {
  const { changes, lastPulledAt } = req.body
  
  // Apply changes to your database
  for (const [table, tableChanges] of Object.entries(changes)) {
    for (const created of tableChanges.created || []) {
      await createRecord(table, created)
    }
    for (const updated of tableChanges.updated || []) {
      await updateRecord(table, updated)
    }
    for (const deleted of tableChanges.deleted || []) {
      await deleteRecord(table, deleted)
    }
  }
  
  res.json({ success: true })
})
```

## Testing Sync

```javascript
// Test sync locally
async function testSync() {
  // Create some local changes
  await database.write(async () => {
    await database.get('posts').create(post => {
      post.title = 'Test Post'
      post.body = 'Test Content'
    })
  })
  
  // Sync
  await sync()
  
  // Verify changes were pushed
  const posts = await database.get('posts').query().fetch()
  console.log('Posts after sync:', posts)
}
```

## Troubleshooting

### Sync not working

- Check network connectivity
- Verify backend endpoints are correct
- Check authentication tokens
- Review sync logs for errors

### Data conflicts

- Implement conflict resolution
- Use `updated_at` timestamps for conflict detection
- Let backend decide in complex cases

### Performance issues

- Limit sync frequency
- Use incremental sync (only changed records)
- Filter sync by user/permissions

## Next Steps

- See [Advanced documentation](../Advanced/README.md)
- Check out [Performance tips](../Advanced/Performance.md)
- Review [Contributing guide](../Contributing.md)

