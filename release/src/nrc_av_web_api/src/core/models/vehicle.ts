import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne } from 'typeorm';
import { VehicleStatus } from '../enums';
import { BaseModel } from './base';
import { Model } from './model';

@Entity()
export class Vehicle extends BaseModel {
  @Expose()
  @Column({ nullable: true })
  name: string;

  @Expose()
  @Column({ nullable: false })
  macAddress: string;

  @Expose()
  @Column({ nullable: false, unique: true })
  certKey: string;

  @Expose()
  @Column({ nullable: false, default: false })
  isOnline: boolean;

  @Expose()
  @Column()
  lastConnected: Date;

  @Expose()
  @Column({ default: VehicleStatus.WAITING })
  status: VehicleStatus;

  @Expose()
  @Column({ default: null })
  agentVersion: string;

  @ManyToOne(() => Model, (model) => model.vehicles)
  model: Model;
}
