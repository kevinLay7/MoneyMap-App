import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';
import { useDependency } from '@/context/dependencyContext';
import { backgroundTaskService, BackgroundTaskService } from '@/services/background-task-service';
import { useProfileCheck } from '@/hooks/use-profile-check';
import { PlaidService } from '@/services/plaid-service';
import dayjs from 'dayjs';
import database from '@/model/database';
import Item from '@/model/models/item';

const FOREGROUND_SYNC_INTERVAL = 30 * 1000; // 30 seconds
const PUSH_ONLY_INTERVAL = 10 * 1000; // 10 seconds
const PLAID_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_ITEM_THRESHOLD_HOURS = 12; // Items older than this are considered stale

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
   * Wraps an async operation to run after user interactions complete.
   * This prevents sync from blocking animations and touch responses.
   */
  const runAfterInteractions = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(() => {
        operation().then(resolve).catch(reject);
      });
    });
  }, []);

  /**
   * Execute sync operation (full sync: pull + push)
   * Deferred until after user interactions complete.
   */
  const executeSync = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping sync');
        return;
      }

      // Defer sync to run after animations/interactions complete
      await runAfterInteractions(() => BackgroundTaskService.executeSyncWithLock(syncApi));
    } catch (error) {
      console.error('Foreground sync failed:', error);
    }
  }, [syncApi, runAfterInteractions]);

  /**
   * Execute push-only operation (push local changes without pulling)
   * Deferred until after user interactions complete.
   */
  const executePushOnly = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping push-only');
        return;
      }

      // Defer push to run after animations/interactions complete
      await runAfterInteractions(() => BackgroundTaskService.executePushOnlyWithLock(syncApi));
    } catch (error) {
      console.error('Push-only sync failed:', error);
    }
  }, [syncApi, runAfterInteractions]);

  /**
   * Execute plaid check operation
   * Deferred until after user interactions complete.
   */
  const executePlaidCheck = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping plaid check');
        return;
      }

      // Defer to run after interactions complete
      await runAfterInteractions(async () => {
        console.log('🔍 Foreground plaid check starting...');
        await plaidApi.plaidControllerCheckForUpdates();

        // Check if any items are stale (haven't been locally refreshed within threshold)
        const staleItems = items.filter(item => {
          if (!item.lastLocalRefresh) return true; // Never refreshed locally
          return dayjs(item.lastLocalRefresh).isBefore(dayjs().subtract(STALE_ITEM_THRESHOLD_HOURS, 'hour'));
        });

        if (staleItems.length > 0) {
          console.log(
            `⚠️  ${staleItems.length} stale items (>${STALE_ITEM_THRESHOLD_HOURS}h since last local refresh):`,
            staleItems.map(item => ({
              name: item.institutionName,
              lastLocalRefresh: item.lastLocalRefresh,
              lastSuccessfulUpdate: item.lastSuccessfulUpdate,
            }))
          );

          // Fire-and-forget: refresh stale items from Plaid (fetches accounts + transactions)
          // This runs asynchronously without blocking the current check
          Promise.resolve().then(async () => {
            const plaidService = new PlaidService(plaidApi, database);

            for (const item of staleItems) {
              try {
                console.log(`🔄 Refreshing stale item: ${item.institutionName}`);
                await plaidService.refeshItem(item.plaidItemId);
                console.log(`✅ Successfully refreshed: ${item.institutionName}`);
              } catch (error) {
                console.error(`❌ Failed to refresh ${item.institutionName}:`, error);
                // Continue with next item even if this one fails
              }
            }
          });
        }

        console.log('✅ Foreground plaid check completed');
      });
    } catch (error) {
      console.error('❌ Foreground plaid check failed:', error);
    }
  }, [plaidApi, items, runAfterInteractions]);

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
