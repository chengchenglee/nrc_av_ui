export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  NOT_STARTED = 'NOT_STARTED'
}

export enum CommandsStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export enum SubSystemStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}

export enum StatusRunAll {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE'
}

export const STATUS_INTERVAL = 3000; // 3s
