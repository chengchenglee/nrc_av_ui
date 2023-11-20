import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InterfaceContent } from '../core';

@Injectable()
export class InterfaceContentService {
  constructor(private readonly dataSource: DataSource) {}

  getInterfaceContent(interfaceId: number): Promise<InterfaceContent[]> {
    return this.dataSource.getRepository(InterfaceContent).find({
      where: {
        interface: {
          id: interfaceId
        },
        isDeleted: false
      },
      order: { updatedAt: 'DESC' }
    });
  }

  getAllInterfaceContent(interfaceId: number): Promise<InterfaceContent[]> {
    return this.dataSource.getRepository(InterfaceContent).find({
      where: {
        interface: {
          id: interfaceId
        }
      },
      order: { updatedAt: 'DESC' }
    });
  }

  getLatestInterfaceContent(interfaceId: number): Promise<InterfaceContent> {
    return this.dataSource.getRepository(InterfaceContent).findOne({
      where: {
        interface: {
          id: interfaceId
        },
        isDeleted: false
      },
      order: { updatedAt: 'DESC' }
    });
  }

  async updateInterfaceContent(
    currentContent: InterfaceContent[],
    newContent: string,
    transactionalEntityManager: EntityManager
  ): Promise<InterfaceContent[]> {
    const updatedContent = currentContent.map((content) => ({
      ...content,
      isDeleted: true
    }));
    const interfaceContent = new InterfaceContent(newContent);
    updatedContent.push(interfaceContent);
    return await transactionalEntityManager.save(InterfaceContent, updatedContent);
  }
}
