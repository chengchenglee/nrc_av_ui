import * as React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useStoreUser } from '../store';

export const UnAuthGuard: React.FC = () => {
  const user = useStoreUser();

  const isAuthenticate = React.useMemo(() => !!(user.isLogin && user.id), [user.id, user.isLogin]);
  if (isAuthenticate) {
    return <Navigate to="/vehicle/registration" />;
  }

  return <Outlet />;
};
