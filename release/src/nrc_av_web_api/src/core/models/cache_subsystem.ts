import { Expose } from 'class-transformer';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Interface } from './interface';

@Entity()
export class CacheSubSystem {
  @Expose()
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Expose()
  @Column()
  subSystemSeq: string;

  @Expose()
  @ManyToOne(() => Interface)
  interface: Interface;

  constructor(subSystemSeq: string) {
    this.subSystemSeq = subSystemSeq;
  }
}
