import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';

const url = BASE_URL + '/agent';

export const runROSCore = (vehicleId: number): ApiResponse<string> =>
  publicClient.post(`${url}/socket/${vehicleId}/ROS-master`);
