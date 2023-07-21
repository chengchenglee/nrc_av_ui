import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { LoginDTO } from '../dtos/login';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/auth';

export const login = (loginDTO: LoginDTO): ApiResponse<string> =>
  publicClient.post(`${url}/login`, loginDTO);

export const logout = () => publicClient.post(`${url}/logout`);
