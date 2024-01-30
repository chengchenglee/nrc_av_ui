import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import {
  ROSNodeDTO,
  ROSNodeStatusDTO,
  ROSNodeSyncingDTO,
  ROSNodeUpdatingDTO
} from '../dtos/ros-node';
import {
  CommandInfoDTO,
  InterfaceCommandAction,
  RunInterfaceParamDTO,
  VehicleDTO
} from '../dtos/vehicle';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/vehicle';

export const getActiveVehicles = (): ApiResponse<VehicleDTO[]> => publicClient.get(`${url}/active`);

export const getWaitingVehicles = (): ApiResponse<VehicleDTO[]> =>
  publicClient.get(`${url}/waiting`);

export const activateVehicle = (vehicleId: number): ApiResponse<''> =>
  publicClient.put(`${url}/${vehicleId}/activation`);

export const runROSCore = (vehicleId: number): ApiResponse<string> =>
  publicClient.post(`${url}/${vehicleId}/execution/ros-core`);

export const runROSNodes = (data: { vehicleId: number; nodeIds: number[] }): ApiResponse<string> =>
  publicClient.post(`${url}/${data.vehicleId}/execution/ros-nodes`, { nodeIds: data.nodeIds });

export const getROSNodes = (vehicleId: number): ApiResponse<ROSNodeDTO[]> =>
  publicClient.get(`${url}/${vehicleId}/ros-nodes`);

export const syncROSNodes = (vehicleId: number): ApiResponse<ROSNodeSyncingDTO> =>
  publicClient.get(`${url}/${vehicleId}/ros-nodes/sync`);

export const getROSNodesStatus = (vehicleId: number): ApiResponse<ROSNodeStatusDTO[]> =>
  publicClient.get(`${url}/${vehicleId}/ros-nodes/status`);

export const updateROSNodes = (data: {
  vehicleId: number;
  rosNodes: ROSNodeUpdatingDTO;
}): ApiResponse<''> =>
  publicClient.post(`${url}/${data.vehicleId}/ros-nodes`, { rosNodes: data.rosNodes });

export const runInterface = (data: {
  vehicleId: number;
  interfaceId: number;
  mapName: string;
  params?: RunInterfaceParamDTO;
}): ApiResponse<string> =>
  publicClient.post(
    // eslint-disable-next-line max-len
    `${url}/${data.vehicleId}/execution/interface-files/${data.interfaceId}/${data.mapName}/options`,
    null,
    { params: { ...data.params } }
  );

export const updateMap = (data: {
  vehicleId: number | undefined;
  mapName: string;
}): ApiResponse<string> =>
  publicClient.post(`${url}/${data.vehicleId}/change-map/interface-files/${data.mapName}`);

export const stopInterfaceFile = (data: {
  vehicleId: number;
  interfaceId: number;
}): ApiResponse<string> =>
  publicClient.post(`/vehicle/${data.vehicleId}/termination/interface-files/`);

export const executeInterfaceCommand = (data: InterfaceCommandAction): ApiResponse<string> =>
  publicClient.post(
    `${url}/${data.vehicleId}/interface/${data.interfaceId}/execution/command/${data.commandId}`
  );

export const stopInterfaceCommand = (data: InterfaceCommandAction): ApiResponse<string> =>
  publicClient.post(
    `${url}/${data.vehicleId}/interface/${data.interfaceId}/termination/command/${data.commandId}`
  );

export const runAllCommands = (data: CommandInfoDTO): ApiResponse<string> =>
  publicClient.post(`${url}/${data.vehicleId}/interface/${data.interfaceId}/execution-all/command`);
