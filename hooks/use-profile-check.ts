import { useQuery } from '@tanstack/react-query';
import { useAuth0 } from 'react-native-auth0';
import { HttpClient } from '@/api/gen/http-client';
import { Users } from '@/api/gen/Users';
import { AxiosError } from 'axios';
import { encryptionCredentialsService } from '@/services/encryption-credentials-service';
import { logger } from '@/services/logging-service';
import { LogType } from '@/types/logging';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Hook to check if the current user has a profile on the server and encryption credentials locally.
 * Uses a minimal HttpClient to avoid circular dependency with DependencyContext.
 * Returns hasProfile=true if /users/self succeeds, false if it returns 401/404.
 * Returns hasEncryptionCredentials=true if both encryption key and salt exist in SecureStore.
 */
export function useProfileCheck() {
  const { user, getCredentials } = useAuth0();

  return useQuery({
    queryKey: ['profileCheck', user?.sub],
    queryFn: async () => {
      if (!user) {
        return { hasProfile: false, hasEncryptionCredentials: false };
      }

      // Check encryption credentials in parallel with profile check
      const [profileResult, hasEncryptionCredentials] = await Promise.all([
        (async () => {
          try {
            // Create a minimal HttpClient for this check
            const httpClient = new HttpClient<unknown>();
            httpClient.instance.defaults.baseURL = API_URL;

            // Get auth token
            const credentials = await getCredentials();
            if (!credentials?.accessToken) {
              return { hasProfile: false };
            }

            // Set authorization header
            httpClient.instance.defaults.headers.common.Authorization = `Bearer ${credentials.accessToken}`;

            // Create Users API instance
            const usersApi = new Users(httpClient);

            // Check if profile exists
            const response = await usersApi.userControllerGetCurrentUser();

            // If we get a successful response, user has a profile
            if (response.status === 200 && response.data) {
              return { hasProfile: true };
            }

            return { hasProfile: false };
          } catch (error) {
            // Handle 401, 404, or other errors as "no profile exists"
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 401 || axiosError.response?.status === 404) {
              return { hasProfile: false };
            }

            // For other errors, log and assume no profile
            logger.error(LogType.Auth, 'Error checking profile', { error });
            return { hasProfile: false };
          }
        })(),
        encryptionCredentialsService.hasCredentials(),
      ]);

      return {
        ...profileResult,
        hasEncryptionCredentials,
      };
    },
    enabled: !!user, // Only run when user is authenticated
    retry: 1, // Retry once if the request fails
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
