import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseService, ROSNode, Vehicle, message, NodeList } from '../core';
import { CreateNodeDTO } from './dto/createNode.request.dto';

@Injectable()
export class ROSNodeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly databaseService: DatabaseService
  ) {}

  async getVehicleROSNodes(id: number): Promise<ROSNode[]> {
    const vehicle = await this.databaseService.getOneByField(Vehicle, 'id', id);
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }

    return this.dataSource.getRepository(ROSNode).find({
      where: {
        nodeList: {
          vehicle_id: id
        }
      }
    });
  }

  async createROSNode(vehicleId: number, createNodeDTO: CreateNodeDTO): Promise<ROSNode> {
    const { name, packageName } = createNodeDTO;
    const vehicle = await this.databaseService.getOneByField(Vehicle, 'id', vehicleId);
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }

    let existedROSNode = await this.dataSource.getRepository(ROSNode).findOne({
      where: {
        name,
        packageName
      }
    });
    await this.dataSource.manager.transaction(async (transactionalEntityManager) => {
      if (!existedROSNode) {
        existedROSNode = await transactionalEntityManager.save(ROSNode, {
          ...createNodeDTO
        });
      }
      await transactionalEntityManager.save(NodeList, {
        rosNode: existedROSNode,
        vehicle
      });
    });
    return existedROSNode;
  }
}
