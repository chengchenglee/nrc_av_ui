/* eslint-disable no-use-before-define */
import { Expose } from 'class-transformer';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { SubSystemType } from '../enums';
import { BaseModel } from './base';
import { Command } from './command';
import { Interface } from './interface';
import { Topic } from './topic';

@Entity()
export class SubSystem extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column()
  description: string;

  @Expose()
  @Column()
  diagLed: number;

  @Expose()
  @Column()
  diagnostic: string;

  @Expose()
  @Column({ default: 5 })
  diagRetry: number;

  @Expose()
  @Column({ default: 30 })
  timeout: number;

  @Expose()
  @Column({ default: SubSystemType.SENSOR })
  type: SubSystemType;

  @ManyToOne(() => Interface, (agentInterface) => agentInterface.subSystems)
  interface: Interface;

  @Expose()
  @OneToMany(() => Command, (command) => command.subSystem, { cascade: true })
  commands: Command[];

  @Expose()
  @OneToMany(() => Topic, (topic) => topic.subSystem, { cascade: true })
  topics: Topic[];

  @Expose()
  @ManyToMany(() => SubSystem, { cascade: true })
  @JoinTable({ name: 'sub_system_dependency', joinColumn: { name: 'subSystemDependId' } })
  dependSystems: SubSystem[];

  constructor(
    name: string,
    description: string,
    diagLed: number,
    timeout: number,
    diagRetry: number,
    diagnostic: string,
    type: SubSystemType,
    topics: Topic[],
    commands: Command[],
    dependSystems: SubSystem[]
  ) {
    super();
    this.name = name;
    this.description = description;
    this.diagLed = diagLed;
    this.diagRetry = diagRetry;
    this.timeout = timeout;
    this.diagnostic = diagnostic;
    this.type = type;
    this.topics = topics;
    this.commands = commands;
    this.dependSystems = dependSystems;
  }
}
