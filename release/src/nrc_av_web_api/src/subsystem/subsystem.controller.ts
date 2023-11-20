import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserGuard, TimeoutInterceptor } from '../core';
import { VehicleService } from '../vehicle/vehicle.service';

@ApiTags('subsystem')
@Controller('subsystem')
@ApiCookieAuth()
@UseGuards(UserGuard)
@UseInterceptors(TimeoutInterceptor)
export class SubSystemController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('/:vehicleId/execution/:subsystemName')
  async runSubSystem(
    @Res() res: Response,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('subsystemName') subSystemName: string
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.runSubSystem(vehicleId, subSystemName));
  }

  @Get('/:vehicleId/termination/:subsystemName')
  async stopSubSystem(
    @Res() res: Response,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('subsystemName') subSystemName: string
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.stopSubSystem(vehicleId, subSystemName));
  }
}
