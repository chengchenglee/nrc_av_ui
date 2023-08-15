import { Expose } from 'class-transformer';
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseModel } from './base';
import { Interface } from './interface';
import { Vehicle } from './vehicle';

@Entity()
export class Model extends BaseModel {
  @Expose()
  @Column()
  name: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.model)
  vehicles: Vehicle[];

  @OneToMany(() => Interface, (agentInterface) => agentInterface.model, { cascade: true })
  interfaces: Interface[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
