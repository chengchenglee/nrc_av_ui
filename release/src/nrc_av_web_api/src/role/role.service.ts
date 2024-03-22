import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Alias, Role, message } from '../core';

@Injectable()
export class RoleService {
  constructor(private readonly dataSource: DataSource) {}

  async listRoles() {
    return await this.dataSource
      .getRepository(Role)
      .createQueryBuilder(Alias.ROLE)
      .where({ isDeleted: false })
      .getMany();
  }

  async getRoleById(id: string) {
    const role = await this.dataSource
      .getRepository(Role)
      .createQueryBuilder(Alias.ROLE)
      .where({ id, isDeleted: false })
      .getOne();

    if (!role) {
      throw new HttpException({ errorMessage: message.roleNotFound }, HttpStatus.NOT_FOUND);
    }

    return role;
  }
}
