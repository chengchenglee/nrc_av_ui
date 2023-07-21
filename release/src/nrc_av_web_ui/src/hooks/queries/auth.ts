import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { login } from '../../api/auth';
import { AUTH } from '../../constants/query';
import { LoginDTO } from '../../dtos/login';
import { store } from '../../store';
import { userThunk } from '../../store/user/thunks';

export const useLogin = (loginDTO: LoginDTO) =>
  useQuery([AUTH], () => login(loginDTO), {
    select: (res) => res.data,
    enabled: false,
    onSuccess: () => {
      message.success('Login successfully');
      store.dispatch(userThunk.getCurrentUser());
    },
    onError: () => message.error('Failed to login')
  });
