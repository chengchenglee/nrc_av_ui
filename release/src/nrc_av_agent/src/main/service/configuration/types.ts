export interface IVehicleInfoProps {
  certKey?: string;
  name?: string;
  macAddress?: string;
  model?: string;
}

export interface IHostProps {
  host?: string;
  rosWorkspace?: string;
}

export type ConfigProps = IVehicleInfoProps & IHostProps;
