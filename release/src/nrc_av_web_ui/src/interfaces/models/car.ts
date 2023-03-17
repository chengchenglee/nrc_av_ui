import { Agent } from './agent';
import { Model } from './model';

export interface Car {
  id: number;
  name: string;
  macAddress: string;
  licenseNumber: string;
  certKey: string;
  connectionType: string;
  model: Model;
  agent: Agent;
  status: string;
}
