import { publicClient } from 'config/axios/publicClient';
import { BASE_URL } from 'constants/config';
import { AddUserDTO, FilterUserParams, UserDTO, UserList } from 'dtos/user';
import { ApiResponse } from 'types/types';

const url = BASE_URL + '/user';

export const getMeUrl = `${url}/me`;

export const getMe = (): ApiResponse<UserDTO> => publicClient.get(getMeUrl);

export const addUser = (data: AddUserDTO) => publicClient.post('/user', data);

export const listUsers = (data?: FilterUserParams) =>
  publicClient.get<UserList>(`${url}/list`, { params: data });
