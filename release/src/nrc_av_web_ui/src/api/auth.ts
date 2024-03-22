import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ChangePasswordDTO, LoginDTO } from '../dtos/auth';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/auth';

export const login = (loginDTO: LoginDTO): ApiResponse<string> =>
  publicClient.post(`${url}/login`, loginDTO);

export const logout = () => publicClient.post(`${url}/logout`);

export const changePasswordApi = (payload: ChangePasswordDTO) =>
  publicClient.put(`${url}/change-password`, payload);
