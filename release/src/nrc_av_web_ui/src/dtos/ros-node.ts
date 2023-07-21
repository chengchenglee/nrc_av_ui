import { ExecutionStatus } from '../constants/executionStatus';
export interface ROSNodeDTO {
  id?: number;
  name: string;
  packageName: string;
  status: ExecutionStatus;
}

export type ROSNodeUpdatingDTO = ROSNodeDTO[];

export interface ROSNodeSyncingDTO {
  currentNodes: ROSNodeDTO[];
  latestNodes: ROSNodeDTO[];
}

export interface ROSNodeStatusDTO {
  name: string;
  packageName: string;
  status: ExecutionStatus;
}
