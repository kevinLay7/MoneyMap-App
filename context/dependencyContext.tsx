import { Auth } from '@/api/gen/Auth';
import { Categories } from '@/api/gen/Categories';
import { HttpClient } from '@/api/gen/http-client';
import { Plaid } from '@/api/gen/Plaid';
import { Sync } from '@/api/gen/Sync';
import { Users } from '@/api/gen/Users';
import { createContext, useContext, useMemo } from 'react';
import { useAuth0 } from 'react-native-auth0';
import { getDeviceClientId } from '@/utils/device-client-id';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DependencyContextType {
  authApi: Auth;
  categoryApi: Categories;
  plaidApi: Plaid;
  syncApi: Sync;
  usersApi: Users;
  categoryService: CateogryService;
  // Add new services here
  // newService: NewService;
}

export const DependencyContext = createContext<DependencyContextType | undefined>(undefined);

function initializeDependencies(httpClient: HttpClient<unknown>) {
  const authApi = new Auth(httpClient);
  const categoryApi = new Categories(httpClient);
  const plaidApi = new Plaid(httpClient);
  const syncApi = new Sync(httpClient);
  const usersApi = new Users(httpClient);

  return {
    authApi,
    categoryApi,
    plaidApi,
    syncApi,
    usersApi,
  };
}

export const DependencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { getCredentials, clearCredentials, user } = useAuth0();

  const dependencies = useMemo(() => {
    const httpClient = new HttpClient<unknown>();
    httpClient.instance.defaults.baseURL = API_URL;

    // Set up initial authorization header if user is authenticated
    const setupInitialAuth = async () => {
      try {
        const credentials = await getCredentials();
        if (credentials?.accessToken) {
          httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
        }
      } catch (error) {
        logger.error(LogType.Auth, 'Error setting up initial auth', { error });
        delete httpClient.instance.defaults.headers.common.Authorization;
      }
    };

    // Set up request interceptor to add x-client-id header for sync endpoints
    httpClient.instance.interceptors.request.use(
      async config => {
        // Only add x-client-id header for sync endpoints
        if (config.url && (config.url.includes('/sync/pull') || config.url.includes('/sync/push'))) {
          try {
            const clientId = await getDeviceClientId();
            config.headers['x-client-id'] = clientId;
          } catch (error) {
            logger.error(LogType.Auth, 'Failed to get device client ID', { error });
          }
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Set up request interceptor for automatic token refresh
    httpClient.instance.interceptors.response.use(
      response => response,
      async error => {
        const { response, config } = error;

        if (!response) {
          return Promise.reject(error);
        }

        if (response.status !== 401) {
          return Promise.reject(error);
        }

        // Prevent infinite retry loops - if this request has already been retried, reject immediately
        const retryCount = (config as any).__retryCount || 0;
        const MAX_RETRIES = 1;

        if (retryCount >= MAX_RETRIES) {
          logger.warn(LogType.Auth, `Max retries (${MAX_RETRIES}) reached for 401 response, clearing session`, {
            url: config.url,
            method: config.method,
          });
          // await clearCredentials();
          return Promise.reject(error);
        }

        // Mark this request as retried
        (config as any).__retryCount = retryCount + 1;

        try {
          const credentials = await getCredentials();

          if (credentials?.accessToken) {
            httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
            config.headers['Authorization'] = `Bearer ${credentials.accessToken}`;

            return httpClient.instance(config);
          } else {
            logger.warn(LogType.Auth, 'No credentials available during token refresh, clearing session');
            //wait clearCredentials();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          logger.error(LogType.Auth, 'Token refresh failed, clearing session', { error: refreshError });

          return Promise.reject(error);
        }
      }
    );

    // Set up initial auth header
    setupInitialAuth();

    const deps = initializeDependencies(httpClient);

    return deps;
  }, [getCredentials, clearCredentials, user]);

  // Note: We always initialize dependencies to allow create-profile to use APIs
  // Background syncing is prevented by checking profile in useBackgroundTasks hook

  return <DependencyContext.Provider value={dependencies}>{children}</DependencyContext.Provider>;
};

export const useDependency = () => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error('useDependency must be used within DependencyProvider');
  }
  return context;
};
