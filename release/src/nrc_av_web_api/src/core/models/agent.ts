import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { AgentStatus } from '../enums';
import { Vehicle } from './vehicle';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('increment')
  id: number;

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
