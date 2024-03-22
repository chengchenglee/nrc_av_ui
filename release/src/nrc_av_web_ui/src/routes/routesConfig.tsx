import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from '../components/layouts/mainLayout';
import { userRole } from '../constants/user';
import ChangePassword from '../containers/ChangePassword';
import InterfaceManagement from '../containers/InterfaceManagement';
import Login from '../containers/Login';
import Register from '../containers/Register';
import ROSRunner from '../containers/rosRunner';
import UserManagement from '../containers/UserManagement';
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
        guard: <AuthGuard acceptedRoles={['*']} />,
        path: '/',
        component: <Navigate to="/vehicle/interface/execution" />
      },
      {
        guard: <AuthGuard acceptedRoles={['*']} />,
        path: '/vehicle/interface',
        component: <VehicleInterface />,
        children: [
          {
            guard: <AuthGuard acceptedRoles={['*']} />,
            path: 'execution',
            component: <ROSRunner />
          },
          {
            guard: <AuthGuard acceptedRoles={[userRole.engineer, userRole.admin]} />,
            path: 'manage',
            component: <InterfaceManagement />
          }
        ]
      },
      {
        guard: <AuthGuard acceptedRoles={['admin']} />,
        path: '/menu/registration',
        component: <Register />
      },
      {
        guard: <AuthGuard acceptedRoles={['admin']} />,
        path: '/menu/manage/user',
        component: <UserManagement />
      },
      {
        path: '/auth/login',
        guard: <UnAuthGuard />,
        component: <Login />
      },
      {
        path: '/auth/change-password',
        guard: <AuthGuard acceptedRoles={['*']} />,
        component: <ChangePassword />
      }
    ]
  }
];
