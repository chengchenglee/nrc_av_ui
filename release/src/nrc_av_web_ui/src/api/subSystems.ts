import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { Subsystem } from '../dtos/interface';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/subsystem';

export const executeSybSystems = (data: {
  vehicleId: number;
  subSystemName: string;
}): ApiResponse<Subsystem> =>
  publicClient.get(`${url}/${data.vehicleId}/execution/${data.subSystemName}`);

export const terminateSybSystems = (data: {
  vehicleId: number;
  subSystemName: string;
}): ApiResponse<Subsystem> =>
  publicClient.get(`${url}/${data.vehicleId}/termination/${data.subSystemName}`);
