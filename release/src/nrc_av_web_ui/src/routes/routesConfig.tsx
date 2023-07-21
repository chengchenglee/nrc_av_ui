import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from '../components/layouts/mainLayout';
import InterfaceManagement from '../containers/InterfaceManagement';
import Login from '../containers/Login';
import VehicleRegistration from '../containers/vehicleRegistration';
import { AuthGuard } from '../guards/auth';
import { UnAuthGuard } from '../guards/unAuth';

export interface SingleRoute {
  path: string;
  component?: ReactNode;
  guard?: ReactNode;
  children?: SingleRoute[];
}

export const ROUTES: SingleRoute[] = [
  {
    path: '',
    component: <MainLayout />,
    children: [
      {
        guard: <AuthGuard />,
        path: '/',
        component: <Navigate to="/vehicle/registration" />
      },
      {
        guard: <AuthGuard />,
        path: '/vehicle/registration',
        component: <VehicleRegistration />
      },
      {
        guard: <AuthGuard />,
        path: '/interface/management',
        component: <InterfaceManagement />
      },
      {
        path: '/auth/login',
        guard: <UnAuthGuard />,
        component: <Login />
      }
    ]
  }
];
