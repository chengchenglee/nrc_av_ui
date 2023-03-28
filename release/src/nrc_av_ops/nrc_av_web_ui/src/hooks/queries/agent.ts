import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { runROSCore } from '../../api/agent';
import { RUN_ROS_CORE } from '../../constants/query';

export const doRunROSCore = (vehicleId?: number) =>
  useQuery(
    [RUN_ROS_CORE],
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
      onError: () => message.error('Failed to start ROS Core')
    }
  );
