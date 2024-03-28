import { CommonErrorResponse } from './common';

export interface UserDTO {
  id: number;
  username: string;
  password: string;
}

export enum UserRoleEnum {
  Admin = 'admin',
  Viewer = 'viewer',
  Engineer = 'engineer'
}

export interface AddUserDTO {
  username: string;
  email: string;
  roles: string | string[];
}

export type AddUserErrorResponse = AddUserDTO & CommonErrorResponse;

export interface FilterUserParams {
  username?: string;
  email?: string;
  isActive?: boolean;
  currentPage: number;
  pageSize?: number;
  order?: 'ASC' | 'DESC';
  orderBy?: string;
}

export interface UserRole {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  roles: UserRole[];
}

export interface UserList {
  users: User[];
  total: number;
}

export interface EditUserDTO {
  id: number;
  email: string;
  roles: number[];
  isActive: boolean;
}

export type EditUserErrorResponse = CommonErrorResponse & Omit<EditUserDTO, 'id'>;
