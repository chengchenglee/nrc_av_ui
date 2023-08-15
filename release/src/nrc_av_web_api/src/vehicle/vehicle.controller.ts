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
import { SSE_TIMEOUT } from '../constants';
import { UserGuard, EventEmitterNameSpace, Vehicle, Serialize, ControllerResponse } from '../core';
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
  @Serialize(Vehicle)
  async listActiveVehicle(@Res() res: Response) {
    return new ControllerResponse(
      res,
      await this.vehicleService.getActiveOnlineVehicles(),
      HttpStatus.OK
    );
  }

  @Get('/waiting')
  @Serialize(Vehicle)
  async listWaitingVehicle(@Res() res: Response) {
    return new ControllerResponse(
      res,
      await this.vehicleService.getWaitingOnlineVehicles(),
      HttpStatus.OK
    );
  }

  @Get('/:id')
  @Serialize(Vehicle)
  async getVehicleById(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return new ControllerResponse(res, await this.vehicleService.getVehicle(id), HttpStatus.OK);
  }

  @Put('/:id/activation')
  @Serialize(Vehicle)
  async activateVehicle(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return new ControllerResponse(
      res,
      await this.vehicleService.activateVehicle(id),
      HttpStatus.OK
    );
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

  @Sse('/:id/interface/details-status')
  sseInterfaceDetailsStatus(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const subject = new Subject();
    const subjectTimeoutError = () => {
      subject.error(new Error(`Vehicle ${id} timeout after ${SSE_TIMEOUT} ms`));
    };
    let subjectTimeout = setTimeout(subjectTimeoutError, SSE_TIMEOUT);
    const listener: Listener = this.eventEmitter.on(
      EventEmitterNameSpace.VEHICLE_INTERFACE_DETAIL_STATUS,
      (data: InterfaceInformationDTO) => {
        const {
          algorithms,
          machines,
          sensors,
          statusCommands,
          vehicleId,
          interfaceName,
          status,
          interfaceId,
          statusRunAll
        } = data;
        if (id !== vehicleId) {
          return;
        }
        clearTimeout(subjectTimeout);
        subjectTimeout = setTimeout(subjectTimeoutError, SSE_TIMEOUT);
        subject.next({
          machines,
          algorithms,
          sensors,
          statusCommands,
          interfaceName,
          interfaceId,
          status,
          statusRunAll
        });
      },
      {
        objectify: true
      }
    ) as Listener;
    const vehicleConnectionlistener: Listener = this.eventEmitter.on(
      `${EventEmitterNameSpace.VEHICLE_DISCONNECT}.${id}`,
      (err) => {
        subject.error(new Error(`Vehicle ${err} disconnected`));
      },
      {
        objectify: true
      }
    ) as Listener;
    this.vehicleService
      .isVehicleOnline(id)
      .then((isOnline) => {
        if (!isOnline) {
          subject.error(new Error(`Vehicle ${id} not online`));
        }
      })
      .catch((err) => {
        subject.error(err);
      });
    res.once('close', () => {
      clearTimeout(subjectTimeout);
      listener.off();
      vehicleConnectionlistener.off();
    });
    return subject.pipe(map((data) => ({ data })));
  }
}
