import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDependency } from '@/context/dependencyContext';
import { backgroundTaskService } from '@/services/background-task-service';
import { syncOrchestrator } from '@/services/sync-orchestrator';
import { useProfileCheck } from '@/hooks/use-profile-check';

/**
 * Hook to manage background sync and foreground polling.
 *
 * Foreground mode (via SyncOrchestrator):
 * - Full sync every 60s
 * - Debounced push 3s after local DB writes
 * - Plaid check every 12h (fallback for missed webhooks)
 *
 * Background mode (via BackgroundTaskService):
 * - OS-scheduled sync via expo-background-task
 */
export function useBackgroundTasks() {
  const { syncApi, plaidApi } = useDependency();
  const { data: profileCheck, isLoading: isProfileCheckLoading } = useProfileCheck();
  const appState = useRef(AppState.currentState);
  const isInitializedRef = useRef(false);

  // Don't initialize if user doesn't have a profile
  const shouldInitialize = !isProfileCheckLoading && profileCheck?.hasProfile === true;

  // Initialize services
  useEffect(() => {
    if (!shouldInitialize) {
      console.log('Skipping background task initialization: user profile not created yet');
      return;
    }

    if (isInitializedRef.current) {
      return;
    }

    const initializeServices = async () => {
      try {
        // Initialize SyncOrchestrator (foreground sync scheduling)
        syncOrchestrator.initialize({ syncApi, plaidApi });

        // Initialize BackgroundTaskService (OS background tasks)
        await backgroundTaskService.initialize({ syncApi, plaidApi });

        // Initialize Auth0 for headless context
        const auth0Domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
        const auth0ClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;

        if (auth0Domain && auth0ClientId) {
          backgroundTaskService.initializeAuth0(auth0Domain, auth0ClientId);
        } else {
          console.warn('Auth0 credentials not found, background tasks may fail');
        }

        // Register background task definitions
        backgroundTaskService.registerTasks();

        // Register with OS for background fetch
        const registered = await backgroundTaskService.registerBackgroundFetch();
        if (registered) {
          console.log('✅ Background fetch registered');
        } else {
          console.error('❌ Failed to register background fetch');
        }

        isInitializedRef.current = true;

        // Start foreground mode if app is already active
        if (appState.current === 'active') {
          syncOrchestrator.startForeground();
        }
      } catch (error) {
        console.error('Failed to initialize sync services:', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      syncOrchestrator.stopForeground();
    };
  }, [syncApi, plaidApi, shouldInitialize]);

  // Handle app state changes
  useEffect(() => {
    if (!shouldInitialize) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isActive = nextAppState === 'active';

      // App became active - start foreground sync
      if (!wasActive && isActive) {
        console.log('📱 App active, starting foreground sync');
        syncOrchestrator.startForeground();
      }

      // App went to background - stop foreground sync
      if (wasActive && !isActive) {
        console.log('📱 App inactive, stopping foreground sync');
        syncOrchestrator.stopForeground();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [shouldInitialize]);
}
