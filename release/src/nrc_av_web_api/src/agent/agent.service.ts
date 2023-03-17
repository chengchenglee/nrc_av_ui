import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Vehicle, message, SocketEnum } from '../core';
import { AgentGateway } from './agent.gateway';

@Injectable()
export class AgentService {
  constructor(
    private readonly agentGateway: AgentGateway,
    private readonly dataSource: DataSource
  ) {}

  async sendROSMasterCommand(vehicleId: number) {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: { id: vehicleId }
    });
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }

    try {
      return await this.agentGateway.emitToRoom(
        SocketEnum.EVENT_RUN_ROS_MASTER,
        `${SocketEnum.ROOM_PREFIX}${vehicle.certKey}`,
        {
          data: SocketEnum.RUN_ROS_MASTER_COMMAND
        }
      );
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async sendROSLaunchCommand(vehicleId: number, rosNodeId: number) {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: { id: vehicleId },
      loadEagerRelations: true
    });
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }

    const node = vehicle.nodes.find((n) => n.id === rosNodeId);

    try {
      return await this.agentGateway.emitToRoom(
        SocketEnum.EVENT_RUN_ROS_NODE,
        `${SocketEnum.ROOM_PREFIX}${vehicle.certKey}`,
        {
          data: node.name
        }
      );
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
