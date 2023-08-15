import { Expose } from 'class-transformer';
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
  @OneToMany(() => Sensor, (sensor) => sensor.interface, { cascade: true })
  sensors: Sensor[];

  @Expose()
  @OneToMany(() => Algorithm, (algorithm) => algorithm.interface, { cascade: true })
  algorithms: Algorithm[];

  @Expose()
  @OneToMany(() => Command, (command) => command.interface, { cascade: true })
  commands: Command[];

  @Expose()
  @OneToMany(() => MultiDestination, (multiDestination) => multiDestination.interface)
  multiDestinations: MultiDestination[];

  @Expose()
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
