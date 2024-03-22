import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, ILike, In } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { configuration } from '../config';
import { Alias, Role, User, constant, message } from '../core';
import { CreateUserDto } from './dto/createUser.dto';
import { DeleteUserDTO } from './dto/deleteUser.dto';
import { UserFilterDTO, UserList } from './dto/userFilter.dto';

@Injectable()
export class UserService {
  constructor(private readonly dataSource: DataSource, private readonly authService: AuthService) {}

  async createUser(payload: CreateUserDto) {
    const { email, roles, username } = payload;
    const checkUsernameExists = await this.checkUserExist(username);
    const checkEmailExists = await this.checkEmailExist(email);

    if (checkUsernameExists) {
      throw new HttpException(message.usernameExisted, HttpStatus.BAD_REQUEST);
    }

    if (checkEmailExists) {
      throw new HttpException(message.emailExisted, HttpStatus.BAD_REQUEST);
    }

    const newUser = new User();

    newUser.username = username;
    newUser.email = email;
    newUser.password = await this.authService.encryptPassword(
      constant.INITIAL_PASSWORD,
      configuration().bcrypt_salt
    );

    try {
      const existingRole = await this.dataSource.manager.find(Role, {
        where: {
          id: In(roles),
          isDeleted: false
        }
      });

      if (existingRole.length === 0) {
        throw new HttpException(message.noRole, HttpStatus.NOT_FOUND);
      }

      newUser.roles = existingRole;

      return await this.dataSource.manager.transaction(
        async (manager) => await manager.save(newUser)
      );
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listUser(query: UserFilterDTO): Promise<UserList> {
    const { currentPage, email, isActive, order, orderBy, pageSize, username } = query;
    const users = await this.dataSource.getRepository(User).find({
      where: {
        username: ILike(`%${username}%`),
        email: ILike(`%${email}%`),
        isActive,
        isDeleted: false
      },
      order: {
        [orderBy]: order
      },
      skip: currentPage * pageSize,
      take: pageSize,
      relations: ['roles']
    });
    const total = await this.dataSource.getRepository(User).count({
      where: {
        username: ILike(`%${username}%`),
        email: ILike(`%${email}%`),
        isActive,
        isDeleted: false
      }
    });
    return { users, total };
  }

  async deleteUser(userId: number, query: DeleteUserDTO): Promise<void> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new HttpException(message.userNotFound, HttpStatus.NOT_FOUND);
    }

    try {
      if (query.permanent) {
        await this.dataSource.getRepository(User).remove(user);
      } else {
        user.isDeleted = true;
        await this.dataSource.manager.save(user);
      }
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserById(userId: number): Promise<User> {
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: userId, isDeleted: false }, relations: ['roles'] });

    if (!user) {
      throw new HttpException(message.userNotFound, HttpStatus.NOT_FOUND);
    }

    return user;
  }

  private async checkUserExist(username: string) {
    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder(Alias.USER)
      .where({ username })
      .getOne();

    if (user) {
      return true;
    }

    return false;
  }

  private async checkEmailExist(email: string) {
    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder(Alias.USER)
      .where({ email })
      .getOne();

    if (user) {
      return true;
    }

    return false;
  }
}
