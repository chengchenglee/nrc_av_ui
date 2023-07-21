import { ExecutionStatus } from '../constants/executionStatus';

export interface InterfaceFileStatusDTO {
  id: number;
  fileName: string;
  status: ExecutionStatus;
  statusRunAll: string;
}
