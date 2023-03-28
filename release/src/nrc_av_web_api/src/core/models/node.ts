import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Vehicle } from './vehicle';

@Entity()
export class Node {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ nullable: false })
  name: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.nodes)
  vehicle: Vehicle;
}
