import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseRelationModel } from './baseRelation';
import { ROSNode } from './rosNode';
import { Vehicle } from './vehicle';

@Entity()
export class NodeList extends BaseRelationModel {
  @PrimaryColumn()
  vehicle_id: number;

  @PrimaryColumn()
  rosNode_id: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.id)
  @JoinColumn({ name: 'vehicle_id' })
  public vehicle!: Vehicle;

  @ManyToOne(() => ROSNode, (node) => node.id)
  @JoinColumn({ name: 'rosNode_id' })
  public rosNode!: ROSNode;
}
