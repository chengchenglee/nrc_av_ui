import * as React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Cookies from 'universal-cookie';
import { useStoreUser, store } from '../store';
import { userActions } from '../store/user';
import { userThunk } from '../store/user/thunks';
import { roleCheck } from '../utilities/data';

interface AuthGuardProps {
  acceptedRoles: string[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ acceptedRoles }) => {
  const { loading, isLogin, roles } = useStoreUser();
  const navigate = useNavigate();

  const isValidRole = React.useMemo(
    () => acceptedRoles.includes('*') || roleCheck(acceptedRoles, roles),
    [acceptedRoles, roles]
  );

  React.useEffect(() => {
    const cookies = new Cookies();
    const token = cookies.get('access-token');

    if (token) {
      store.dispatch(userThunk.getCurrentUser());
    } else {
      store.dispatch(userActions.resetState());
      navigate('/auth/login');
    }
  }, [navigate]);

  if (loading) {
    return <div>loading</div>;
  }

  if (isLogin && isValidRole) {
    return <Outlet />;
  }

  return <Navigate to="/auth/login" />;
};
