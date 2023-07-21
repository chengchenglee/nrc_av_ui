import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import {
  InterfaceList,
  AddEditInterfaceDTO,
  FilterInterfaceParams,
  FilterInterfaceDTO,
  InterfaceDetailDTO
} from '../dtos/interface';
import { ApiResponse } from '../types/types';

const url = BASE_URL + '/interface';

export const getInterfaceList = (payload?: FilterInterfaceParams): ApiResponse<InterfaceList> =>
  publicClient.get(`${url}/list`, {
    params: payload
  });

export const addInterfaceApi = (data: AddEditInterfaceDTO) => publicClient.post('/interface', data);
export const getInterfaceApi = (data: FilterInterfaceDTO) =>
  publicClient.get('/interface', {
    params: data
  });

export const getInterfaceByIdApi = (id: number) =>
  publicClient.get<InterfaceDetailDTO>(`/interface/${id}`);

export const editInterfaceApi = (id: number, data: AddEditInterfaceDTO) =>
  publicClient.put(`/interface/${id}`, data);
