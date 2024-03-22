import { Expose } from 'class-transformer';
import joi from 'joi';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';
import { Role } from './role';

@Entity({ name: 'user' })
export class User extends BaseModel {
  @Expose()
  @Column({ unique: true })
  username: string;

  @Expose()
  @Column({ unique: true })
  email: string;

  @Expose()
  @Column()
  isActive: boolean;

  @Column()
  shouldChangePasswordOnNextLogin: boolean;

  @Column()
  password: string;

  @ManyToMany(() => Interface, (agentInterface) => agentInterface.users)
  @JoinTable({ name: 'user_interface' })
  interfaces: Interface[];

  @Expose()
  @ManyToMany(() => Role, (role) => role.users, { cascade: true })
  @JoinTable({
    name: 'user_role'
  })
  roles: Role[];
}

export const userValidateSchema = {
  username: joi.string().min(3).max(40).trim().required(),
  password: joi.string().min(6).max(32).trim().required(),
  email: joi.string().email().min(3).max(40).trim().required()
};

export const userOrderBy: Array<keyof User> = [
  'username',
  'email',
  'createdAt',
  'updatedAt',
  'isActive'
];
