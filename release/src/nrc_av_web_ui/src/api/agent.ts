import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';

const url = BASE_URL + '/agent';

export const runSequence = (carId: number, sequenceId: number): ApiResponse<string> =>
  publicClient.post(`${url}/socket/${carId}`, { sequenceId });

export const runROSCore = (carId: number): ApiResponse<string> =>
  publicClient.post(`${url}/socket/${carId}/ROS-master`);

export const runROSNode = (carId: number, rosNodeId: number): ApiResponse<string> =>
  publicClient.post(`${url}/socket/${carId}/ROS-node/${rosNodeId}`);
