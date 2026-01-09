# Duplicate Accounts Investigation

## Problem
Duplicate accounts are appearing in the database with the same Plaid `account_id` but different WatermelonDB `id` values. For example, two "Plaid Checking (...0000)" accounts are showing up in the UI.

## Root Cause Analysis

### How WatermelonDB Sync Should Work
According to [WatermelonDB sync documentation](https://watermelondb.dev/docs/Sync/Backend):

1. **Client generates IDs**: When creating records locally, WatermelonDB generates unique IDs (e.g., `abc123xyz`)
2. **Backend preserves IDs**: The backend MUST preserve these exact IDs when storing records
3. **Sync uses IDs for matching**: When pulling changes, WatermelonDB matches records by their `id` field, not by business keys like `account_id`

### Why Duplicates Occur
Duplicates happen when:
1. Client creates account with ID `abc123` and `account_id` = "E5doyBg5..."
2. Backend stores it but assigns a NEW ID like `xyz789` instead of preserving `abc123`
3. Client pulls changes and sees `xyz789` as a "new" account (even though `account_id` is the same)
4. Now we have two Account records with different `id` but same `account_id`

### Backend Requirements
From WatermelonDB docs, the backend MUST:
- **Preserve IDs**: Use the exact `id` sent from the client as the primary key
- **Handle duplicates gracefully**: If a push contains a record whose ID already exists, update it (don't error)
- **Return original IDs**: When pulling changes, return the same IDs that were originally created

## What We've Added

### 1. Enhanced Logging (synchronize.ts)
Added detailed logging to track account sync operations:

**When pushing to server:**
```typescript
LOG [sync] Pushing account creations to server {
  count: 5,
  accounts: [
    { id: 'abc123', accountId: 'E5doy...', name: 'Plaid Checking', mask: '0000' }
  ]
}
```

**When receiving from server:**
```typescript
LOG [sync] Received accounts to create from server {
  count: 5,
  accounts: [
    { id: 'abc123', accountId: 'E5doy...', name: 'Plaid Checking', mask: '0000' }
  ]
}
```

### 2. Cleanup Script
Created `scripts/cleanup-duplicate-accounts.ts` to remove existing duplicates:
- Finds all accounts with duplicate `account_id` values
- Keeps the most recently updated record
- Deletes older duplicates
- Can be run with: `npx ts-node scripts/cleanup-duplicate-accounts.ts`

### 3. Existing Duplicate Detection (plaid-service.ts)
The code already has duplicate detection at lines 218-249:
- Detects cross-item duplicates (same account linked to multiple Plaid items)
- Consolidates duplicate records when found
- Shows alerts to users when duplicates are detected

## Next Steps

### 1. Check the Backend
Review your backend sync implementation to ensure:
- [ ] Account records are stored with the exact `id` sent from the client
- [ ] The database primary key is the WatermelonDB `id`, not an auto-increment
- [ ] Pull endpoint returns records with their original IDs
- [ ] Push endpoint updates existing records when IDs match (doesn't create new ones)

### 2. Monitor Sync Logs
With the new logging in place, watch for patterns like:
- **Bad**: Push ID `abc123` → Pull receives ID `xyz789` (backend is changing IDs!)
- **Good**: Push ID `abc123` → Pull receives ID `abc123` (backend preserving IDs)

### 3. Run Cleanup Script
After fixing the backend, clean up existing duplicates:
```bash
npx ts-node scripts/cleanup-duplicate-accounts.ts
```

### 4. Test Sync Flow
1. Create a test account on Device A
2. Note the WatermelonDB `id` and `account_id`
3. Sync to backend
4. Check backend database - does it have the same `id`?
5. Pull from Device B
6. Verify Device B has the same `id` and `account_id`

## Common Backend Mistakes

### ❌ Wrong: Auto-increment Primary Key
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,  -- Wrong! Generates new IDs
  account_id TEXT,
  ...
);
```

### ✅ Correct: Use WatermelonDB ID
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,  -- Use the ID from WatermelonDB
  account_id TEXT,
  ...
);
```

### ❌ Wrong: Create New Record on Pull
```typescript
// Backend endpoint
async function pullChanges() {
  const accounts = await db.accounts.findAll();
  return {
    accounts: {
      created: accounts.map(acc => ({
        ...acc,
        id: generateNewId() // ❌ Wrong! Changing the ID
      }))
    }
  };
}
```

### ✅ Correct: Preserve Original IDs
```typescript
// Backend endpoint
async function pullChanges() {
  const accounts = await db.accounts.findAll();
  return {
    accounts: {
      created: accounts.map(acc => ({
        ...acc,
        id: acc.id // ✅ Correct! Use original ID
      }))
    }
  };
}
```

## References
- [WatermelonDB Sync Backend Docs](https://watermelondb.dev/docs/Sync/Backend)
- [WatermelonDB Sync FAQ](https://watermelondb.dev/docs/Sync/FAQ)
