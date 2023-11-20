import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Command } from './command';

@Entity()
export class Node extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @ManyToOne(() => Command, (command) => command.nodes)
  command: Command;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
