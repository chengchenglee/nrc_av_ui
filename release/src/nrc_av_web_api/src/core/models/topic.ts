import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from './base';
import { SubSystem } from './subsystem';

@Entity()
export class Topic extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column()
  topicName: string;

  @Expose()
  @Column({ nullable: true })
  topicType: string;

  @Expose()
  @Column({ type: 'float' })
  normalRate: number;

  @Expose()
  @Column({ type: 'float' })
  errRate: number;

  @Expose()
  @Column({ type: 'float' })
  warnRate: number;

  @ManyToOne(() => SubSystem, (agentSubSystem) => agentSubSystem.topics)
  subSystem: SubSystem;

  constructor(
    name: string,
    topicName: string,
    topicType: string,
    normalRate: number,
    errRate: number,
    warnRate: number
  ) {
    super();
    this.name = name;
    this.topicName = topicName;
    this.topicType = topicType;
    this.normalRate = normalRate;
    this.errRate = errRate;
    this.warnRate = warnRate;
  }
}
