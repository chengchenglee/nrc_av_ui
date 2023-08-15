import { useMutation, useQuery } from '@tanstack/react-query';
import {
  addInterfaceApi,
  deleteInterfaceApi,
  editInterfaceApi,
  getInterfaceApi,
  getInterfaceByIdApi,
  getInterfaceList
} from '../../api/interface';
import { INTERFACE, INTERFACES, INTERFACE_BY_ID } from '../../constants/query';
import {
  AddEditInterfaceDTO,
  EditInterfaceDTO,
  FilterInterfaceDTO,
  FilterInterfaceParams
} from '../../dtos/interface';

export const useGetInterfaceList = (filter?: FilterInterfaceParams) =>
  useQuery([INTERFACES, filter], () => getInterfaceList(filter), {
    select: (res) => res.data,
    staleTime: 1000 * 5,
    keepPreviousData: true
  });

export const useAddInterface = () =>
  useMutation((data: AddEditInterfaceDTO) => addInterfaceApi(data));

export const useGetFilterInterface = (payload: FilterInterfaceDTO, enabled = true) =>
  useQuery([INTERFACE, payload], () => getInterfaceApi(payload), {
    staleTime: 1000 * 3,
    select: (res) => res.data,
    enabled: !!payload.name && payload.name !== '' && enabled
  });

export const useGetInterfaceById = (id?: number) =>
  useQuery(
    [INTERFACE_BY_ID, id],
    () => {
      if (!id) {
        return Promise.reject('Required id');
      }

      return getInterfaceByIdApi(id);
    },
    {
      select: (res) => res.data,
      enabled: !!id
    }
  );

export const useEditInterface = () =>
  useMutation(({ id, data }: EditInterfaceDTO) => editInterfaceApi(id, data));

export const useDeleteInterface = () => useMutation((id: number) => deleteInterfaceApi(id));
