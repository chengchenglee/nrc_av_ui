import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseModel } from './base';
import { Node } from './node';
import { SubSystem } from './subsystem';

@Entity()
export class Command extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column()
  command: string;

  @Expose()
  @Column({ default: false })
  inclByDef: boolean;

  @Expose()
  @Column({ default: false })
  autoStart: boolean;

  @Expose()
  @Column({ default: false })
  autoRecord: boolean;

  @Expose()
  @Column({ type: 'float', default: 0.0 })
  launchTime: number;

  @ManyToOne(() => SubSystem, (agentSubSystem) => agentSubSystem.commands)
  subSystem: SubSystem;

  @Expose()
  @OneToMany(() => Node, (node) => node.command, { cascade: true })
  nodes: Node[];

  constructor(
    name: string,
    command: string,
    inclByDef: boolean,
    autoStart: boolean,
    autoRecord: boolean,
    launchTime: number,
    nodes: Node[]
  ) {
    super();
    this.name = name;
    this.command = command;
    this.inclByDef = inclByDef;
    this.autoStart = autoStart;
    this.autoRecord = autoRecord;
    this.launchTime = launchTime;
    this.nodes = nodes;
  }
}
