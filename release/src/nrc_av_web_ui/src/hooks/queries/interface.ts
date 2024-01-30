import { useMutation, useQuery } from '@tanstack/react-query';
import {
  addInterfaceApi,
  cloneInterfaceApi,
  deleteInterfaceApi,
  editInterfaceApi,
  getContentYamlByIdInterface,
  getInterfaceApi,
  getInterfaceByIdApi,
  getInterfaceByName,
  getInterfaceList
} from '../../api/interface';
import {
  CONTENT_BY_INTERFACE_ID,
  INTERFACE,
  INTERFACES,
  INTERFACE_BY_ID,
  INTERFACE_BY_NAME
} from '../../constants/query';
import {
  AddEditInterfaceDTO,
  CloneInterfaceDTO,
  EditInterfaceDTO,
  FilterInterfaceDTO,
  FilterInterfaceParams,
  ImportInterfaceDTO
} from '../../dtos/interface';

export const useGetInterfaceList = (filter?: FilterInterfaceParams) =>
  useQuery([INTERFACES, filter], () => getInterfaceList(filter), {
    select: (res) => res.data,
    staleTime: 1000 * 5,
    keepPreviousData: true
  });

export const useGetInterfaceByName = (name?: string) =>
  useQuery(
    [INTERFACE_BY_NAME, name],
    () => {
      if (!name) {
        return Promise.reject('Required name');
      }

      return getInterfaceByName(name);
    },
    {
      select: (res) => res.data,
      enabled: !!name
    }
  );

export const useGetContentByIdInterface = (id?: number) =>
  useQuery(
    [CONTENT_BY_INTERFACE_ID, id],
    () => {
      if (!id) {
        return Promise.reject('Required id');
      }

      return getContentYamlByIdInterface(id);
    },
    {
      enabled: !!id
    }
  );

export const useAddInterface = () =>
  useMutation((data: AddEditInterfaceDTO | ImportInterfaceDTO) => addInterfaceApi(data));

export const useCloneInterface = () =>
  useMutation(({ id, data }: CloneInterfaceDTO) => cloneInterfaceApi(id, data));

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
