import { User } from './src/core/models';

declare module 'express' {
  export interface Request {
    user: User;
  }
}
