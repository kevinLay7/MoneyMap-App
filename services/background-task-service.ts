import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { BackgroundTaskResult } from 'expo-background-task';
import { Sync } from '@/api/gen/Sync';
import { Plaid } from '@/api/gen/Plaid';
import { HttpClient } from '@/api/gen/http-client';
import { databaseSynchronize } from '@/model/synchronize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Auth0 from 'react-native-auth0';
import { getDeviceClientId } from '@/utils/device-client-id';
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger';
import dayjs from 'dayjs';
import database from '@/model/database';
import Item from '@/model/models/item';
import { PlaidService } from './plaid-service';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

// Task name - single unified background task
export const BACKGROUND_SYNC_TASK = 'background-sync';

// Storage keys
const LAST_SYNC_KEY = 'last_background_sync';
const API_URL_KEY = 'background_task_api_url';

// Stale item threshold (unified to 12 hours)
const STALE_ITEM_THRESHOLD_HOURS = 12;

// Lock timeout
const SYNC_LOCK_TIMEOUT = 60 * 1000; // 60 seconds

interface BackgroundTaskServiceConfig {
  syncApi: Sync;
  plaidApi: Plaid;
}

// Global state for background tasks (accessible from headless context)
let globalSyncApi: Sync | null = null;
let globalPlaidApi: Plaid | null = null;
let globalInitialized = false;
let syncInProgress = false;
let syncLockAcquiredAt: number | null = null;
let auth0Instance: Auth0 | null = null;

/**
 * BackgroundTaskService - Handles OS-level background task registration and execution.
 *
 * This service is focused solely on:
 * - Registering background tasks with expo-background-task
 * - Executing sync when the OS wakes the app in the background
 * - Headless context initialization (when app is not running)
 *
 * Foreground sync scheduling is handled by SyncOrchestrator.
 */
