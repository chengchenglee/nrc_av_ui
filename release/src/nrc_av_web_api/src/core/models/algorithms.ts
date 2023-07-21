import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';

@Entity()
export class Algorithm extends BaseModel {
  @Column()
  name: string;

  @Column({ type: 'float' })
  errRate: number;

  @Column({ type: 'float' })
  warnRate: number;

  @Column()
  topicName: string;

  @Column()
  topicType: string;

  @ManyToOne(() => Interface, (agentInterface) => agentInterface.algorithms)
  interface: Interface;

  constructor(
    name: string,
    errRate: number,
    warnRate: number,
    topicName: string,
    topicType: string
  ) {
    super();
    this.name = name;
    this.errRate = errRate;
    this.warnRate = warnRate;
    this.topicName = topicName;
    this.topicType = topicType;
  }
}
