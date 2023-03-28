import joi from 'joi';
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseModel } from './base';
import { NodeList } from './nodeList';

@Entity()
export class ROSNode extends BaseModel {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  packageName: string;

  @OneToMany(() => NodeList, (nodeList) => nodeList.rosNode)
  nodeList: NodeList[];
}

export const nodeValidateSchema = {
  name: joi.string().min(1).trim(),
  packageName: joi.string().min(1).trim()
};
