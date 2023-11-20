import { Expose } from 'class-transformer';
import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { BaseModel } from './base';
import { InterfaceContent } from './interfaceContent';
import { InterfaceDestination } from './interfaceDestination';
import { Machine } from './machine';
import { Model } from './model';
import { MultiDestination } from './multiDestination';
import { SubSystem } from './subsystem';
import { User } from './user';

@Entity()
export class Interface extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @ManyToOne(() => Model, (model) => model.interfaces)
  model: Model;

  @Expose()
  @OneToMany(() => Machine, (machine) => machine.interface, { cascade: true })
  machines: Machine[];

  @Expose()
  @OneToMany(() => SubSystem, (subSystem) => subSystem.interface, { cascade: true })
  subSystems: SubSystem[];

  @Expose()
  @OneToMany(() => MultiDestination, (multiDestination) => multiDestination.interface)
  multiDestinations: MultiDestination[];

  @Expose()
  @OneToMany(() => InterfaceDestination, (interfaceDestination) => interfaceDestination.interface)
  interfaceDestinations: InterfaceDestination[];

  @ManyToMany(() => User, (user) => user.interfaces)
  users: User[];

  @Expose()
  @OneToMany(() => InterfaceContent, (interfaceContent) => interfaceContent.interface, {
    cascade: true
  })
  interfaceContents: InterfaceContent[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export const interfaceOrderBy: Array<keyof Interface> = ['name', 'createdAt', 'updatedAt'];
