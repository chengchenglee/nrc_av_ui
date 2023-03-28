import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Put,
  Param,
  ParseIntPipe,
  UseGuards,
  Post,
  UsePipes,
  Body
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Vehicle, VehicleStatus, DatabaseService, UserGuard, HttpJoiValidatorPipe } from '../core';
import { CreateNodeDTO, vCreateNodeDTO } from '../rosNode/dto/createNode.request.dto';
import { ROSNodeService } from '../rosNode/rosNode.service';
import { VehicleService } from './vehicle.service';

@ApiTags('vehicle')
@Controller('vehicle')
@ApiCookieAuth()
@UseGuards(UserGuard)
export class VehicleController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly vehicleService: VehicleService,
    private readonly rosNodeService: ROSNodeService
  ) {}

  @Get('/active')
  async listActiveVehicle(@Res() res: Response) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.getVehiclesByField('status', VehicleStatus.ACTIVE));
  }

  @Get('/waiting')
  async listWaitingVehicle(@Res() res: Response) {
    return res
      .status(HttpStatus.OK)
      .send(await this.databaseService.getManyByField(Vehicle, 'status', VehicleStatus.WAITING));
  }

  @Get('/:id')
  async getVehicleById(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.getVehicleByField('id', id));
  }

  @Get(':id/ros-nodes')
  async getVehicleNodes(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.rosNodeService.getVehicleROSNodes(id));
  }

  @Put('/:id/status')
  async registrationVehicle(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.updateStatus(id));
  }

  @Post('/:id/ros-nodes')
  @UsePipes(new HttpJoiValidatorPipe(vCreateNodeDTO))
  async addNodeForVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Body() body: CreateNodeDTO
  ) {
    return res.status(HttpStatus.OK).send(await this.rosNodeService.createROSNode(id, body));
  }
}
