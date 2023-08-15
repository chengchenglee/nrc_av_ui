import { Expose } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseRelationModel } from './baseRelation';
import { Destination } from './destination';
import { Interface } from './interface';

@Entity()
export class InterfaceDestination extends BaseRelationModel {
  @PrimaryColumn()
  interfaceId: number;

  @PrimaryColumn()
  destinationId: number;

  @ManyToOne(() => Interface, (agentInterface) => agentInterface.id)
  @JoinColumn({ name: 'interfaceId' })
  public interface: Interface;

  @Expose()
  @ManyToOne(() => Destination, (destination) => destination.id, { cascade: true })
  @JoinColumn({ name: 'destinationId' })
  public destination: Destination;

  @Expose()
  @Column()
  name: string;

  constructor(name: string, destination: Destination, agentInterface: Interface) {
    super();
    this.name = name;
    this.destination = destination;
    this.interface = agentInterface;
  }
}
