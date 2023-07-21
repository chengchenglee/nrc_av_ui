import { ModelDTO } from './model';

export interface VehicleDTO {
  id: number;
  name: string;
  macAddress: string;
  certKey: string;
  connectionType: string;
  model: ModelDTO;
}

export interface CommandInfoDTO {
  vehicleId: number;
  interfaceId: number;
}

export interface InterfaceCommandAction extends CommandInfoDTO {
  commandId: number;
}
