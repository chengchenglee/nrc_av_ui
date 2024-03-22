import { CommonErrorResponse } from './common';

export interface ChangePasswordDTO {
  username: string;
  password: string;
  newPassword: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export type ChangePasswordErrorResponse = CommonErrorResponse & ChangePasswordDTO;
