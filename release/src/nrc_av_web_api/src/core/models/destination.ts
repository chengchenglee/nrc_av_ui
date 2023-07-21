import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';
import { BaseModel } from './base';
import { InterfaceDestination } from './interfaceDestination';
import { MultiDestination } from './multiDestination';

@Entity()
export class Destination extends BaseModel {
  @Column({ type: 'float' })
  posX: number;

  @Column({ type: 'float' })
  posY: number;

  @Column({ type: 'float' })
  posTh: number;

  @OneToMany(() => InterfaceDestination, (interfaceDestination) => interfaceDestination.destination)
  interfaceDestination: InterfaceDestination[];

  @ManyToMany(() => MultiDestination, (multiDestination) => multiDestination.destinations)
  multiDestination: MultiDestination;

  constructor(posX: number, posY: number, posTh: number) {
    super();
    this.posX = posX;
    this.posY = posY;
    this.posTh = posTh;
  }
}
