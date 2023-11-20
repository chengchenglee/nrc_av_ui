import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';

@Entity()
export class InterfaceContent extends BaseModel {
  @Expose()
  @Column()
  content: string;

  @Expose()
  @ManyToOne(() => Interface, (agentInterface) => agentInterface.interfaceContents)
  interface: Interface;

  constructor(content: string) {
    super();
    this.content = content;
  }
}
