# LocalStorage

WatermelonDB includes a simple key/value store for small pieces of data.

## When to Use LocalStorage

Use LocalStorage for:

- **User preferences** (theme, language, settings)
- **Session data** (logged-in user ID, auth tokens)
- **Small configuration** (last sync time, app version)
- **Feature flags** (enabled/disabled features)

**Don't use LocalStorage for:**
- Large data (use Models instead)
- Complex relational data (use Models)
- Frequently queried data (use Models with indexes)

## Basic Usage

```javascript
import { database } from './database'

// Set a value
await database.localStorage.set('user_id', 'user123')

// Get a value
const userId = await database.localStorage.get('user_id')

// Remove a value
await database.localStorage.remove('user_id')
```

## Setting Values

```javascript
// Set string
await database.localStorage.set('theme', 'dark')

// Set number
await database.localStorage.set('app_version', 42)

// Set boolean
await database.localStorage.set('onboarding_complete', true)

// Set object (serialized as JSON)
await database.localStorage.set('user_prefs', {
  language: 'en',
  notifications: true,
})
```

## Getting Values

```javascript
// Get string
const theme = await database.localStorage.get('theme') // 'dark'

// Get number
const version = await database.localStorage.get('app_version') // 42

// Get boolean
const complete = await database.localStorage.get('onboarding_complete') // true

// Get object
const prefs = await database.localStorage.get('user_prefs')
// { language: 'en', notifications: true }
```

## Removing Values

```javascript
// Remove a single key
await database.localStorage.remove('user_id')

// Remove multiple keys
await database.localStorage.remove(['key1', 'key2', 'key3'])
```

## Checking for Keys

```javascript
// Check if key exists
const exists = await database.localStorage.has('user_id') // true/false

// Get all keys
const allKeys = await database.localStorage.getAllKeys()
// ['user_id', 'theme', 'app_version', ...]
```

## Complete Examples

### User Session Management

```javascript
// Store user session
async function login(userId, token) {
  await database.localStorage.set('user_id', userId)
  await database.localStorage.set('auth_token', token)
  await database.localStorage.set('logged_in_at', Date.now())
}

// Check if user is logged in
async function isLoggedIn() {
  return await database.localStorage.has('user_id')
}

// Get current user ID
async function getCurrentUserId() {
  return await database.localStorage.get('user_id')
}

// Logout
async function logout() {
  await database.localStorage.remove(['user_id', 'auth_token', 'logged_in_at'])
}
```

### User Preferences

```javascript
// Default preferences
const defaultPrefs = {
  theme: 'light',
  language: 'en',
  notifications: true,
}

// Get user preferences
async function getUserPreferences() {
  const prefs = await database.localStorage.get('user_prefs')
  return prefs || defaultPrefs
}

// Update user preferences
async function updateUserPreferences(newPrefs) {
  const current = await getUserPreferences()
  await database.localStorage.set('user_prefs', {
    ...current,
    ...newPrefs,
  })
}

// Get specific preference
async function getTheme() {
  const prefs = await getUserPreferences()
  return prefs.theme
}

// Set specific preference
async function setTheme(theme) {
  await updateUserPreferences({ theme })
}
```

### App State Management

```javascript
// Track onboarding completion
async function completeOnboarding() {
  await database.localStorage.set('onboarding_complete', true)
  await database.localStorage.set('onboarding_completed_at', Date.now())
}

async function hasCompletedOnboarding() {
  return await database.localStorage.get('onboarding_complete') || false
}

// Track last sync time
async function updateLastSyncTime() {
  await database.localStorage.set('last_sync_time', Date.now())
}

async function getLastSyncTime() {
  return await database.localStorage.get('last_sync_time') || 0
}

// Check if sync is needed (e.g., not synced in last hour)
async function shouldSync() {
  const lastSync = await getLastSyncTime()
  const oneHour = 60 * 60 * 1000
  return Date.now() - lastSync > oneHour
}
```

### Feature Flags

```javascript
// Enable/disable feature
async function enableFeature(featureName) {
  await database.localStorage.set(`feature_${featureName}`, true)
}

async function disableFeature(featureName) {
  await database.localStorage.set(`feature_${featureName}`, false)
}

async function isFeatureEnabled(featureName) {
  return await database.localStorage.get(`feature_${featureName}`) || false
}

// Usage
await enableFeature('new_ui')
if (await isFeatureEnabled('new_ui')) {
  // Show new UI
}
```

## Best Practices

1. **Use descriptive keys** - Prefix keys to avoid conflicts
   - ✅ `user_id`, `user_prefs`, `theme`
   - ❌ `id`, `prefs`, `settings`

2. **Set defaults** - Always handle missing values
   ```javascript
   const theme = await database.localStorage.get('theme') || 'light'
   ```

3. **Group related data** - Use objects for related preferences
   ```javascript
   // ✅ Good
   await database.localStorage.set('user_prefs', {
     theme: 'dark',
     language: 'en',
   })
   
   // ❌ Bad (too many keys)
   await database.localStorage.set('user_theme', 'dark')
   await database.localStorage.set('user_language', 'en')
   ```

4. **Keep it small** - LocalStorage is for small data only

5. **Handle errors** - Wrap in try/catch for production
   ```javascript
   try {
     await database.localStorage.set('key', 'value')
   } catch (error) {
     console.error('Failed to save to localStorage:', error)
   }
   ```

## TypeScript Support

```typescript
// Typed helper
interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

async function getUserPreferences(): Promise<UserPreferences> {
  const prefs = await database.localStorage.get<UserPreferences>('user_prefs')
  return prefs || {
    theme: 'light',
    language: 'en',
    notifications: true,
  }
}
```

## Limitations

- **Small data only** - Don't store large objects
- **Simple key/value** - No queries, indexes, or relations
- **String keys** - Keys must be strings
- **JSON serialization** - Complex objects are serialized as JSON

## When to Use Models Instead

If you need:
- **Queries** - Use Models with Query API
- **Relations** - Use Models with `@relation` and `@children`
- **Indexing** - Use Models with indexed columns
- **Large data** - Use Models (more efficient)

## Next Steps

- Learn about [Migrations](Migrations.md)
- See [Performance tips](Performance.md)
- Check out [Sync documentation](../Sync/README.md)

