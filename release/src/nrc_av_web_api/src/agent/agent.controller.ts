import { Controller, Param, Post, Res, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserGuard } from '../core';
import { AgentService } from './agent.service';

@ApiTags('agent')
@Controller('agent')
@ApiBearerAuth()
@UseGuards(UserGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('/socket/:vehicleId/ROS-master')
  async runROSmaster(@Param('vehicleId', ParseIntPipe) vehicleId: number, @Res() res: Response) {
    const result = await this.agentService.sendROSMasterCommand(vehicleId);
    return res.send(result);
  }

  @Post('/socket/:vehicleId/ROS-node/:rosNodeId')
  async runROSnode(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('rosNodeId', ParseIntPipe) rosNodeId: number,
    @Res() res: Response
  ) {
    const result = await this.agentService.sendROSLaunchCommand(vehicleId, rosNodeId);
    return res.send(result);
  }
}
