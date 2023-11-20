import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from '../components/layouts/mainLayout';
import InterfaceManagement from '../containers/InterfaceManagement';
import Login from '../containers/Login';
import Register from '../containers/Register';
import ROSRunner from '../containers/rosRunner';
import VehicleInterface from '../containers/vehicleInterface';
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
        component: <Navigate to="/vehicle/interface/execution" />
      },
      {
        guard: <AuthGuard />,
        path: '/vehicle/interface',
        component: <VehicleInterface />,
        children: [
          {
            path: 'execution',
            component: <ROSRunner />
          },
          {
            path: 'manage',
            component: <InterfaceManagement />
          }
        ]
      },
      {
        guard: <AuthGuard />,
        path: '/menu/registration',
        component: <Register />
      },
      {
        path: '/auth/login',
        guard: <UnAuthGuard />,
        component: <Login />
      }
    ]
  }
];
