import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OSType } from '../enums';
import { Vehicle } from './vehicle';

@Entity()
export class Model {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column()
  year: number;

  @Column({ default: OSType.LINUX })
  osType: OSType;

  @Column()
  osVersion: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.model)
  vehicles: Vehicle[];
}
