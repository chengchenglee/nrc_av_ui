import { Model } from './model';

export interface Vehicle {
  id: number;
  name: string;
  macAddress: string;
  certKey: string;
  connectionType: string;
  model: Model;
}
