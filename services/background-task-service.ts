import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { BackgroundTaskResult } from 'expo-background-task';
import { Sync } from '@/api/gen/Sync';
import { Plaid } from '@/api/gen/Plaid';
import { HttpClient } from '@/api/gen/http-client';
import { databaseSynchronize, pushOnlyChanges } from '@/model/synchronize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Auth0 from 'react-native-auth0';
import { getDeviceClientId } from '@/utils/device-client-id';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import dayjs from 'dayjs';
import database from '@/model/database';
import Item from '@/model/models/item';

// Task names
export const BACKGROUND_SYNC_TASK = 'background-sync';
export const BACKGROUND_PLAID_SYNC_TASK = 'background-check';

// Storage keys
const LAST_SYNC_KEY = 'last_background_sync';
const LAST_CHECK_KEY = 'last_background_check';
const API_URL_KEY = 'background_task_api_url';
const LAST_ITEM_REFRESH_PREFIX = 'last_item_refresh_'; // Will be suffixed with item ID

// Minimum time between executions (in milliseconds) to prevent duplicate calls
const MIN_SYNC_INTERVAL = 25 * 1000; // 25 seconds (less than 30s to allow for foreground polling)
const MIN_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MIN_ITEM_REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours - prevent refreshing same item too often

interface BackgroundTaskServiceConfig {
  syncApi: Sync;
  plaidApi: Plaid;
}

// Global state for background tasks (accessible from headless context)
let globalSyncApi: Sync | null = null;
let globalPlaidApi: Plaid | null = null;
let globalInitialized = false;
let syncInProgress = false; // Lock to prevent concurrent syncs
let syncLockAcquiredAt: number | null = null; // Timestamp when lock was acquired
const SYNC_LOCK_TIMEOUT = 60 * 1000; // 60 seconds - auto-release lock if held too long
let auth0Instance: Auth0 | null = null; // Auth0 instance for background tasks

