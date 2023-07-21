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
  UseInterceptors,
  Sse
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Listener } from 'eventemitter2';
import { Response } from 'express';
import { Subject, map } from 'rxjs';
import { InterfaceInformationDTO } from '../agent/dto/interfaceInformation.dto';
import { UserGuard, EventEmitterNameSpace } from '../core';
import { TimeoutInterceptor } from '../core/interceptors';
import { VehicleService } from './vehicle.service';

@ApiTags('vehicle')
@Controller('vehicle')
@ApiCookieAuth()
@UseGuards(UserGuard)
@UseInterceptors(TimeoutInterceptor)
export class VehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Get('/active')
  async listActiveVehicle(@Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.getActiveOnlineVehicles());
  }

  @Get('/waiting')
  async listWaitingVehicle(@Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.getWaitingOnlineVehicles());
  }

  @Get('/:id')
  async getVehicleById(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.getVehicle(id));
  }

  @Get('/:id/interface-files/status')
  async getVehicleInterfaceFilesStatus(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    return res.send(await this.vehicleService.getInterfaceFilesStatus(id));
  }

  @Put('/:id/activation')
  async activateVehicle(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.activateVehicle(id));
  }

  @Post('/:id/execution/ros-core')
  async runROSmaster(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const result = await this.vehicleService.sendROSMasterCommand(id);
    return res.status(HttpStatus.OK).send(result);
  }

  @Post('/:id/execution/interface-files/:interfaceId/:mapName')
  async startInterfaceFiles(
    @Param('id', ParseIntPipe) id: number,
    @Param('interfaceId', ParseIntPipe) interfaceId: number,
    @Param('mapName') mapName: string,
    @Res() res: Response
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.startInterfaceFiles(id, interfaceId, mapName));
  }

  @Post(':id/change-map/interface-files/:mapName')
  async changeMap(
    @Param('id', ParseIntPipe) id: number,
    @Param('mapName') mapName: string,
    @Res() res: Response
  ) {
    return res.status(HttpStatus.OK).send(await this.vehicleService.changeMap(id, mapName));
  }

  @Post('/:id/termination/interface-files/:interfaceId')
  async stopInterfaceFiles(
    @Param('id', ParseIntPipe) id: number,
    @Param('interfaceId', ParseIntPipe) interfaceId: number,
    @Res() res: Response
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.stopInterfaceFiles(id, interfaceId));
  }

  @Post('/:id/interface/:interfaceId/execution/command/:commandId')
  async runInterfaceCommand(
    @Param('id', ParseIntPipe) id: number,
    @Param('interfaceId', ParseIntPipe) interfaceId: number,
    @Param('commandId', ParseIntPipe) commandId: number,
    @Res() res: Response
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.runInterfaceCommand(id, interfaceId, commandId));
  }

  @Post('/:id/interface/:interfaceId/execution-all/command')
  async runAllInterfaceCommands(
    @Param('id', ParseIntPipe) id: number,
    @Param('interfaceId', ParseIntPipe) interfaceId: number,
    @Res() res: Response
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.runAllInterfaceCommands(id, interfaceId));
  }

  @Post('/:id/interface/:interfaceId/termination/command/:commandId')
  async stopInterfaceCommand(
    @Param('id', ParseIntPipe) id: number,
    @Param('interfaceId', ParseIntPipe) interfaceId: number,
    @Param('commandId', ParseIntPipe) commandId: number,
    @Res() res: Response
  ) {
    return res
      .status(HttpStatus.OK)
      .send(await this.vehicleService.stopInterfaceCommand(id, interfaceId, commandId));
  }

  @Sse('/:id/interface/:interface/details-status')
  sseInterfaceDetailsStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('interface', ParseIntPipe) paramInterfaceId: number,
    @Res() res: Response
  ) {
    const subject = new Subject();
    const listener: Listener = this.eventEmitter.on(
      EventEmitterNameSpace.VEHICLE_INTERFACE_DETAIL_STATUS,
      (data: InterfaceInformationDTO) => {
        const { algorithms, interfaceId, machines, sensors, vehicleId } = data;
        if (id !== vehicleId || paramInterfaceId !== interfaceId) {
          return;
        }
        subject.next({ machines, algorithms, sensors });
      },
      {
        objectify: true
      }
    ) as Listener;
    res.once('close', () => {
      listener.off();
    });
    return subject.pipe(map((data) => ({ data })));
  }
}
