import joi from 'joi';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinTable } from 'typeorm';
import { VehicleStatus } from '../enums';
import { Agent } from './agent';
import { Model } from './model';
import { Node } from './node';

@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: false })
  macAddress: string;

  @Column({ nullable: false, unique: true })
  certKey: string;

  @Column()
  lastConnected: Date;

  @Column({ default: VehicleStatus.WAITING })
  status: VehicleStatus;

  @ManyToOne(() => Model, (model) => model.vehicles, { eager: true })
  model: Model;

  @ManyToOne(() => Agent, (agent) => agent.vehicles, { eager: true })
  agent: Agent;

  @OneToMany(() => Node, (node) => node.vehicle, { eager: true })
  @JoinTable({ name: 'nodeList' })
  nodes: Node[];
}

export const vehicleValidateSchema = {
  name: joi.string().min(0).max(40).trim(),
  macAddress: joi.string().min(0).max(40).trim()
};
