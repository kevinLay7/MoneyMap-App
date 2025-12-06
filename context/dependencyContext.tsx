import { Auth } from "@/api/gen/Auth";
import { Categories } from "@/api/gen/Categories";
import { HttpClient } from "@/api/gen/http-client";
import { Plaid } from "@/api/gen/Plaid";
import { Sync } from "@/api/gen/Sync";
import { Users } from "@/api/gen/Users";
import { AxiosError, AxiosResponse } from "axios";
import { createContext, useContext, useMemo } from "react";
import { useAuth0 } from "react-native-auth0";
import { getDeviceClientId } from "@/utils/device-client-id";
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DependencyContextType {
  authApi: Auth;
  categoryApi: Categories;
  plaidApi: Plaid;
  syncApi: Sync;
  usersApi: Users;
  // Add new services here
  // newService: NewService;
}

export const DependencyContext = createContext<
  DependencyContextType | undefined
>(undefined);

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

export const DependencyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { getCredentials, clearCredentials, user } = useAuth0();

  const dependencies = useMemo(() => {
    const httpClient = new HttpClient<unknown>();
    httpClient.instance.defaults.baseURL = API_URL;

    // Set up initial authorization header if user is authenticated
    const setupInitialAuth = async () => {
      if (user) {
        try {
          // logger.info('Setting up initial authentication for user', { userId: user.sub }, 'DependencyContext');
          const credentials = await getCredentials();
          if (credentials?.accessToken) {
            httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
            // logger.debug(
            //   'Authentication header set successfully',
            //   { hasToken: !!credentials.accessToken },
            //   'DependencyContext'
            // );
          }
        } catch (error) {
          console.error("error setting up initial auth", error);
          // logger.error(
          //   'Failed to get credentials during initial auth setup',
          //   { error: error instanceof Error ? error.message : String(error) },
          //   'DependencyContext'
          // );
        }
      } else {
        console.warn("clearing auth header");
        // Clear authorization header when user is not authenticated
        // logger.info('Clearing authentication header - no user', {}, 'DependencyContext');
        delete httpClient.instance.defaults.headers.common.Authorization;
      }
    };

    // Set up request interceptor to add x-client-id header for sync endpoints
    httpClient.instance.interceptors.request.use(
      async (config) => {
        // Only add x-client-id header for sync endpoints
        if (
          config.url &&
          (config.url.includes("/sync/pull") ||
            config.url.includes("/sync/push"))
        ) {
          try {
            const clientId = await getDeviceClientId();
            config.headers["x-client-id"] = clientId;
          } catch (error) {
            console.error("Failed to get device client ID:", error);
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Set up request interceptor for automatic token refresh
    httpClient.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { response, config } = error;

        if (response.status !== 401) {
          return Promise.reject(error);
        }

        console.log("received 401 response, attempting token refresh");
        // logger.warn(
        //   'Received 401 response, attempting token refresh',
        //   {
        //     url: config.url,
        //     method: config.method,
        //   },
        //   'DependencyContext'
        // );

        try {
          const credentials = await getCredentials();

          if (credentials?.accessToken) {
            httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;
            config.headers["Authorization"] =
              `Bearer ${credentials.accessToken}`;
            // logger.info(
            //   'Token refresh successful, retrying request',
            //   {
            //     url: config.url,
            //     method: config.method,
            //   },
            //   'DependencyContext'
            // );
            return httpClient.instance(config);
          } else {
            console.log(
              "no credentials available during token refresh, clearing session"
            );
            // logger.warn('No credentials available during token refresh, clearing session', {}, 'DependencyContext');
            await clearCredentials();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          console.error("token refresh failed, clearing session", refreshError);
          // logger.error(
          //   'Token refresh failed, clearing session',
          //   {
          //     error: refreshError instanceof Error ? refreshError.message : String(refreshError),
          //   },
          //   'DependencyContext'
          // );
          await clearCredentials();
          return Promise.reject(error);
        }
      }
    );

    // Set up initial auth header
    setupInitialAuth();

    const deps = initializeDependencies(httpClient);

    return deps;
  }, [getCredentials, clearCredentials, user]);

  console.log("credentials", user);

  return (
    <DependencyContext.Provider value={dependencies}>
      {children}
    </DependencyContext.Provider>
  );
};

export const useDependency = () => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error("useDependency must be used within DependencyProvider");
  }
  return context;
};
