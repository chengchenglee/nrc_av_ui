import * as React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Cookies from 'universal-cookie';
import { useStoreUser, store } from '../store';
import { userActions } from '../store/user';
import { userThunk } from '../store/user/thunks';

export const AuthGuard: React.FC = () => {
  const { loading, isLogin } = useStoreUser();
  const navigate = useNavigate();

  React.useEffect(() => {
    const cookies = new Cookies();
    const token = cookies.get('access-token');

    if (token) {
      // console.log('token exists');
      store.dispatch(userThunk.getCurrentUser());
    } else {
      store.dispatch(userActions.resetState());
      navigate('/auth/login');
    }
  }, []);

  if (loading) {
    return <div>loading</div>;
  }

  if (isLogin) {
    return <Outlet />;
  }

  return <Navigate to="/auth/login" />;
};
