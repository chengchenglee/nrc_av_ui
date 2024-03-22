import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addUser, listUsers } from 'api/user';
import { USERS } from 'constants/query';
import { FilterUserParams } from 'dtos/user';

export const useAddUser = () => {
  const queryClient = useQueryClient();
  return useMutation((data: any) => addUser(data), {
    onSuccess: () => queryClient.invalidateQueries([USERS])
  });
};

export const useGetListUsers = (filter?: FilterUserParams) =>
  useQuery([USERS, filter], () => listUsers(filter), { select: (res) => res.data });
