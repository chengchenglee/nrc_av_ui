import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';
import { User } from '../interfaces/models/user';

const url = BASE_URL + '/user';

export const getMe = (): ApiResponse<User> => publicClient.get(`${url}/me`);
