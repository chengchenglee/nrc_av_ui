import { EnumVehicleConnectionState } from './constants';

export interface IVehicleInfoConfig {
  certKey?: string;
  name?: string;
  macAddress?: string;
  model?: string;
}

export interface IVehicleConnection {
  vehicleConnectionStatus: EnumVehicleConnectionState;
  vehicleOfflineReason?: string;
}

export interface IHostConfig {
  host?: string;
  rosWorkspace?: string;
}

export interface IUpdatedVehicleConfig {
  vehicleConfig: IVehicleInfoConfig;
  hostConfig: IHostConfig;
}

export interface ILogConfig {
  enable: 'on' | 'off';
  logLevel: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';
  mode: 'file' | 'console';
}

export type ConfigType = IVehicleInfoConfig | IHostConfig | ILogConfig;
