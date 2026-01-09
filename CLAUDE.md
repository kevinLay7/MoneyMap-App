# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm start` - Start Expo development server with dev client (requires prebuild)
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run device` - Run on connected iOS device
- `npm run web` - Run web version

### Building & Distribution
- `npm run build-ios-preview` - Build iOS preview with EAS
- `npm run ios-local` - Build and deploy iOS locally with ios-deploy
- `npm run ios-local-prod` - Build and deploy iOS production locally
- `npm run build-android-preview` - Build Android preview with EAS
- `npm run build-android-production` - Build Android production with EAS

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### API Integration
- `npm run generate-api` - Generate TypeScript API client from Swagger (requires backend running on localhost:3001)

## High-Level Architecture

### App Structure
This is a React Native Expo app using:
- **Expo Router** for file-based routing with protected routes
- **Auth0** for authentication with fallback for dev client compatibility
- **WatermelonDB** as the local SQLite ORM with sync capabilities
- **TanStack Query** for server state management
- **NativeWind/Tailwind** for styling
- **Reactotron** for debugging (dev mode only, configured in `config/ReactotronConfig.ts`)

### Routing Architecture
- `app/_layout.tsx` - Root layout with provider hierarchy and route guards
- `app/(public)/` - Public routes (login)
- `app/(auth)/` - Protected routes requiring authentication
- Uses Expo Router's Stack.Protected for route guarding based on Auth0 user state
- `ProfileCheckWrapper` ensures user has a profile before allowing background sync

### Provider Hierarchy
The app uses a specific provider order in `app/_layout.tsx`:
1. **Auth0Provider** - Authentication (with graceful degradation fallback)
2. **QueryClientProvider** - TanStack Query for server state
3. **ColorSchemeProvider** - Theme management
4. **ProfileCheckWrapper** - Ensures profile exists before enabling sync
5. **LoggingProvider** - Configures structured logging with database persistence (MUST be before DependencyProvider)
6. **DependencyProvider** - Dependency injection for API clients and services
7. **DemoProvider** - Demo mode toggle (stored in AsyncStorage)

### Database Architecture (WatermelonDB)
- **Local-first**: SQLite database with WatermelonDB ORM
- **Sync**: Encrypted bidirectional sync with backend API
- **Models**: Located in `model/models/` directory
- **Schema**: Defined in `model/schema.js` (current version: 14)
- **Migrations**: Handled in `model/migrations.js`
- **JSI**: Disabled by default for dev client compatibility (enable after building)

#### Key Tables
- `accounts` - Financial accounts (circular dependency with items)
- `items` - Plaid item connections (circular dependency with accounts)
- `transactions` - Financial transactions
- `merchants` - Merchant information
- `categories` - Transaction categories (system categories excluded from sync)
- `budgets` & `budget_items` - Budget management
- `account_daily_balances` - Historical account balance snapshots
- `syncs` & `transaction_syncs` - Sync metadata
- `logs` - Application logs (excluded from sync)

#### Sync Architecture
- **Conflict Resolution**: Remote changes always win over local changes
- **Encryption**: All sync data is encrypted before transmission via `sync-encryption-service.ts`
- **Table Dependencies**: Synced in specific order defined in `model/synchronize.ts` to maintain referential integrity
- **System Categories**: Categories with IDs starting with "sys" are excluded from sync
- **Excluded Tables**: `logs` table is excluded from sync operations
- **Batching**: Large changes are automatically batched for efficient transmission
- **Device ID**: Sync endpoints include `x-client-id` header for device identification

### Service Layer
Services are located in `services/` and handle business logic:
- **sync-orchestrator.ts** - Manages background sync operations with foreground/background modes
  - Foreground: Full sync every 60s, debounced push 3s after writes, Plaid check every 12h
  - Background: Handled by expo-background-task (OS-scheduled)
- **sync-encryption-service.ts** - Handles E2E encryption for sync
- **category-service.ts** - Category management with system categories
- **transaction-service.ts** - Transaction processing and categorization
- **plaid-service.ts** - Plaid API integration
- **budget-service.ts** - Budget calculations and management
- **daily-balance-service.ts** - Account balance calculations
- **logging-service.ts** - Structured logging with database persistence
- **background-task-service.ts** - Orchestrates background operations

### Dependency Injection
- **DependencyContext**: Located in `context/dependencyContext.tsx`
- Provides API clients (generated from Swagger) and services
- Handles Auth0 token management with automatic refresh (max 1 retry on 401)
- Sets up HTTP client with device ID headers for sync endpoints
- Always initializes to allow create-profile to work, but background sync is prevented by profile check

### State Management
- **TanStack Query** for server state and API calls
- **React Context** for dependency injection and global state
- **WatermelonDB** for local data persistence
- Custom hooks in `hooks/` for data access patterns:
  - `use-observable.tsx` - Observe WatermelonDB models and collections
  - `use-model-with-relations.tsx` - Observe models with their relations
  - `use-computed-state.tsx` - Derived state computations
  - `use-background-tasks.tsx` - Background sync orchestration
  - `use-profile-check.ts` - Verify user profile exists
  - `use-load-categories.tsx` - Category loading and initialization
  - `use-logger.ts` - Access logging functionality

### Logging System
- **LoggingProvider** configures structured logging on app startup
- **logging-service.ts** provides `logger` with methods: `info()`, `warn()`, `error()`
- Logs are persisted to WatermelonDB `logs` table
- Log types defined in `types/logging.ts`: Sync, Plaid, Background, Api, Auth, Database, UI, General
- View logs in `app/(auth)/logs.tsx` screen
- Logs can be cleared via `clearLogs()` function

### Native Module Compatibility
- Auth0 gracefully degrades when native modules aren't built (shows warning in logs)
- Database JSI is disabled by default for dev client compatibility
- Enable JSI in `model/database.ts` after running `npm run ios` (set `jsi: true`)
- Native modules require building with `npm run ios` or EAS build

### Background Tasks
- Sync orchestration handles periodic background sync with lock mechanism (60s timeout)
- Daily balance calculations trigger after sync completion
- Background fetch configured for iOS/Android background processing via expo-background-task
- Background operations are prevented if user doesn't have a profile

### Debugging
- **Reactotron**: Configured in `config/ReactotronConfig.ts` for development debugging
  - Accessible via `console.tron` in dev mode
  - Desktop app must be running on port 9090
  - Android emulator uses host 10.0.2.2, iOS uses localhost
  - Clears on each app load

## Important Notes

### Development Workflow
1. Use `npm start` for development (requires Expo dev client)
2. Use `npm run ios` to build with native modules for full functionality
3. Auth0 and some features require native build to function properly

### Code Patterns
- Services are injected via DependencyContext, not imported directly
- Database queries use WatermelonDB patterns (observables, Q queries)
- Use `useObservable()` and `useModelWithRelations()` hooks for reactive queries
- API calls go through generated clients in `api/gen/`
- Background operations should be orchestrated through BackgroundTaskService
- Use `logger` from `logging-service.ts` for all logging (not console.log)

### Sync Considerations
- Always consider sync implications when modifying data models
- System categories (sys_*) should never be synced
- Logs table is excluded from sync operations
- Circular dependencies between accounts/items require careful handling
- Table sync order is critical - see `SYNC_TABLE_ORDER` in `model/synchronize.ts`
- Encryption keys are managed per-user and stored securely
- Remote changes always win in conflict resolution
