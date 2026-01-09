import { useDependency } from "@/context/dependencyContext";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { logger } from "@/services/logging-service";
import { LogType } from "@/types/logging";

export const useLogin = () => {
  const { authApi } = useDependency();

  return useMutation({
    mutationFn: async () => {
      await authApi.authControllerLogin();
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to login";
      logger.error(LogType.Auth, "Login error", { errorMessage });
    },
  });
};

export const useAuthCallback = () => {
  const { authApi } = useDependency();

  return useMutation({
    mutationFn: async (query: {
      code: string;
      error: string;
      error_description: string;
    }) => {
      await authApi.authControllerCallback(query);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to process callback";
      logger.error(LogType.Auth, "Auth callback error", { errorMessage });
    },
  });
};

export const useLogout = () => {
  const { authApi } = useDependency();

  return useMutation({
    mutationFn: async () => {
      await authApi.authControllerLogout();
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to logout";
      logger.error(LogType.Auth, "Logout error", { errorMessage });
    },
  });
};
