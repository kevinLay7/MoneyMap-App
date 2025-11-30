import { PullChangesDto, PushChangesDto } from "@/api/gen/data-contracts";
import { useDependency } from "@/context/dependencyContext";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";

export interface PullChangesResponse {
  changes: Record<
    string,
    {
      created?: any[];
      updated?: any[];
      deleted?: any[];
    }
  >;
  timestamp: number;
}

export const usePullChanges = () => {
  const { syncApi } = useDependency();

  return useMutation({
    mutationFn: async (data: PullChangesDto) => {
      const response = await syncApi.syncControllerPullChanges(data);
      return response.data;
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to pull changes";
      console.error("Pull changes error:", errorMessage);
    },
  });
};

export const usePushChanges = () => {
  const { syncApi } = useDependency();

  return useMutation({
    mutationFn: async (data: PushChangesDto) => {
      await syncApi.syncControllerPushChanges(data);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to push changes";
      console.error("Push changes error:", errorMessage);
    },
  });
};

