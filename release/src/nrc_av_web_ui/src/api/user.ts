import { publicClient } from 'config/axios/publicClient';
import { BASE_URL } from 'constants/config';
import { AddUserDTO, EditUserDTO, FilterUserParams, User, UserDTO, UserList } from 'dtos/user';
import { ApiResponse } from 'types/types';

const url = BASE_URL + '/user';

export const getMeUrl = `${url}/me`;

export const getMe = (): ApiResponse<UserDTO> => publicClient.get(getMeUrl);

export const addUser = (data: AddUserDTO) => publicClient.post('/user', data);

export const listUsers = (data?: FilterUserParams) =>
  publicClient.get<UserList>(`${url}/list`, { params: data });

export const deleteUser = (id: number) => publicClient.delete(`/user/${id}`);

export const updateUser = (payload: EditUserDTO) => {
  const { id, ...rest } = payload;
  return publicClient.put(`/user/${id}`, rest);
};

export const getUserById = (id: string) => publicClient.get<User>(`/user/${id}`);
