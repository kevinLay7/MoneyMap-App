import { Category } from "@/api/gen/data-contracts";
import { RequestParams } from "@/api/gen/http-client";
import { useDependency } from "@/context/dependencyContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { logger } from "@/services/logging-service";
import { LogType } from "@/types/logging";

export const useGetCategories = () => {
  const { categoryApi } = useDependency();

  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoryApi.categoriesControllerFindAll();
      return response.data;
    },
    retry: 1,
  });
};

export const useGetCategory = (id: string) => {
  const { categoryApi } = useDependency();

  return useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      const response = await categoryApi.categoriesControllerFindById(id);
      return response.data;
    },
    retry: 1,
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const { categoryApi } = useDependency();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RequestParams = {}) => {
      const response = await categoryApi.categoriesControllerCreate(params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to create category";
      logger.error(LogType.Api, "Create category error", { errorMessage });
    },
  });
};

export const useUpdateCategory = () => {
  const { categoryApi } = useDependency();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...params
    }: { id: string } & RequestParams) => {
      const response = await categoryApi.categoriesControllerUpdate(id, params);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category", variables.id] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to update category";
      logger.error(LogType.Api, "Update category error", { errorMessage });
    },
  });
};
