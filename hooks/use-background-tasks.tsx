import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDependency } from '@/context/dependencyContext';
import { backgroundTaskService, BackgroundTaskService } from '@/services/background-task-service';
import { useProfileCheck } from '@/hooks/use-profile-check';

const FOREGROUND_SYNC_INTERVAL = 30 * 1000; // 30 seconds
const PUSH_ONLY_INTERVAL = 10 * 1000; // 10 seconds

/**
 * Hook to manage background tasks and foreground polling
 * - Polls sync endpoint every 30 seconds when app is in foreground
 * - Registers background tasks for when app is in background/killed
 */
export function useBackgroundTasks() {
  const { syncApi, plaidApi } = useDependency();
  const { data: profileCheck, isLoading: isProfileCheckLoading } = useProfileCheck();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

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
      if (pushIntervalRef.current) {
        clearInterval(pushIntervalRef.current);
        pushIntervalRef.current = null;
      }
    };
  }, [syncApi, plaidApi, shouldInitialize]);

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

  // Handle foreground polling and app state changes
  useEffect(() => {
    // Don't start polling if user doesn't have a profile
    if (!shouldInitialize) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isActive = nextAppState === 'active';

      // App became active - start foreground polling and push-only polling
      if (!wasActive && isActive) {
        console.log('App became active, starting foreground polling and push-only polling');
        startForegroundPolling();
        startPushOnlyPolling();
      }

      // App went to background - stop foreground polling and push-only polling
      if (wasActive && !isActive) {
        console.log('App went to background, stopping foreground polling and push-only polling');
        stopForegroundPolling();
        stopPushOnlyPolling();
      }

      appState.current = nextAppState;
    });

    // Start polling if app is already active
    if (appState.current === 'active') {
      startForegroundPolling();
      startPushOnlyPolling();
    }

    return () => {
      subscription.remove();
      stopForegroundPolling();
      stopPushOnlyPolling();
    };
  }, [startForegroundPolling, stopForegroundPolling, startPushOnlyPolling, stopPushOnlyPolling, shouldInitialize]);
}
