import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { AxiosError } from 'axios';
import {
  getActiveVehicles,
  getWaitingVehicles,
  getROSNodes,
  activateVehicle,
  updateROSNodes,
  getROSNodesStatus,
  syncROSNodes,
  runROSNodes,
  runROSCore,
  runInterface,
  getInterfaceFilesStatus,
  stopInterfaceFile,
  executeInterfaceCommand,
  stopInterfaceCommand,
  runAllCommands
} from '../../api/vehicle';
import { ExecutionStatus, STATUS_INTERVAL } from '../../constants/executionStatus';
import {
  INTERFACE_FILES_STATUS,
  ROS_NODES,
  ROS_NODES_STATUS,
  ROS_NODE_SYNCER,
  ROS_CORE_EXECUTION,
  VEHICLES,
  VEHICLE_STATUS
} from '../../constants/query';

export const useActiveVehicles = () =>
  useQuery([VEHICLES, VEHICLE_STATUS.ACTIVE], getActiveVehicles, { select: (res) => res.data });

export const useWaitingVehicles = () =>
  useQuery([VEHICLES, VEHICLE_STATUS.WAITING], getWaitingVehicles, { select: (res) => res.data });

export const doActivateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation(activateVehicle, {
    onSettled: () => {
      queryClient.invalidateQueries([VEHICLES, VEHICLE_STATUS.ACTIVE]);
      queryClient.invalidateQueries([VEHICLES, VEHICLE_STATUS.WAITING]);
    }
  });
};

export const useROSNodes = (vehicleId: number | undefined) =>
  useQuery(
    [ROS_NODES, vehicleId],
    () => {
      if (!vehicleId) {
        return Promise.reject(new Error('Invalid vehicle id!'));
      }
      return getROSNodes(vehicleId);
    },
    { select: (res) => res.data, enabled: !!vehicleId }
  );

export const doUpdateROSNodes = () => {
  const queryClient = useQueryClient();
  return useMutation(updateROSNodes, {
    onSettled: () => {
      queryClient.invalidateQueries([ROS_NODES]);
    }
  });
};

export const doROSCoreExecution = (vehicleId?: number) =>
  useQuery(
    [ROS_CORE_EXECUTION],
    () => {
      if (!vehicleId) {
        return Promise.reject('Invalid vehicle id!');
      }
      return runROSCore(vehicleId);
    },
    {
      select: (res) => res.data,
      enabled: false,
      onSuccess: () => message.success('Start ROS Core successfully'),
      onError: (err: AxiosError<{ message: string }>) => {
        message.error(`Failed to start ROS Core: ${err?.response?.data?.message}`);
      }
    }
  );

export const doROSNodesExecution = () =>
  useMutation(runROSNodes, {
    onSuccess: () => message.success('All selected ROS Nodes started successfully'),
    onError: () => message.error('Some ROS Nodes failed to start')
  });

export const useSyncedROSNodes = (vehicleId: number | undefined) =>
  useQuery(
    [ROS_NODE_SYNCER, vehicleId],
    () => {
      if (!vehicleId) {
        return Promise.reject(new Error('Invalid vehicle id!'));
      }
      return syncROSNodes(vehicleId);
    },
    {
      select: (res) => res.data,
      enabled: false,
      onError: (res: any) =>
        message.error(`Failed to sync ROS Nodes: ${res?.response?.data?.message}`)
    }
  );

export const useROSNodesStatus = (vehicleId: number | undefined) =>
  useQuery(
    [ROS_NODES_STATUS, vehicleId],
    () => {
      if (!vehicleId) {
        return Promise.reject(new Error('Invalid vehicle id!'));
      }
      return getROSNodesStatus(vehicleId);
    },
    {
      select: (res) => res.data,
      enabled: !!vehicleId,
      refetchInterval: STATUS_INTERVAL,
      refetchIntervalInBackground: true
    }
  );

export const useExecuteInterface = () =>
  useMutation(runInterface, {
    onSuccess: () => {
      message.success('Run interface file successfully');
      return '';
    },
    onError: (err: AxiosError<{ message: string }>) => {
      message.error(`Failed to run interface file: ${err?.response?.data?.message}`);
      return 'error';
    }
  });

export const useInterfaceFilesStatus = (vehicleId: number | undefined) => {
  const queryClient = useQueryClient();
  return useQuery(
    [INTERFACE_FILES_STATUS, vehicleId],
    () => {
      if (!vehicleId) {
        return Promise.reject(new Error('Invalid vehicle id!'));
      }
      return getInterfaceFilesStatus(vehicleId);
    },
    {
      select: (res) => res.data.filter((i) => i.status === ExecutionStatus.RUNNING),
      enabled: !!vehicleId,
      refetchInterval: STATUS_INTERVAL,
      refetchIntervalInBackground: true,
      onError: () => {
        queryClient.setQueryData([INTERFACE_FILES_STATUS, vehicleId], []);
      }
    }
  );
};

export const useStopInterface = () =>
  useMutation(stopInterfaceFile, {
    onSuccess: () => {
      message.success('Stop interface file successfully');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      message.error(`Failed to stop interface file: ${err?.response?.data?.message}`);
    }
  });

export const useExecuteCommand = () => {
  const mutation = useMutation(executeInterfaceCommand, {
    onSuccess: () => {
      message.success('Execute command successfully');
    },

    onError: (err: AxiosError<{ message: string }>) => {
      if (err.response) {
        message.error('Failed to execute command');
      }
    }
  });

  const getDataExecuted = () => {
    if (mutation.isSuccess) {
      return '';
    } else if (mutation.isError) {
      return mutation.error?.response?.data?.message ?? '';
    } else {
      return mutation.data ?? '';
    }
  };

  return {
    data: getDataExecuted(),
    executeCommand: mutation.mutate,
    isExecutingCommand: mutation.isLoading
  };
};

export const useStopCommand = () =>
  useMutation(stopInterfaceCommand, {
    onSuccess: () => {
      message.success('Stop command successfully');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      message.error(`Failed to stop command: ${err?.response?.data?.message}`);
    }
  });

export const useRunAllCommands = () => {
  const mutation = useMutation(runAllCommands, {
    onSuccess: () => {
      message.success('Run all commands successfully');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      if (err.response) {
        message.error('Run all commands failed');
      }
    }
  });

  const getDataExecuted = () => {
    if (mutation.isSuccess) {
      return '';
    } else if (mutation.isError) {
      return mutation.error?.response?.data ?? '';
    } else {
      return mutation.data ?? '';
    }
  };

  return {
    dataRunAllCommands: getDataExecuted(),
    runAllCommands: mutation.mutate,
    isExecutingCommand: mutation.isLoading
  };
};
