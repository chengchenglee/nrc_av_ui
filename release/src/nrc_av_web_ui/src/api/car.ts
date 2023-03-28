import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';
import { Car } from '../interfaces/models/car';
import { Cmd } from '../interfaces/models/cmd';
import { Interface } from '../interfaces/models/interface';

const url = BASE_URL + '/car';

const urlModel = BASE_URL + '/model';

const urlCmd = BASE_URL + '/interface';

export const getActiveCars = (): ApiResponse<Car[]> => publicClient.get(`${url}/active`);

export const getWaitingCars = (): ApiResponse<Car[]> => publicClient.get(`${url}/waiting`);

export const getInterfaceByModelId = (id: number): ApiResponse<Interface[]> =>
  publicClient.get(`${urlModel}/${id}/interfaces`);

export const getCmd = (id: number): ApiResponse<Cmd[]> => publicClient.get(`${urlCmd}/${id}/cmds`);

export const changeCarStatus = (id: number): ApiResponse<''> =>
  publicClient.put(`${url}/${id}/status`);

export const getCarById = (
  id: number
): ApiResponse<{
  id: number;
  macAddress: string;
  licenseNumber: string;
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
    interfaces: {
      id: number;
      agentName: string;
      cmds: {
        id: number;
        name: string;
        command: string;
        nodes: string;
        inclByDef: boolean;
      }[];
    }[];
  };
  agent: {
    id: number;
    name: string;
    repoUrl: string;
    version: string;
    status: string;
  };
}> => publicClient.get(`${url}/${id}`);
