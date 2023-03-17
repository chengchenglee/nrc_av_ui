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
      relations: ['nodeList', 'nodeList.rosNode']
    });
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }

    const rosNodeList = vehicle.nodeList.find((n) => n.rosNode_id === rosNodeId);
    if (!rosNodeList) {
      throw new HttpException(message.rosNodeNotFound, HttpStatus.NOT_FOUND);
    }
    try {
      return await this.agentGateway.emitToRoom(
        SocketEnum.EVENT_RUN_ROS_NODE,
        `${SocketEnum.ROOM_PREFIX}${vehicle.certKey}`,
        {
          data: rosNodeList.rosNode.name
        }
      );
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
