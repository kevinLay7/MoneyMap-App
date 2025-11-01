import { CreateUserDto } from "@/api/gen/data-contracts";
import { useDependency } from "@/context/dependencyContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useCreateUser = () => {
  const { usersApi } = useDependency();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      await usersApi.userControllerCreateUser(data);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to create user";
      console.error("Create user error:", errorMessage);
    },
  });
};

export const useGetCurrentUser = () => {
  const { usersApi } = useDependency();

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await usersApi.userControllerGetCurrentUser();
      return response.data;
    },
    retry: 1,
  });
};
