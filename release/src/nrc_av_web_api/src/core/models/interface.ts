import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { Algorithm } from './algorithms';
import { BaseModel } from './base';
import { Command } from './command';
import { InterfaceDestination } from './interfaceDestination';
import { Machine } from './machine';
import { Model } from './model';
import { MultiDestination } from './multiDestination';
import { Sensor } from './sensor';
import { User } from './user';

@Entity()
export class Interface extends BaseModel {
  @Column()
  name: string;

  @ManyToOne(() => Model, (model) => model.interfaces)
  model: Model;

  @OneToMany(() => Machine, (machine) => machine.interface, { cascade: true })
  machines: Machine[];

  @OneToMany(() => Sensor, (sensor) => sensor.interface, { cascade: true })
  sensors: Sensor[];

  @OneToMany(() => Algorithm, (algorithm) => algorithm.interface, { cascade: true })
  algorithms: Algorithm[];

  @OneToMany(() => Command, (command) => command.interface, { cascade: true })
  commands: Command[];

  @OneToMany(() => MultiDestination, (multiDestination) => multiDestination.interface)
  multiDestinations: MultiDestination[];

  @OneToMany(() => InterfaceDestination, (interfaceDestination) => interfaceDestination.interface)
  interfaceDestinations: InterfaceDestination[];

  @ManyToMany(() => User, (user) => user.interfaces)
  users: User[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export const interfaceOrderBy: Array<keyof Interface> = ['name', 'createdAt', 'updatedAt'];
