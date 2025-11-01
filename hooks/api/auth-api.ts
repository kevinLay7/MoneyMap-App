import { useDependency } from "@/context/dependencyContext";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";

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
      console.error("Login error:", errorMessage);
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
      console.error("Auth callback error:", errorMessage);
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
      console.error("Logout error:", errorMessage);
    },
  });
};

