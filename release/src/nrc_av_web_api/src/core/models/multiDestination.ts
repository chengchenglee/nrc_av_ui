import { Expose } from 'class-transformer';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Destination } from './destination';
import { Interface } from './interface';

@Entity()
export class MultiDestination extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @ManyToMany(() => Destination, (destination) => destination.multiDestination, { cascade: true })
  @JoinTable({ name: 'destination_list' })
  destinations: Destination[];

  @ManyToOne(() => Interface, (agentInterface) => agentInterface.multiDestinations)
  interface: Interface;

  constructor(name: string, destinations: Destination[]) {
    super();
    this.name = name;
    this.destinations = destinations;
  }
}
