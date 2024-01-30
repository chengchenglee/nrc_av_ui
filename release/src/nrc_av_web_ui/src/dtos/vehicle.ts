import { VehicleStatus } from '../constants/vehicleStatus';
import { ModelDTO } from './model';

export interface ExtraVehicleInformation {
  latitude: number;
  longitude: number;
  velocity: number;
}
export interface VehicleDTO {
  id: number;
  name: string;
  macAddress: string;
  certKey: string;
  connectionType: string;
  isOnline: boolean;
  lastConnected: string;
  model: ModelDTO;
  status: VehicleStatus;
}

export interface CommandInfoDTO {
  vehicleId: number;
  interfaceId: number;
}

export interface InterfaceCommandAction extends CommandInfoDTO {
  commandId: number;
}

export interface RunInterfaceParamDTO {
  startAllSubSystem?: boolean;
}
