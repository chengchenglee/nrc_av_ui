import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { Role } from '../dtos/role';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/role';

export const getRoleListUrl = `${url}/list`;

export const getListRole = (): ApiResponse<Role[]> => publicClient.get(getRoleListUrl);
