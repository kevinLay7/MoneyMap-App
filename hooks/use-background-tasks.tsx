import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDependency } from '@/context/dependencyContext';
import { backgroundTaskService, BackgroundTaskService } from '@/services/background-task-service';

const FOREGROUND_SYNC_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Hook to manage background tasks and foreground polling
 * - Polls sync endpoint every 30 seconds when app is in foreground
 * - Registers background tasks for when app is in background/killed
 */
export function useBackgroundTasks() {
  const { syncApi, plaidApi } = useDependency();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize background task service
  useEffect(() => {
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

      // Register background fetch tasks
      backgroundTaskService.registerSyncTask();
      backgroundTaskService.registerCheckTask();

      isInitializedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [syncApi, plaidApi]);

  /**
   * Execute sync operation
   */
  const executeSync = useCallback(async () => {
    try {
      if (!backgroundTaskService.isInitialized()) {
        console.warn('Background task service not initialized, skipping sync');
        return;
      }

      console.log('Executing foreground sync...');
      await BackgroundTaskService.executeSyncWithLock(syncApi);
      console.log('Foreground sync completed successfully');
    } catch (error) {
      console.error('Foreground sync failed:', error);
    }
  }, [syncApi]);

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

  // Handle foreground polling and app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isActive = nextAppState === 'active';

      // App became active - start foreground polling
      if (!wasActive && isActive) {
        console.log('App became active, starting foreground polling');
        startForegroundPolling();
      }

      // App went to background - stop foreground polling
      if (wasActive && !isActive) {
        console.log('App went to background, stopping foreground polling');
        stopForegroundPolling();
      }

      appState.current = nextAppState;
    });

    // Start polling if app is already active
    if (appState.current === 'active') {
      startForegroundPolling();
    }

    return () => {
      subscription.remove();
      stopForegroundPolling();
    };
  }, [startForegroundPolling, stopForegroundPolling]);
}
