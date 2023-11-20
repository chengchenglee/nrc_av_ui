import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import {
  InterfaceList,
  AddEditInterfaceDTO,
  FilterInterfaceParams,
  FilterInterfaceDTO,
  InterfaceDetailDTO,
  EditDataInterfaceDTO,
  CloneDataInterfaceDTO,
  ImportInterfaceDTO
} from '../dtos/interface';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/interface';

export const getInterfaceList = (payload?: FilterInterfaceParams): ApiResponse<InterfaceList> =>
  publicClient.get(`${url}/list`, {
    params: payload
  });

export const getInterfaceByName = (name: string) =>
  publicClient.get<InterfaceDetailDTO>(`${url}/name/${name}`);

export const getContentYamlByIdInterface = (id: number) =>
  publicClient.get<string>(`${url}/${id}/content`);

export const addInterfaceApi = (data: AddEditInterfaceDTO | ImportInterfaceDTO) =>
  publicClient.post('/interface', data);

export const cloneInterfaceApi = (id: number, data: CloneDataInterfaceDTO) =>
  publicClient.get(`/interface/clone/${id}`, {
    params: data
  });

export const getInterfaceApi = (data: FilterInterfaceDTO) =>
  publicClient.get('/interface', {
    params: data
  });

export const getInterfaceByIdApi = (id: number) =>
  publicClient.get<InterfaceDetailDTO>(`/interface/${id}`);

export const editInterfaceApi = (id: number, data: EditDataInterfaceDTO) =>
  publicClient.put(`/interface/${id}`, data);

export const deleteInterfaceApi = (id: number) => publicClient.delete(`/interface/${id}`);