export class BackgroundTaskService {
  /**
   * Initialize the background task service with API clients
   */
  async initialize(config: BackgroundTaskServiceConfig) {
    globalSyncApi = config.syncApi;
    globalPlaidApi = config.plaidApi;
    globalInitialized = true;

    // Store API URL for headless context initialization
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        await AsyncStorage.setItem(API_URL_KEY, apiUrl);
      } catch (error) {
        console.error('Failed to store API URL:', error);
      }
    }
  }

  /**
   * Initialize Auth0 instance for background tasks
   * This allows background tasks to retrieve credentials from secure storage
   */
  initializeAuth0(domain: string, clientId: string) {
    try {
      auth0Instance = new Auth0({
        domain,
        clientId,
      });
      console.log('Auth0 initialized for background tasks');
    } catch (error) {
      console.error('Failed to initialize Auth0 for background tasks:', error);
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return globalInitialized && globalSyncApi !== null && globalPlaidApi !== null;
  }

  /**
   * Initialize API instances in headless context
   * Recreates HttpClient and API instances using stored config and Auth0 credentials
   */
  private static async initializeInHeadlessContext(): Promise<boolean> {
    if (!auth0Instance) {
      console.warn('Auth0 instance not initialized, cannot initialize in headless context');
      return false;
    }

    try {
      // Get API URL from storage or env
      const apiUrl = (await AsyncStorage.getItem(API_URL_KEY)) || process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        console.warn('API URL not available, cannot initialize in headless context');
        return false;
      }

      // Get credentials from secure storage (automatically refreshes if expired)
      const credentials = await auth0Instance.credentialsManager.getCredentials();
      if (!credentials?.accessToken) {
        console.warn('No access token available, cannot initialize in headless context');
        return false;
      }

      // Create HttpClient with auth token
      const httpClient = new HttpClient<unknown>();
      httpClient.instance.defaults.baseURL = apiUrl;
      httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;

      // Set up request interceptor to add x-client-id header for sync endpoints
      httpClient.instance.interceptors.request.use(
        async config => {
          if (config.url && (config.url.includes('/sync/pull') || config.url.includes('/sync/push'))) {
            try {
              const clientId = await getDeviceClientId();
              config.headers['x-client-id'] = clientId;
            } catch (error) {
              console.error('Failed to get device client ID:', error);
            }
          }
          return config;
        },
        error => Promise.reject(error)
      );

      // Create API instances
      globalSyncApi = new Sync(httpClient);
      globalPlaidApi = new Plaid(httpClient);
      globalInitialized = true;

      console.log('Background task service initialized in headless context');
      return true;
    } catch (error) {
      console.error('Failed to initialize in headless context:', error);
      return false;
    }
  }

  /**
   * Refresh authentication token for API clients
   * Retrieves credentials from secure storage and updates HttpClient headers
   */
  private static async refreshAuthToken(): Promise<boolean> {
    if (!auth0Instance) {
      console.warn('Auth0 instance not initialized, cannot refresh token');
      return false;
    }

    try {
      // Get credentials from secure storage (automatically refreshes if expired)
      const credentials = await auth0Instance.credentialsManager.getCredentials();

      if (!credentials?.accessToken) {
        console.warn('No access token available in credentials');
        return false;
      }

      // Update Authorization headers for both API clients
      if (globalSyncApi) {
        globalSyncApi.http.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
      }

      if (globalPlaidApi) {
        globalPlaidApi.http.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
      }

      console.log('Auth token refreshed successfully for background tasks');
      return true;
    } catch (error) {
      console.error('Failed to refresh auth token for background tasks:', error);
      return false;
    }
  }

  /**
   * Acquire sync lock. Returns true if lock was acquired, false if already locked.
   * Automatically releases stale locks (held longer than SYNC_LOCK_TIMEOUT).
   */
  static acquireSyncLock(): boolean {
    const now = Date.now();

    // Check if lock is stale and should be auto-released
    if (syncInProgress && syncLockAcquiredAt) {
      const lockHeldFor = now - syncLockAcquiredAt;
      if (lockHeldFor > SYNC_LOCK_TIMEOUT) {
        console.warn(`⚠️ Sync lock was stale (held for ${Math.round(lockHeldFor / 1000)}s), force-releasing`);
        this.releaseSyncLock();
      }
    }

    if (syncInProgress) {
      return false;
    }
    syncInProgress = true;
    syncLockAcquiredAt = now;
    return true;
  }

  /**
   * Release sync lock.
   */
  static releaseSyncLock(): void {
    syncInProgress = false;
    syncLockAcquiredAt = null;
  }

  /**
   * Force release the sync lock. Use only for debugging/recovery.
   */
  static forceReleaseSyncLock(): void {
    console.warn('⚠️ Force releasing sync lock');
    syncInProgress = false;
    syncLockAcquiredAt = null;
  }

  /**
   * Wraps a promise with a timeout. Rejects if the promise doesn't resolve within the timeout.
   */
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute sync with lock to prevent concurrent calls
   */
  static async executeSyncWithLock(syncApi: Sync): Promise<void> {
    if (!this.acquireSyncLock()) {
      console.log('Sync already in progress, skipping');
      return;
    }

    const logger = new SyncLogger(1000);
    try {
      // Wrap sync with a timeout slightly less than the lock timeout
      await this.withTimeout(databaseSynchronize(syncApi, logger), SYNC_LOCK_TIMEOUT - 5000, 'Database sync');
    } finally {
      this.releaseSyncLock();
    }
  }

  /**
   * Execute push-only sync with lock to prevent concurrent calls
   */
  static async executePushOnlyWithLock(syncApi: Sync): Promise<void> {
    if (!this.acquireSyncLock()) {
      console.log('Sync already in progress, skipping push-only');
      return;
    }

    try {
      // Wrap push with a timeout (45s should be enough for most cases)
      await this.withTimeout(pushOnlyChanges(syncApi), 45000, 'Push-only sync');
    } finally {
      this.releaseSyncLock();
    }
  }

  /**
   * Execute sync task (static method for headless context)
   */
  private static async executeSync(): Promise<BackgroundTaskResult> {
    // Try to initialize if not already initialized (headless context)
    if (!globalInitialized || !globalSyncApi) {
      console.log('Background task service not initialized, attempting to initialize in headless context...');
      const initialized = await this.initializeInHeadlessContext();
      if (!initialized) {
        console.warn('Failed to initialize background task service, skipping sync');
        return BackgroundTaskResult.Failed;
      }
    }

    try {
      // Check if sync is already in progress
      if (syncInProgress) {
        console.log('Sync already in progress, skipping background sync');
        return BackgroundTaskResult.Success;
      }

      // Check if enough time has passed
      const lastExecution = await this.getLastExecutionTime(LAST_SYNC_KEY);
      const shouldExecute = !lastExecution || Date.now() - lastExecution >= MIN_SYNC_INTERVAL;

      if (!shouldExecute) {
        console.log('Sync skipped: too soon since last execution');
        return BackgroundTaskResult.Success;
      }

      console.log('Executing background sync...');

      // Refresh auth token before sync to ensure we have valid credentials
      const tokenRefreshed = await this.refreshAuthToken();
      if (!tokenRefreshed) {
        console.warn('Failed to refresh auth token, attempting sync anyway');
        // Continue anyway - the API call will fail with 401 if token is invalid
      }

      // Execute database synchronization with lock
      if (!globalSyncApi) {
        console.error('Sync API not available after initialization');
        return BackgroundTaskResult.Failed;
      }
      await this.executeSyncWithLock(globalSyncApi);

      // Store execution time
      await this.setLastExecutionTime(LAST_SYNC_KEY, Date.now());

      console.log('Background sync completed successfully');
      return BackgroundTaskResult.Success;
    } catch (error) {
      console.error('Background sync failed:', error);
      return BackgroundTaskResult.Failed;
    }
  }

  /**
   * Execute check task (static method for headless context)
   */
  private static async executeCheck(): Promise<BackgroundTaskResult> {
    // Try to initialize if not already initialized (headless context)
    if (!globalInitialized || !globalPlaidApi) {
      console.log('Background task service not initialized, attempting to initialize in headless context...');
      const initialized = await this.initializeInHeadlessContext();
      if (!initialized) {
        console.warn('Failed to initialize background task service, skipping check');
        return BackgroundTaskResult.Failed;
      }
    }

    try {
      // Check if enough time has passed
      const lastExecution = await this.getLastExecutionTime(LAST_CHECK_KEY);
      const now = Date.now();
      const timeSinceLastExecution = lastExecution ? now - lastExecution : null;
      const shouldExecute = !lastExecution || timeSinceLastExecution! >= MIN_CHECK_INTERVAL;

      console.log('🔍 Plaid check task triggered', {
        lastExecution: lastExecution ? new Date(lastExecution).toISOString() : 'never',
        timeSinceLastExecution: timeSinceLastExecution
          ? `${Math.round(timeSinceLastExecution / (60 * 1000))} minutes`
          : 'never',
        minimumInterval: `${MIN_CHECK_INTERVAL / (60 * 60 * 1000)} hours`,
        shouldExecute,
      });

      if (!shouldExecute) {
        const timeRemaining = MIN_CHECK_INTERVAL - timeSinceLastExecution!;
        console.log(`⏭️  Check skipped: ${Math.round(timeRemaining / (60 * 1000))} minutes until next check`);
        return BackgroundTaskResult.Success;
      }

      console.log('🚀 Executing background plaid check...');

      // Refresh auth token before check to ensure we have valid credentials
      const tokenRefreshed = await this.refreshAuthToken();
      if (!tokenRefreshed) {
        console.warn('Failed to refresh auth token, attempting check anyway');
        // Continue anyway - the API call will fail with 401 if token is invalid
      }

      // Call the check endpoint (using Plaid checkForUpdates as default)
      if (!globalPlaidApi) {
        console.error('Plaid API not available after initialization');
        return BackgroundTaskResult.Failed;
      }
      console.log('Calling PlaidcheckForUpdates');
      await globalPlaidApi.plaidControllerCheckForUpdates();
      console.log('Plaid checkForUpdates completed');

      // Check for items behind on sync and refresh them (with rate limiting)
      await this.refreshItemsBehindOnSync();

      // Store execution time
      await this.setLastExecutionTime(LAST_CHECK_KEY, Date.now());

      console.log('Background check completed successfully');
      return BackgroundTaskResult.Success;
    } catch (error) {
      console.error('Background check failed:', error);
      return BackgroundTaskResult.Failed;
    }
  }

  /**
   * Refresh items that are behind on sync (background only, with rate limiting)
   */
  private static async refreshItemsBehindOnSync(): Promise<void> {
    try {
      // Query items from database
      const items = await database.get<Item>('items').query().fetch();

      // Filter items behind on sync (more than 4 hours since last local refresh)
      const itemsBehindOnSync = items.filter(item => {
        if (!item.lastLocalRefresh) return true; // Never refreshed locally
        return dayjs(item.lastLocalRefresh).isBefore(dayjs().subtract(4, 'hour'));
      });

      if (itemsBehindOnSync.length === 0) {
        console.log('✅ All items are up to date');
        return;
      }

      console.log(
        `⚠️  ${itemsBehindOnSync.length} items behind on sync:`,
        itemsBehindOnSync.map(item => ({
          name: item.institutionName,
          lastLocalRefresh: item.lastLocalRefresh,
          lastSuccessfulUpdate: item.lastSuccessfulUpdate,
        }))
      );

      // Import PlaidService dynamically to avoid circular dependencies
      const { PlaidService } = await import('@/services/plaid-service');

      if (!globalPlaidApi) {
        console.error('Plaid API not available for item refresh');
        return;
      }

      const plaidService = new PlaidService(globalPlaidApi, database);

      // Refresh items with rate limiting
      for (const item of itemsBehindOnSync) {
        const lastRefreshKey = `${LAST_ITEM_REFRESH_PREFIX}${item.id}`;
        const lastRefresh = await this.getLastExecutionTime(lastRefreshKey);
        const now = Date.now();

        // Check if enough time has passed since last refresh of this specific item
        if (lastRefresh && now - lastRefresh < MIN_ITEM_REFRESH_INTERVAL) {
          const timeRemaining = MIN_ITEM_REFRESH_INTERVAL - (now - lastRefresh);
          console.log(
            `⏭️  Skipping refresh for ${item.institutionName}: ` +
              `${Math.round(timeRemaining / (60 * 1000))} minutes until next refresh allowed`
          );
          continue;
        }

        console.log(`🔄 Refreshing item: ${item.institutionName}`);
        try {
          await plaidService.refeshItem(item.plaidItemId);
          await this.setLastExecutionTime(lastRefreshKey, now);
          console.log(`✅ Successfully refreshed: ${item.institutionName}`);
        } catch (error) {
          console.error(`❌ Failed to refresh ${item.institutionName}:`, error);
          // Continue with next item even if this one fails
        }
      }
    } catch (error) {
      console.error('Failed to refresh items behind on sync:', error);
      // Don't throw - we don't want to fail the entire check task
    }
  }

  /**
   * Get last execution time from storage (static method)
   */
  private static async getLastExecutionTime(key: string): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? Number.parseInt(value, 10) : null;
    } catch (error) {
      console.error(`Failed to get last execution time for ${key}:`, error);
      return null;
    }
  }

  /**
   * Store last execution time (static method)
   */
  private static async setLastExecutionTime(key: string, timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(key, timestamp.toString());
    } catch (error) {
      console.error(`Failed to store last execution time for ${key}:`, error);
    }
  }

  /**
   * Register background tasks
   */
  registerTasks() {
    // Define sync task (using static method for headless context)
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      console.log('📋 Background sync task executing...');
      const result = await BackgroundTaskService.executeSync();
      console.log('📋 Background sync task completed with result:', result);
      return result;
    });

    // Define check task (using static method for headless context)
    TaskManager.defineTask(BACKGROUND_PLAID_SYNC_TASK, async () => {
      console.log('📋 Background plaid check task executing...');
      const result = await BackgroundTaskService.executeCheck();
      console.log('📋 Background plaid check task completed with result:', result);
      return result;
    });

    console.log('✅ Background task definitions registered');
  }

  /**
   * Register background fetch for sync task (1 hour interval)
   */
  async registerSyncTask(): Promise<boolean> {
    try {
      console.log('🔧 Registering sync background task...');
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isRegistered) {
        console.log('✅ Sync task already registered');
        return true;
      }

      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 60, // 1 hour in minutes
      });

      console.log('✅ Sync background task registered with 60 minute interval');
      return true;
    } catch (error) {
      console.error('❌ Failed to register sync background task:', error);
      return false;
    }
  }

  /**
   * Register background fetch for check task (30 minute interval)
   */
  async registerCheckTask(): Promise<boolean> {
    try {
      console.log('🔧 Registering plaid check background task...');
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PLAID_SYNC_TASK);
      if (isRegistered) {
        console.log('✅ Plaid check task already registered');
        return true;
      }

      await BackgroundTask.registerTaskAsync(BACKGROUND_PLAID_SYNC_TASK, {
        minimumInterval: 30, // 30 minutes (minimum is 15 minutes)
      });

      console.log('✅ Plaid check background task registered with 30 minute interval');
      return true;
    } catch (error) {
      console.error('❌ Failed to register check background task:', error);
      return false;
    }
  }

  /**
   * Unregister all background tasks
   */
  async unregisterTasks(): Promise<void> {
    try {
      const syncRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (syncRegistered) {
        await TaskManager.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        console.log('Sync background task unregistered');
      }

      const checkRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PLAID_SYNC_TASK);
      if (checkRegistered) {
        await TaskManager.unregisterTaskAsync(BACKGROUND_PLAID_SYNC_TASK);
        console.log('Check background task unregistered');
      }
    } catch (error) {
      console.error('Failed to unregister background tasks:', error);
    }
  }

  /**
   * Manually trigger plaid check task (for testing)
   */
  async triggerPlaidCheck(): Promise<void> {
    console.log('🧪 Manually triggering plaid check...');
    await BackgroundTaskService.executeCheck();
  }

  /**
   * Get status of background tasks
   */
  async getTaskStatus(): Promise<{
    syncRegistered: boolean;
    checkRegistered: boolean;
    lastSyncTime: Date | null;
    lastCheckTime: Date | null;
  }> {
    const syncRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    const checkRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PLAID_SYNC_TASK);
    const lastSyncTimestamp = await BackgroundTaskService.getLastExecutionTime(LAST_SYNC_KEY);
    const lastCheckTimestamp = await BackgroundTaskService.getLastExecutionTime(LAST_CHECK_KEY);

    return {
      syncRegistered,
      checkRegistered,
      lastSyncTime: lastSyncTimestamp ? new Date(lastSyncTimestamp) : null,
      lastCheckTime: lastCheckTimestamp ? new Date(lastCheckTimestamp) : null,
    };
  }
}

// Export singleton instance
export const backgroundTaskService = new BackgroundTaskService();
