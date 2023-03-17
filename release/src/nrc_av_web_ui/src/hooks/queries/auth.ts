import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';
import { AUTH } from '../../constants/query';
import { LoginDTO } from '../../interfaces/dtos/login';

export const useLogin = (loginDTO: LoginDTO) => {
  const navigate = useNavigate();
  return useQuery([AUTH], () => login(loginDTO), {
    select: (res) => res.data,
    enabled: false,
    onSuccess: () => {
      message.success('Login successfully');
      navigate('/cars/registration');
    },
    onError: () => message.error('Failed to login')
  });
};
