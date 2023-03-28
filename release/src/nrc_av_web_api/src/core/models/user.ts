import joi from 'joi';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;
}

export const userValidateSchema = {
  username: joi.string().min(3).max(40).trim().lowercase().required(),
  password: joi.string().min(6).max(32).trim().alphanum().required()
};
