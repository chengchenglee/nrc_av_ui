import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { isAxiosError } from 'axios';
import { addUser, deleteUser, getUserById, listUsers, updateUser } from 'api/user';
import { USER, USERS } from 'constants/query';
import { EditUserErrorResponse, FilterUserParams } from 'dtos/user';

export const useAddUser = () => {
  const queryClient = useQueryClient();
  return useMutation(addUser, {
    onSuccess: () => queryClient.invalidateQueries([USERS])
  });
};

export const useGetListUsers = (filter?: FilterUserParams) =>
  useQuery([USERS, filter], () => listUsers(filter), { select: (res) => res.data });

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation(deleteUser, {
    onSuccess: () => {
      queryClient.invalidateQueries([USERS]);
      message.success('Delete user success');
    },
    onError: () => message.error('Failed to delete user')
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation(updateUser, {
    onSuccess: () => {
      queryClient.invalidateQueries([USERS]);
      message.success('Update user success');
    },
    onError: (err) => {
      if (isAxiosError<EditUserErrorResponse>(err) && err.response) {
        Object.keys(err.response.data).forEach((key) => {
          if (key === 'statusCode') {
            return;
          }
          message.error(err.response?.data[key as keyof EditUserErrorResponse]);
        });
      } else {
        message.error('Failed to update user!');
      }
    }
  });
};

export const useGetUserById = (id: string | null) =>
  useQuery(
    [USER, id],
    () => {
      if (!id) {
        return Promise.reject('Invalid user id');
      }
      return getUserById(id);
    },
    { select: (res) => res.data }
  );
