import { Auth } from "@/api/gen/Auth";
import { Categories } from "@/api/gen/Categories";
import { HttpClient } from "@/api/gen/http-client";
import { Plaid } from "@/api/gen/Plaid";
import { Users } from "@/api/gen/Users";
import { AxiosError, AxiosResponse } from "axios";
import { createContext, useContext, useMemo } from "react";
import { useAuth0 } from "react-native-auth0";
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DependencyContextType {
  authApi: Auth<{ accessToken?: string }>;
  categoryApi: Categories<{ accessToken?: string }>;
  plaidApi: Plaid<{ accessToken?: string }>;
  usersApi: Users<{ accessToken?: string }>;
  // Add new services here
  // newService: NewService;
}

export const DependencyContext = createContext<
  DependencyContextType | undefined
>(undefined);

function initializeDependencies(
  httpClient: HttpClient<{ accessToken?: string }>
) {
  const authApi = new Auth(httpClient);
  const categoryApi = new Categories(httpClient);
  const plaidApi = new Plaid(httpClient);
  const usersApi = new Users(httpClient);

  return {
    authApi,
    categoryApi,
    plaidApi,
    usersApi,
  };
}

export const DependencyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { getCredentials, clearSession, user } = useAuth0();

  const dependencies = useMemo(() => {
    const httpClient = new HttpClient<{ accessToken?: string }>({
      securityWorker: (securityData) => {
        if (securityData?.accessToken) {
          console.log("securityData", securityData);
          return {
            headers: {
              Authorization: `Bearer ${securityData.accessToken}`,
            },
          };
        }
        return {};
      },
      secure: true,
    });
    httpClient.instance.defaults.baseURL = API_URL;

    const setupInitialAuth = async () => {
      if (user) {
        try {
          const credentials = await getCredentials();

          console.log("credentials", credentials);
          if (credentials?.accessToken) {
            console.log("setting security data");
            httpClient.setSecurityData({
              accessToken: credentials.accessToken,
            });
          }
        } catch (error) {
          console.error("Error setting initial auth:", error);
        }
      } else {
        try {
          // await clearSession();
        } catch (error) {
          console.error("Error clearing session:", error);
        }
      }
    };

    httpClient.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const { response } = error;

        if (response?.status !== 401) {
          return Promise.reject(error);
        }

        try {
          const credentials = await getCredentials();

          if (credentials?.accessToken) {
            httpClient.setSecurityData({
              accessToken: credentials.accessToken,
            });
          } else {
            await clearSession();
            return Promise.reject(error);
          }
        } catch {
          await clearSession();
          return Promise.reject(error);
        }
      }
    );

    setupInitialAuth();

    return initializeDependencies(httpClient);
  }, [getCredentials, clearSession, user]);

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
