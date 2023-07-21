import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { UserDTO } from '../dtos/user';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/user';

export const getMeUrl = `${url}/me`;

export const getMe = (): ApiResponse<UserDTO> => publicClient.get(getMeUrl);
