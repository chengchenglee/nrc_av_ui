import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Put,
  Param,
  ParseIntPipe,
  UseGuards
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Vehicle, VehicleStatus, DatabaseService, UserGuard } from '../core';
import { VehicleService } from './vehicle.service';

@ApiTags('Vehicle')
@Controller('vehicle')
@ApiCookieAuth()
@UseGuards(UserGuard)
export class VehicleController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly vehicleService: VehicleService
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

  @Put('/:id/status')
  async registrationVehicle(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.updateStatus(id));
  }
}
