import { CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@Entity()
export class BaseRelationModel {
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
