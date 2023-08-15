import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';

@Entity()
export class Algorithm extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ type: 'float' })
  errRate: number;

  @Expose()
  @Column({ type: 'float' })
  warnRate: number;

  @Expose()
  @Column()
  topicName: string;

  @Expose()
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
