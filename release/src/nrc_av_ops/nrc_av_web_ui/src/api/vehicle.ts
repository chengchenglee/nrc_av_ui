import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';
import { ROSNode } from '../interfaces/models/ros-node';
import { Vehicle } from '../interfaces/models/vehicle';

const url = BASE_URL + '/vehicle';

export const getActiveVehicles = (): ApiResponse<Vehicle[]> => publicClient.get(`${url}/active`);

export const getWaitingVehicles = (): ApiResponse<Vehicle[]> => publicClient.get(`${url}/waiting`);

export const getNodes = (vehicleId: number): ApiResponse<ROSNode[]> =>
  publicClient.get(`${url}/${vehicleId}/ros-nodes`);

export const activateVehicle = (vehicleId: number): ApiResponse<''> =>
  publicClient.put(`${url}/${vehicleId}/status`);

export const getVehicle = (
  vehicleId: number
): ApiResponse<{
  id: number;
  macAddress: string;
  certKey: string;
  connectionType: string;
  lastConnected: Date;
  status: string;
  model: {
    id: number;
    name: string;
    year: number;
    osType: string;
    osVersion: string;
  };
  agent: {
    id: number;
    name: string;
    repoUrl: string;
    version: string;
    status: string;
  };
}> => publicClient.get(`${url}/${vehicleId}`);