export class BackgroundTaskService {
  /**
   * Initialize with API clients (called when app starts).
   */
  async initialize(config: BackgroundTaskServiceConfig): Promise<void> {
    globalSyncApi = config.syncApi;
    globalPlaidApi = config.plaidApi;
    globalInitialized = true;

    // Store API URL for headless context
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        await AsyncStorage.setItem(API_URL_KEY, apiUrl);
      } catch (error) {
        logger.error(LogType.Background, 'Failed to store API URL', { error });
      }
    }
  }

  /**
   * Initialize Auth0 for background tasks (credential retrieval in headless context).
   */
  initializeAuth0(domain: string, clientId: string): void {
    try {
      auth0Instance = new Auth0({ domain, clientId });
      logger.info(LogType.Background, 'Auth0 initialized for background tasks');
    } catch (error) {
      logger.error(LogType.Background, 'Failed to initialize Auth0 for background tasks', { error });
    }
  }

  /**
   * Check if service is initialized.
   */
  isInitialized(): boolean {
    return globalInitialized && globalSyncApi !== null && globalPlaidApi !== null;
  }

  /**
   * Initialize in headless context (when app was killed).
   */
  private static async initializeInHeadlessContext(): Promise<boolean> {
    if (!auth0Instance) {
      logger.warn(LogType.Background, 'Auth0 not initialized, cannot init headless context');
      return false;
    }

    try {
      const apiUrl = (await AsyncStorage.getItem(API_URL_KEY)) || process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        logger.warn(LogType.Background, 'API URL not available');
        return false;
      }

      const credentials = await auth0Instance.credentialsManager.getCredentials();
      if (!credentials?.accessToken) {
        logger.warn(LogType.Background, 'No access token available');
        return false;
      }

      const httpClient = new HttpClient<unknown>();
      httpClient.instance.defaults.baseURL = apiUrl;
      httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;

      httpClient.instance.interceptors.request.use(
        async config => {
          if (config.url && (config.url.includes('/sync/pull') || config.url.includes('/sync/push'))) {
            try {
              const clientId = await getDeviceClientId();
              config.headers['x-client-id'] = clientId;
            } catch (error) {
              logger.error(LogType.Background, 'Failed to get device client ID', { error });
            }
          }
          return config;
        },
        error => Promise.reject(error)
      );

      globalSyncApi = new Sync(httpClient);
      globalPlaidApi = new Plaid(httpClient);
      globalInitialized = true;

      logger.info(LogType.Background, 'Background task service initialized in headless context');
      return true;
    } catch (error) {
      logger.error(LogType.Background, 'Failed to initialize headless context', { error });
      return false;
    }
  }

  /**
   * Refresh auth token for API clients.
   */
  private static async refreshAuthToken(): Promise<boolean> {
    if (!auth0Instance) return false;

    try {
      const credentials = await auth0Instance.credentialsManager.getCredentials();
      if (!credentials?.accessToken) return false;

      if (globalSyncApi) {
        globalSyncApi.http.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
      }
      if (globalPlaidApi) {
        globalPlaidApi.http.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
      }

      return true;
    } catch (error) {
      logger.error(LogType.Background, 'Failed to refresh auth token', { error });
      return false;
    }
  }

  /**
   * Acquire sync lock.
   */
  private static acquireSyncLock(): boolean {
    const now = Date.now();

    // Check for stale lock
    if (syncInProgress && syncLockAcquiredAt) {
      const lockHeldFor = now - syncLockAcquiredAt;
      if (lockHeldFor > SYNC_LOCK_TIMEOUT) {
        logger.warn(
          LogType.Background,
          `Sync lock stale (held ${Math.round(lockHeldFor / 1000)}s), releasing`
        );
        this.releaseSyncLock();
      }
    }

    if (syncInProgress) return false;

    syncInProgress = true;
    syncLockAcquiredAt = now;
    return true;
  }

  /**
   * Release sync lock.
   */
  private static releaseSyncLock(): void {
    syncInProgress = false;
    syncLockAcquiredAt = null;
  }

  /**
   * Execute background sync task (called by OS).
   * Performs full sync + checks for stale Plaid items.
   */
  private static async executeBackgroundSync(): Promise<BackgroundTaskResult> {
    // Initialize if needed (headless context)
    if (!globalInitialized || !globalSyncApi) {
      logger.info(LogType.Background, 'Initializing in headless context');
      const initialized = await this.initializeInHeadlessContext();
      if (!initialized) {
        logger.warn(LogType.Background, 'Headless init failed, skipping background sync');
        return BackgroundTaskResult.Failed;
      }
    }

    // Acquire lock
    if (!this.acquireSyncLock()) {
      logger.info(LogType.Background, 'Sync in progress, skipping background sync');
      return BackgroundTaskResult.Success;
    }

    try {
      // Refresh auth token
      await this.refreshAuthToken();

      // Execute full sync
      const syncLogger = new SyncLogger(1000);
      await databaseSynchronize(globalSyncApi!, syncLogger);

      // Store execution time
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      // Check for stale Plaid items
      await this.checkAndRefreshStaleItems();

      return BackgroundTaskResult.Success;
    } catch (error) {
      logger.error(LogType.Background, 'Background sync failed', { error });
      return BackgroundTaskResult.Failed;
    } finally {
      this.releaseSyncLock();
    }
  }

  /**
   * Check for stale Plaid items and refresh them (12h threshold).
   */
  private static async checkAndRefreshStaleItems(): Promise<void> {
    if (!globalPlaidApi) return;

    try {
      const items = await database.get<Item>('items').query().fetch();

      const staleItems = items.filter(item => {
        if (!item.lastLocalRefresh) return true;
        return dayjs(item.lastLocalRefresh).isBefore(dayjs().subtract(STALE_ITEM_THRESHOLD_HOURS, 'hour'));
      });

      if (staleItems.length === 0) {
        logger.info(LogType.Background, 'All Plaid items up to date');
        return;
      }

      logger.warn(LogType.Background, `${staleItems.length} stale items found`);

      // Trigger backend webhook check first
      try {
        await globalPlaidApi.plaidControllerCheckForUpdates();
      } catch (error) {
        logger.error(LogType.Background, 'Plaid checkForUpdates failed', { error });
      }

      // Refresh stale items
      const plaidService = new PlaidService(globalPlaidApi, database);

      for (const item of staleItems) {
        try {
          logger.info(LogType.Background, `Refreshing: ${item.institutionName}`);
          await plaidService.refeshItem(item.plaidItemId);
          logger.info(LogType.Background, `Refreshed: ${item.institutionName}`);
        } catch (error) {
          logger.error(LogType.Background, `Failed to refresh ${item.institutionName}`, { error });
        }
      }
    } catch (error) {
      logger.error(LogType.Background, 'Stale item check failed', { error });
    }
  }

  /**
   * Register background task definitions with expo-task-manager.
   * Must be called at app startup (outside of React components).
   */
  registerTasks(): void {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      logger.info(LogType.Background, 'Background sync task triggered by OS');
      const result = await BackgroundTaskService.executeBackgroundSync();
      logger.info(LogType.Background, 'Background sync task completed', { result });
      return result;
    });

    logger.info(LogType.Background, 'Background task definitions registered');
  }

  /**
   * Register background fetch with expo-background-task.
   * iOS BGAppRefreshTask will call our task periodically.
   */
  async registerBackgroundFetch(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isRegistered) {
        logger.info(LogType.Background, 'Background task already registered');
        return true;
      }

      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 60, // 60 minutes (iOS may run less frequently)
      });

      logger.info(LogType.Background, 'Background task registered with 60 minute interval');
      return true;
    } catch (error) {
      logger.error(LogType.Background, 'Failed to register background task', { error });
      return false;
    }
  }

  /**
   * Unregister background tasks.
   */
  async unregisterTasks(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isRegistered) {
        await TaskManager.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        logger.info(LogType.Background, 'Background task unregistered');
      }
    } catch (error) {
      logger.error(LogType.Background, 'Failed to unregister background task', { error });
    }
  }

  /**
   * Get background task status.
   */
  async getTaskStatus(): Promise<{
    registered: boolean;
    lastSyncTime: Date | null;
  }> {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSyncTime = lastSyncStr ? new Date(parseInt(lastSyncStr, 10)) : null;

    return { registered, lastSyncTime };
  }

  /**
   * Manually trigger background sync (for testing).
   */
  async triggerManualSync(): Promise<void> {
    logger.info(LogType.Background, 'Manually triggering background sync');
    await BackgroundTaskService.executeBackgroundSync();
  }
}

// Export singleton
export const backgroundTaskService = new BackgroundTaskService();
