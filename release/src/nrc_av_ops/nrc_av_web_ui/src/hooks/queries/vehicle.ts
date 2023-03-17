import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActiveVehicles,
  getWaitingVehicles,
  activateVehicle,
  getVehicle,
  getNodes
} from '../../api/vehicle';

import { ROS_NODES, VEHICLES, VEHICLE_STATUS } from '../../constants/query';

export const useActiveVehicles = () =>
  useQuery([VEHICLES, VEHICLE_STATUS.ACTIVE], getActiveVehicles, { select: (res) => res.data });

export const useWaitingVehicles = () =>
  useQuery([VEHICLES, VEHICLE_STATUS.WAITING], getWaitingVehicles, { select: (res) => res.data });

export const useROSNodes = (vehicleId: number | undefined) =>
  useQuery(
    [ROS_NODES, vehicleId],
    () => {
      if (!vehicleId) {
        return Promise.reject(new Error('Invalid vehicle id!'));
      }
      return getNodes(vehicleId);
    },
    { select: (res) => res.data, enabled: !!vehicleId }
  );

export const doActivateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation(activateVehicle, {
    onSettled: () => {
      queryClient.invalidateQueries([VEHICLES, VEHICLE_STATUS.ACTIVE]);
      queryClient.invalidateQueries([VEHICLES, VEHICLE_STATUS.WAITING]);
    }
  });
};

export const useVehicle = (vehicleId: number | undefined) =>
  useQuery(
    [VEHICLES, vehicleId],
    () => {
      if (!vehicleId) {
        return Promise.reject(new Error('Invalid vehicle id!'));
      }
      return getVehicle(vehicleId);
    },
    { select: (res) => res.data, enabled: !!vehicleId }
  );
