import { CreateUserDto, UserResponseDto } from '@/api/gen/data-contracts';
import { Users } from '@/api/gen/Users';
import { useDependency } from '@/context/dependencyContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export const useCreateUser = () => {
  const { usersApi } = useDependency();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await usersApi.userControllerCreateUser(data);
      if (response.status !== 201) {
        throw new Error('Failed to create user', { cause: response.data });
      }
      return response.data as UserResponseDto;
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const responseMessage =
        error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
          ? error.response.data.message
          : null;
      const errorMessage = responseMessage || error.message || 'Failed to create user';
      console.error('Create user error:', errorMessage);
    },
  });
};

export const useGetCurrentUser = () => {
  const { usersApi } = useDependency();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await usersApi.userControllerGetCurrentUser();
      return response.data;
    },
    retry: 1,
  });
};
