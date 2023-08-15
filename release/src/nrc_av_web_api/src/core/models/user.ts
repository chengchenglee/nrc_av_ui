import { Expose } from 'class-transformer';
import joi from 'joi';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';
@Entity()
export class User extends BaseModel {
  @Expose()
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @ManyToMany(() => Interface, (agentInterface) => agentInterface.users)
  @JoinTable({ name: 'user_interface' })
  interfaces: Interface[];
}

export const userValidateSchema = {
  username: joi.string().min(3).max(40).trim().required(),
  password: joi.string().min(6).max(32).trim().required()
};
