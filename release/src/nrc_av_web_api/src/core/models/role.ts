import { Expose } from 'class-transformer';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { BaseModel } from './base';
import { Permission } from './permission';
import { User } from './user';

@Entity()
export class Role extends BaseModel {
  @Expose()
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permission'
  })
  permissions: Permission[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export const roleOrderBy: Array<keyof Role> = ['name', 'createdAt', 'updatedAt'];
