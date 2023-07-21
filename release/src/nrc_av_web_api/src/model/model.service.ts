import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Model } from '../core';

@Injectable()
export class ModelService {
  constructor(private readonly dataSource: DataSource) {}

  async getAndCreateModelIfNotExisted(modelName: string) {
    let model = await this.dataSource.getRepository(Model).findOne({
      where: { name: modelName }
    });
    if (!model) {
      model = await this.dataSource.getRepository(Model).save(new Model(modelName));
    }

    return model;
  }
}
