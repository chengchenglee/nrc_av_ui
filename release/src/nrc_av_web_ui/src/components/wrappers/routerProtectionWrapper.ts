import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreUser } from '../../store';

interface RouterProtectionWrapperProps extends React.PropsWithChildren {
  children: React.ReactElement;
}

export const RouterProtectionWrapper: React.FC<RouterProtectionWrapperProps> = ({ children }) => {
  const user = useStoreUser();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user.isLogin && !user.id) {
      navigate('/auth/login');
    } else {
      navigate('/cars/registration');
    }
  }, [user, navigate]);

  return children;
};
