import axios from 'axios';
import { BASE_URL } from '../../constants/config';
import { Store } from '../../store';
import { addInterceptor } from './interceptor';

export const publicClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

export const initPublicClient = (_store: Store) => {
  addInterceptor(publicClient, _store);
};
