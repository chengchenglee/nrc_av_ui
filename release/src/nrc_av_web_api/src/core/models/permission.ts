import { Expose } from 'class-transformer';
import { Column, Entity, ManyToMany } from 'typeorm';
import { BaseModel } from './base';
import { Role } from './role';

@Entity()
export class Permission extends BaseModel {
  @Expose()
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export const permissionOrderBy: Array<keyof Permission> = ['name', 'createdAt', 'updatedAt'];
