import { Column, Entity, OneToMany } from 'typeorm';
import { AgentStatus } from '../enums';
import { BaseModel } from './base';
import { Vehicle } from './vehicle';

@Entity()
export class Agent extends BaseModel {
  @Column()
  name: string;

  @Column()
  repoUrl: string;

  @Column()
  version: string;

  @Column({ default: AgentStatus.ACTIVE })
  status: AgentStatus;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.agent)
  vehicles: Vehicle[];
}
