import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { runSequence, runROSCore, runROSNode } from '../../api/agent';
import { RUN_SEQUENCE, RUN_ROS_CORE, RUN_ROS_NODE } from '../../constants/query';

export const useRunSequence = (carId?: number, sequenceId?: number) =>
  useQuery(
    [RUN_SEQUENCE, sequenceId],
    () => {
      if (!carId || !sequenceId) {
        return Promise.reject('Invalid ID');
      }
      return runSequence(carId, sequenceId);
    },
    {
      select: (res) => res.data,
      enabled: !!sequenceId,
      onSuccess: () => message.success('Run Sequence successfully'),
      onError: () => message.error('Failed to run sequence')
    }
  );

export const useRunROSCore = (carId?: number, rosCoreId?: number) =>
  useQuery(
    [RUN_ROS_CORE, rosCoreId],
    () => {
      if (!carId || !rosCoreId) {
        return Promise.reject('Invalid ID');
      }
      return runROSCore(carId);
    },
    {
      select: (res) => res.data,
      enabled: false,
      onSuccess: () => message.success('Run ROS Core successfully'),
      onError: () => message.error('Failed to run ROS Core')
    }
  );

export const useRunROSNode = (carId?: number, rosNodeId?: number) =>
  useQuery(
    [RUN_ROS_NODE, rosNodeId],
    () => {
      if (!carId || !rosNodeId) {
        return Promise.reject('Invalid ID');
      }
      return runROSNode(carId, rosNodeId);
    },
    {
      select: (res) => res.data,
      enabled: false,
      onSuccess: () => message.success('Run ROS Node successfully'),
      onError: () => message.error('Failed to run ROS Node')
    }
  );
