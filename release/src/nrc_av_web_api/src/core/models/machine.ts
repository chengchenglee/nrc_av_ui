import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';

@Entity()
export class Machine extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column()
  addr: string;

  @ManyToOne(() => Interface, (agentInterface) => agentInterface.machines)
  interface: Interface;

  constructor(name: string, addr: string) {
    super();
    this.name = name;
    this.addr = addr;
  }
}
