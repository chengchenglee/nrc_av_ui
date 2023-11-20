import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { ISubSystemCache } from '../core';
import { CacheSubSystem } from '../core/models/cache_subsystem';
import { InterfaceService } from '../interface/interface.service';

@Injectable()
export class CacheSubSystemService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly interfaceService: InterfaceService
  ) {}

  async saveSubSystemCache(subSystemCache: ISubSystemCache): Promise<CacheSubSystem | null> {
    const agentInterface = await this.interfaceService.getInterfaceById(subSystemCache.interfaceId);
    const cacheSystem = new CacheSubSystem(subSystemCache.subSystemSeq.toString());
    cacheSystem.interface = agentInterface;

    return await this.dataSource.getRepository(CacheSubSystem).save(cacheSystem);
  }

  async getSubSystemCacheWithInterfaceId(interfaceId: number): Promise<CacheSubSystem | null> {
    const cacheSubSystem = await this.dataSource.getRepository(CacheSubSystem).findOne({
      where: { interface: { id: interfaceId } }
    });
    return cacheSubSystem;
  }

  async updateSubSystemCache(interfaceId: number, newSubSystemSeq: string) {
    const cacheSubSystem = await this.getSubSystemCacheWithInterfaceId(interfaceId);
    if (cacheSubSystem !== null) {
      cacheSubSystem.subSystemSeq = newSubSystemSeq;
    }

    await this.dataSource.getRepository(CacheSubSystem).save(cacheSubSystem);
  }

  async deleteCacheSubSystemByIdInterface(interfaceId: number): Promise<void> {
    const cacheSubSystem = await this.getSubSystemCacheWithInterfaceId(interfaceId);

    await this.dataSource.getRepository(CacheSubSystem).remove(cacheSubSystem);
  }

  async deleteCacheSubSystem(): Promise<void> {
    await this.dataSource.createQueryBuilder().delete().from(CacheSubSystem).execute();
  }
}
