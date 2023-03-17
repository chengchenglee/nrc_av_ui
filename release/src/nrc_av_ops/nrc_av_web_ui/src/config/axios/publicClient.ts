import axios from 'axios';
import { BASE_URL } from '../../constants/config';

export const publicClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});
