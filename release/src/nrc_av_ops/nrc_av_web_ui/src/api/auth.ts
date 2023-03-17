import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';
import { LoginDTO } from '../interfaces/dtos/login';

const url = BASE_URL + '/auth';

export const login = (loginDTO: LoginDTO): ApiResponse<string> =>
  publicClient.post(`${url}/login`, loginDTO);

export const logout = () => publicClient.post(`${url}/logout`);
