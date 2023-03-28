import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActiveCars,
  getWaitingCars,
  changeCarStatus,
  getCarById,
  getInterfaceByModelId,
  getCmd
} from '../../api/car';
import { CARS, CAR_STATUS, INTERFACES, CMD } from '../../constants/query';

export const useGetActiveCars = () =>
  useQuery([CARS, CAR_STATUS.ACTIVE], getActiveCars, { select: (res) => res.data });

export const useGetWaitingCars = () =>
  useQuery([CARS, CAR_STATUS.WAITING], getWaitingCars, { select: (res) => res.data });

export const useChangeCarStatus = () => {
  const queryClient = useQueryClient();
  return useMutation(changeCarStatus, {
    onSettled: () => {
      queryClient.invalidateQueries([CARS, CAR_STATUS.ACTIVE]);
      queryClient.invalidateQueries([CARS, CAR_STATUS.WAITING]);
    }
  });
};

export const useGetCarById = (id: number) =>
  useQuery([CARS, id], () => getCarById(id), { select: (res) => res.data });

export const useGetInterfacesByModel = (id: number) =>
  useQuery([INTERFACES, id], () => getInterfaceByModelId(id), { select: (res) => res.data });

export const useGetCmdsByInterfaceId = (id: number) =>
  useQuery([CMD, id], () => getCmd(id), { select: (res) => res.data });
