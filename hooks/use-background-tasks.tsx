import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDependency } from '@/context/dependencyContext';
import { backgroundTaskService, BackgroundTaskService } from '@/services/background-task-service';
import { useProfileCheck } from '@/hooks/use-profile-check';
import dayjs from 'dayjs';
import database from '@/model/database';
import Item from '@/model/models/item';

const FOREGROUND_SYNC_INTERVAL = 30 * 1000; // 30 seconds
const PUSH_ONLY_INTERVAL = 10 * 1000; // 10 seconds
const PLAID_CHECK_INTERVAL = 60 * 1000; // 1 minute

/**
 * Hook to manage background tasks and foreground polling
 * - Polls sync endpoint every 30 seconds when app is in foreground
 * - Polls plaid check every 1 minute when app is in foreground
 * - Registers background tasks for when app is in background/killed
 */
export function useBackgroundTasks() {
  const { syncApi, plaidApi } = useDependency();
  const { data: profileCheck, isLoading: isProfileCheckLoading } = useProfileCheck();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const plaidCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

  // Get accounts and items from the database and observe them
  const [items, setItems] = useState<Item[]>([]);

  // Don't initialize background tasks if:
  // - Profile check is still loading, OR
  // - User doesn't have a profile
  const shouldInitialize = !isProfileCheckLoading && profileCheck?.hasProfile === true;

  // Initialize background task service
  useEffect(() => {
    if (!shouldInitialize) {
      console.log('Skipping background task initialization: user profile not created yet');
      return;
    }

    if (!isInitializedRef.current) {
      backgroundTaskService
        .initialize({
          syncApi,
          plaidApi,
        })
        .catch(error => {
          console.error('Failed to initialize background task service:', error);
        });

      // Initialize Auth0 for background tasks (allows token retrieval in headless context)
      const auth0Domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
      const auth0ClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;

      if (auth0Domain && auth0ClientId) {
        backgroundTaskService.initializeAuth0(auth0Domain, auth0ClientId);
      } else {
        console.warn('Auth0 domain or clientId not found, background tasks may fail to authenticate');
      }

      // Register task definitions
      backgroundTaskService.registerTasks();

      // Register background fetch tasks (await to ensure they complete)
      Promise.all([
        backgroundTaskService.registerSyncTask().then(success => {
          if (success) {
            console.log('✅ Sync background task registered successfully');
          } else {
            console.error('❌ Failed to register sync background task');
          }
        }),
        backgroundTaskService.registerCheckTask().then(success => {
          if (success) {
            console.log('✅ Plaid check background task registered successfully');
          } else {
            console.error('❌ Failed to register plaid check background task');
          }
        }),
      ]).catch(error => {
        console.error('Failed to register background tasks:', error);
      });

      isInitializedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (pushIntervalRef.current) {
        clearInterval(pushIntervalRef.current);
        pushIntervalRef.current = null;
      }
      if (plaidCheckIntervalRef.current) {
        clearInterval(plaidCheckIntervalRef.current);
        plaidCheckIntervalRef.current = null;
      }
    };
  }, [syncApi, plaidApi, shouldInitialize]);

  // Observe items from database
  useEffect(() => {
    if (!shouldInitialize) {
      return;
    }

    const subscription = database
      .get<Item>('items')
      .query()
      .observe()
      .subscribe(results => {
        setItems(results);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [shouldInitialize]);

  /**
   * Execute sync operation (full sync: pull + push)
   */
  const executeSync = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping sync');
        return;
      }

      await BackgroundTaskService.executeSyncWithLock(syncApi);
    } catch (error) {
      console.error('Foreground sync failed:', error);
    }
  }, [syncApi]);

  /**
   * Execute push-only operation (push local changes without pulling)
   */
  const executePushOnly = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping push-only');
        return;
      }

      await BackgroundTaskService.executePushOnlyWithLock(syncApi);
    } catch (error) {
      console.error('Push-only sync failed:', error);
    }
  }, [syncApi]);

  /**
   * Execute plaid check operation
   */
  const executePlaidCheck = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping plaid check');
        return;
      }

      console.log('🔍 Foreground plaid check starting...');
      await plaidApi.plaidControllerCheckForUpdates();

      // Check if any items are behind on sync (more than 1 hour old)
      const itemsBehindOnSync = items.filter(item => {
        if (!item.lastSuccessfulUpdate) return true; // Never synced
        return dayjs(item.lastSuccessfulUpdate).isBefore(dayjs().subtract(1, 'hour'));
      });

      if (itemsBehindOnSync.length > 0) {
        console.log(
          `⚠️  ${itemsBehindOnSync.length} items behind on sync:`,
          itemsBehindOnSync.map(item => ({
            name: item.institutionName,
            lastSync: item.lastSuccessfulUpdate,
          }))
        );

        // Automatic refresh disabled to prevent UI blocking
        // The refresh was causing the app to freeze because it runs heavy
        // database/network operations on the main thread every minute.
        // The backend plaidControllerCheckForUpdates() already triggers syncs when needed.
        //
        // If manual refresh is needed, consider:
        // 1. Running refresh in background task only (not foreground)
        // 2. Adding rate limiting (max once per item per hour)
        // 3. Moving to a queue system for non-blocking execution
        // 4. Using InteractionManager.runAfterInteractions()
        //
        // Commented out code:
        // for (const item of itemsBehindOnSync) {
        //   await plaidService.refeshItem(item.plaidItemId);
        // }
      }

      console.log('✅ Foreground plaid check completed');
    } catch (error) {
      console.error('❌ Foreground plaid check failed:', error);
    }
  }, [plaidApi, items]);

  /**
   * Start foreground polling (30 second interval)
   */
  const startForegroundPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Execute sync immediately
    executeSync();

    // Set up interval for subsequent syncs
    intervalRef.current = setInterval(() => {
      executeSync();
    }, FOREGROUND_SYNC_INTERVAL);
  }, [executeSync]);

  /**
   * Stop foreground polling
   */
  const stopForegroundPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Start push-only polling (10 second interval)
   */
  const startPushOnlyPolling = useCallback(() => {
    // Clear any existing interval
    if (pushIntervalRef.current) {
      clearInterval(pushIntervalRef.current);
    }

    // Execute push-only immediately
    executePushOnly();

    // Set up interval for subsequent push-only syncs
    pushIntervalRef.current = setInterval(() => {
      executePushOnly();
    }, PUSH_ONLY_INTERVAL);
  }, [executePushOnly]);

  /**
   * Stop push-only polling
   */
  const stopPushOnlyPolling = useCallback(() => {
    if (pushIntervalRef.current) {
      clearInterval(pushIntervalRef.current);
      pushIntervalRef.current = null;
    }
  }, []);

  /**
   * Start plaid check polling (1 minute interval)
   */
  const startPlaidCheckPolling = useCallback(() => {
    // Clear any existing interval
    if (plaidCheckIntervalRef.current) {
      clearInterval(plaidCheckIntervalRef.current);
    }

    // Execute check immediately
    executePlaidCheck();

    // Set up interval for subsequent checks
    plaidCheckIntervalRef.current = setInterval(() => {
      executePlaidCheck();
    }, PLAID_CHECK_INTERVAL);
  }, [executePlaidCheck]);

  /**
   * Stop plaid check polling
   */
  const stopPlaidCheckPolling = useCallback(() => {
    if (plaidCheckIntervalRef.current) {
      clearInterval(plaidCheckIntervalRef.current);
      plaidCheckIntervalRef.current = null;
    }
  }, []);

  // Handle foreground polling and app state changes
  useEffect(() => {
    // Don't start polling if user doesn't have a profile
    if (!shouldInitialize) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isActive = nextAppState === 'active';

      // App became active - start all foreground polling
      if (!wasActive && isActive) {
        console.log('App became active, starting foreground polling, push-only polling, and plaid check polling');
        startForegroundPolling();
        startPushOnlyPolling();
        startPlaidCheckPolling();
      }

      // App went to background - stop all foreground polling
      if (wasActive && !isActive) {
        console.log('App went to background, stopping all foreground polling');
        stopForegroundPolling();
        stopPushOnlyPolling();
        stopPlaidCheckPolling();
      }

      appState.current = nextAppState;
    });

    // Start polling if app is already active
    if (appState.current === 'active') {
      startForegroundPolling();
      startPushOnlyPolling();
      startPlaidCheckPolling();
    }

    return () => {
      subscription.remove();
      stopForegroundPolling();
      stopPushOnlyPolling();
      stopPlaidCheckPolling();
    };
  }, [
    startForegroundPolling,
    stopForegroundPolling,
    startPushOnlyPolling,
    stopPushOnlyPolling,
    startPlaidCheckPolling,
    stopPlaidCheckPolling,
    shouldInitialize,
  ]);
}
