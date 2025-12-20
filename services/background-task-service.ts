import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Sync } from '@/api/gen/Sync';
import { Plaid } from '@/api/gen/Plaid';
import { HttpClient } from '@/api/gen/http-client';
import { databaseSynchronize } from '@/model/synchronize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Auth0 from 'react-native-auth0';
import { getDeviceClientId } from '@/utils/device-client-id';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';

// Task names
export const BACKGROUND_SYNC_TASK = 'background-sync';
export const BACKGROUND_CHECK_TASK = 'background-check';

// Storage keys
const LAST_SYNC_KEY = 'last_background_sync';
const LAST_CHECK_KEY = 'last_background_check';
const API_URL_KEY = 'background_task_api_url';

// Minimum time between executions (in milliseconds) to prevent duplicate calls
const MIN_SYNC_INTERVAL = 25 * 1000; // 25 seconds (less than 30s to allow for foreground polling)
const MIN_CHECK_INTERVAL = 3.5 * 60 * 60 * 1000; // 3.5 hours (less than 4h to allow for scheduled checks)

interface BackgroundTaskServiceConfig {
  syncApi: Sync;
  plaidApi: Plaid;
}

// Global state for background tasks (accessible from headless context)
let globalSyncApi: Sync | null = null;
let globalPlaidApi: Plaid | null = null;
let globalInitialized = false;
let syncInProgress = false; // Lock to prevent concurrent syncs
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
   * Execute sync with lock to prevent concurrent calls
   */
  static async executeSyncWithLock(syncApi: Sync): Promise<void> {
    const logger = new SyncLogger(1000);

    // Check if sync is already in progress
    if (syncInProgress) {
      console.log('Sync already in progress, skipping');
      return;
    }

    syncInProgress = true;
    try {
      await databaseSynchronize(syncApi, logger);
    } finally {
      console.log('--------------------------------');
      console.log(logger.logs);
      console.log('--------------------------------');
      syncInProgress = false;
    }
  }

  /**
   * Execute sync task (static method for headless context)
   */
  private static async executeSync(): Promise<BackgroundFetch.BackgroundFetchResult> {
    // Try to initialize if not already initialized (headless context)
    if (!globalInitialized || !globalSyncApi) {
      console.log('Background task service not initialized, attempting to initialize in headless context...');
      const initialized = await this.initializeInHeadlessContext();
      if (!initialized) {
        console.warn('Failed to initialize background task service, skipping sync');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }

    try {
      // Check if sync is already in progress
      if (syncInProgress) {
        console.log('Sync already in progress, skipping background sync');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Check if enough time has passed
      const lastExecution = await this.getLastExecutionTime(LAST_SYNC_KEY);
      const shouldExecute = !lastExecution || Date.now() - lastExecution >= MIN_SYNC_INTERVAL;

      if (!shouldExecute) {
        console.log('Sync skipped: too soon since last execution');
        return BackgroundFetch.BackgroundFetchResult.NoData;
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
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
      await this.executeSyncWithLock(globalSyncApi);

      // Store execution time
      await this.setLastExecutionTime(LAST_SYNC_KEY, Date.now());

      console.log('Background sync completed successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background sync failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }

  /**
   * Execute check task (static method for headless context)
   */
  private static async executeCheck(): Promise<BackgroundFetch.BackgroundFetchResult> {
    // Try to initialize if not already initialized (headless context)
    if (!globalInitialized || !globalPlaidApi) {
      console.log('Background task service not initialized, attempting to initialize in headless context...');
      const initialized = await this.initializeInHeadlessContext();
      if (!initialized) {
        console.warn('Failed to initialize background task service, skipping check');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }

    try {
      // Check if enough time has passed
      const lastExecution = await this.getLastExecutionTime(LAST_CHECK_KEY);
      const shouldExecute = !lastExecution || Date.now() - lastExecution >= MIN_CHECK_INTERVAL;

      if (!shouldExecute) {
        console.log('Check skipped: too soon since last execution');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      console.log('Executing background check...');

      // Refresh auth token before check to ensure we have valid credentials
      const tokenRefreshed = await this.refreshAuthToken();
      if (!tokenRefreshed) {
        console.warn('Failed to refresh auth token, attempting check anyway');
        // Continue anyway - the API call will fail with 401 if token is invalid
      }

      // Call the check endpoint (using Plaid checkForUpdates as default)
      if (!globalPlaidApi) {
        console.error('Plaid API not available after initialization');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
      await globalPlaidApi.plaidControllerCheckForUpdates();

      // Store execution time
      await this.setLastExecutionTime(LAST_CHECK_KEY, Date.now());

      console.log('Background check completed successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background check failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
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
      return await BackgroundTaskService.executeSync();
    });

    // Define check task (using static method for headless context)
    TaskManager.defineTask(BACKGROUND_CHECK_TASK, async () => {
      return await BackgroundTaskService.executeCheck();
    });
  }

  /**
   * Register background fetch for sync task (1 hour interval)
   */
  async registerSyncTask(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isRegistered) {
        console.log('Sync task already registered');
        return true;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 60 * 60, // 1 hour in seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Sync background task registered');
      return true;
    } catch (error) {
      console.error('Failed to register sync background task:', error);
      return false;
    }
  }

  /**
   * Register background fetch for check task (4 hour interval)
   */
  async registerCheckTask(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_CHECK_TASK);
      if (isRegistered) {
        console.log('Check task already registered');
        return true;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_CHECK_TASK, {
        minimumInterval: 4 * 60 * 60, // 4 hours in seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Check background task registered');
      return true;
    } catch (error) {
      console.error('Failed to register check background task:', error);
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
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        console.log('Sync background task unregistered');
      }

      const checkRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_CHECK_TASK);
      if (checkRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_CHECK_TASK);
        console.log('Check background task unregistered');
      }
    } catch (error) {
      console.error('Failed to unregister background tasks:', error);
    }
  }
}

// Export singleton instance
export const backgroundTaskService = new BackgroundTaskService();
