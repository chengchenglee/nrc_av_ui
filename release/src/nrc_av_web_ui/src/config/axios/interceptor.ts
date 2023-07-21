import axios, { AxiosInstance } from 'axios';
import { getMeUrl } from '../../api/user';
import { Store } from '../../store';
import { userThunk } from '../../store/user/thunks';

export const addInterceptor = (clientInstance: AxiosInstance, store: Store) => {
  clientInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        error.config?.url !== getMeUrl
      ) {
        store.dispatch(userThunk.getCurrentUser());
      }

      return Promise.reject(error);
    }
  );
};
