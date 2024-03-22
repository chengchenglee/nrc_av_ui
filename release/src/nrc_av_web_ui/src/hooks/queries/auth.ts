import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePasswordApi, login, logout } from 'api/auth';
import { store } from 'store';
import { userThunk } from 'store/user/thunks';

export const useLogin = () => useMutation(login);

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation(logout, {
    onSuccess: () => {
      queryClient.removeQueries();
      store.dispatch(userThunk.getCurrentUser());
    }
  });
};

export const useChangePassword = () => useMutation(changePasswordApi);
