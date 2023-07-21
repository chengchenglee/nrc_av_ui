import { AxiosResponse } from 'axios';

export type ApiResponse<T> = Promise<AxiosResponse<T>>;

export type Status = 'online' | 'offline' | 'idle' | 'none';
