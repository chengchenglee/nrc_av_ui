import { Column, Entity, OneToMany } from 'typeorm';
import { BaseModel } from './base';
import { Vehicle } from './vehicle';

@Entity()
export class Model extends BaseModel {
  @Column()
  name: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.model)
  vehicles: Vehicle[];
}
