import { PublicTokenDto } from "@/api/gen/data-contracts";
import { useDependency } from "@/context/dependencyContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { logger } from "@/services/logging-service";
import { LogType } from "@/types/logging";

export const useCreateLinkToken = () => {
  const { plaidApi } = useDependency();

  return useMutation({
    mutationFn: async () => {
      const response = await plaidApi.plaidControllerCreateLinkToken();
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
        responseMessage || error.message || "Failed to create link token";
      logger.error(LogType.Plaid, "Create link token error", { errorMessage });
    },
  });
};

export const useExchangePublicToken = () => {
  const { plaidApi } = useDependency();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PublicTokenDto) => {
      const response = await plaidApi.plaidControllerExchangePublicToken(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaidItems"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to exchange public token";
      logger.error(LogType.Plaid, "Exchange public token error", {
        errorMessage,
      });
    },
  });
};

export const useGetPlaidItem = (plaidItemId: string) => {
  const { plaidApi } = useDependency();

  return useQuery({
    queryKey: ["plaidItem", plaidItemId],
    queryFn: async () => {
      const response = await plaidApi.plaidControllerGetPlaidItem(plaidItemId);
      return response.data;
    },
    retry: 1,
    enabled: !!plaidItemId,
  });
};

export const useGetPlaidAccounts = (plaidItemId: string) => {
  const { plaidApi } = useDependency();

  return useQuery({
    queryKey: ["plaidAccounts", plaidItemId],
    queryFn: async () => {
      const response = await plaidApi.plaidControllerGetAccounts(plaidItemId);
      return response.data;
    },
    retry: 1,
    enabled: !!plaidItemId,
  });
};

export const useGetPlaidTransactions = (
  plaidItemId: string,
  cursor: string
) => {
  const { plaidApi } = useDependency();

  return useQuery({
    queryKey: ["plaidTransactions", plaidItemId, cursor],
    queryFn: async () => {
      const response = await plaidApi.plaidControllerGetTransactions(
        plaidItemId,
        { cursor }
      );
      return response.data;
    },
    retry: 1,
    enabled: !!plaidItemId && !!cursor,
  });
};

export const useSyncPlaidAccounts = () => {
  const { plaidApi } = useDependency();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await plaidApi.plaidControllerSyncAccountsForPlaidItem();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaidItems"] });
      queryClient.invalidateQueries({ queryKey: ["plaidAccounts"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to sync accounts";
      logger.error(LogType.Plaid, "Sync accounts error", { errorMessage });
    },
  });
};

export const useHandlePlaidWebhook = () => {
  const { plaidApi } = useDependency();

  return useMutation({
    mutationFn: async () => {
      await plaidApi.plaidControllerHandleWebhook();
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage =
        responseMessage || error.message || "Failed to handle webhook";
      logger.error(LogType.Plaid, "Handle webhook error", { errorMessage });
    },
  });
};

export const useCheckPlaidUpdates = () => {
  const { plaidApi } = useDependency();

  return useQuery({
    queryKey: ["plaidUpdates"],
    queryFn: async () => {
      const response = await plaidApi.plaidControllerCheckForUpdates();
      return response.data;
    },
    retry: 1,
  });
};
