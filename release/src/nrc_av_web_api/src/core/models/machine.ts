import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';

@Entity()
export class Machine extends BaseModel {
  @Column()
  name: string;

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
