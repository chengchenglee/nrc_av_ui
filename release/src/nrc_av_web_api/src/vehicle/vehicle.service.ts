import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { AgentGateway } from '../agent/agent.gateway';
import { CommandService } from '../command/command.service';
import {
  Vehicle,
  VehicleStatus,
  message,
  SocketEnum,
  IResponse,
  ISuccessResponse,
  IVehicleStatus,
  SocketEventEnum,
  EventEmitterNameSpace,
  Interface
} from '../core';
import { InterfaceService } from '../interface/interface.service';
import { LoggerService } from '../logger/logger.service';
import { ModelService } from '../model/model.service';
import { AgentRegistrationDTO } from './dto/agentRegistration.dto';
import { AgentUpdationDTO } from './dto/agentUpdation.dto';

@Injectable()
export class VehicleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly agentGateway: AgentGateway,
    private eventEmitter: EventEmitter2,
    private readonly interfaceService: InterfaceService,
    private readonly commandService: CommandService,
    private readonly loggerService: LoggerService,
    private readonly modelService: ModelService
  ) {}

  async activateVehicle(id: number): Promise<Vehicle> {
    let vehicle = await this.getVehicle(id, VehicleStatus.WAITING);
    try {
      vehicle.status = VehicleStatus.ACTIVE;
      vehicle = await this.dataSource.getRepository(Vehicle).save(vehicle);
      const vehicleStatusEvent: IVehicleStatus = {
        vehicleCertKey: vehicle.certKey,
        status: vehicle.status
      };
      this.eventEmitter.emit(EventEmitterNameSpace.VEHICLE_STATUS, vehicleStatusEvent);
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return vehicle;
  }

  async registerVehicle(registerAgentDTO: AgentRegistrationDTO): Promise<Vehicle> {
    const { macAddress, model: modelName, certKey, name } = registerAgentDTO;
    let vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: { certKey }
    });
    if (vehicle) {
      vehicle.isOnline = true;
      vehicle.lastConnected = new Date();
      vehicle = await this.dataSource.getRepository(Vehicle).save(vehicle);
      return vehicle;
    }
    const model = await this.modelService.getAndCreateModelIfNotExisted(modelName);

    vehicle = new Vehicle();
    vehicle.certKey = certKey;
    vehicle.macAddress = macAddress;
    vehicle.model = model;
    vehicle.name = name;
    vehicle.isOnline = true;
    vehicle.lastConnected = new Date();

    vehicle = await this.dataSource.getRepository(Vehicle).save(vehicle);
    return vehicle;
  }

  async updateVehicle(agentUpdationDTO: AgentUpdationDTO, certKey: string): Promise<Vehicle> {
    const { name, model: modelName } = agentUpdationDTO;
    const vehicle = await this.getVehicleOnCertKey(certKey);

    const model = await this.modelService.getAndCreateModelIfNotExisted(modelName);

    if (vehicle.model.id !== model.id) {
      vehicle.model = model;
    }
    if (vehicle.name !== name) {
      vehicle.name = name;
    }

    vehicle.isOnline = true;
    vehicle.lastConnected = new Date();
    return await this.dataSource.getRepository(Vehicle).save(vehicle);
  }

  async getWaitingOnlineVehicles(): Promise<Vehicle[]> {
    return await this.dataSource.getRepository(Vehicle).find({
      where: {
        status: VehicleStatus.WAITING,
        isOnline: true
      },
      loadEagerRelations: true
    });
  }

  async getActiveOnlineVehicles(): Promise<Vehicle[]> {
    return await this.dataSource.getRepository(Vehicle).find({
      where: {
        status: VehicleStatus.ACTIVE,
        isOnline: true
      },
      loadEagerRelations: true
    });
  }

  async getVehicle(id: number, acceptedStatus = VehicleStatus.ACTIVE): Promise<Vehicle> {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: { id }
    });
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }
    if (vehicle.status !== acceptedStatus) {
      throw new HttpException(message.invalidStatus, HttpStatus.BAD_REQUEST);
    }
    return vehicle;
  }

  async getVehicleOnCertKey(certKey: string): Promise<Vehicle> {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: { certKey },
      relations: {
        model: true
      }
    });
    if (!vehicle) {
      throw new HttpException(message.vehicleNotFound, HttpStatus.NOT_FOUND);
    }
    return vehicle;
  }

  async handleVehicleDisconnection(certKey: string): Promise<void> {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: {
        certKey
      }
    });
    if (vehicle) {
      vehicle.isOnline = false;
      await this.dataSource.getRepository(Vehicle).save(vehicle);
      this.eventEmitter.emit(
        `${EventEmitterNameSpace.VEHICLE_DISCONNECT}.${vehicle.id}`,
        vehicle.name
      );
    }
  }

  async isVehicleOnline(id: number): Promise<boolean> {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: {
        id
      }
    });
    if (!vehicle.isOnline) {
      return false;
    }
    return true;
  }

  async handleVehicleConnection(certKey: string): Promise<Vehicle> {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOne({
      where: {
        certKey
      },
      relations: {
        model: true
      }
    });
    if (vehicle) {
      vehicle.isOnline = true;
      vehicle.lastConnected = new Date();
      await this.dataSource.getRepository(Vehicle).save(vehicle);
      return vehicle;
    } else {
      return null;
    }
  }

  async getResultFromAgent(vehicle: Vehicle, event: string, data: any): Promise<ISuccessResponse> {
    const resultFromAgent = (await this.agentGateway.emitToRoom(
      event,
      `${SocketEnum.ROOM_PREFIX}${vehicle.certKey}`,
      data
    )) as IResponse;

    if (resultFromAgent.status === 'error') {
      throw resultFromAgent;
    } else if (resultFromAgent.status !== 'success') {
      this.loggerService.error(`${event} is timed out in vehicle ${vehicle.name}`);
      throw message.agentTimeout;
    }
    const vehicleStatusEvent: IVehicleStatus = {
      vehicleCertKey: vehicle.certKey,
      status: vehicle.status
    };
    this.eventEmitter.emit(EventEmitterNameSpace.VEHICLE_STATUS, vehicleStatusEvent);
    return resultFromAgent;
  }

  async startInterfaceFiles(vehicleId: number, interfaceId: number, mapName: string) {
    const vehicle = await this.getVehicle(vehicleId);
    let agentInterface = await this.interfaceService.getInterfaceWithAllRelations(interfaceId);
    if (!agentInterface) {
      throw new HttpException(message.interfaceNotFound, HttpStatus.NOT_FOUND);
    }
    agentInterface = plainToInstance(Interface, agentInterface, { excludeExtraneousValues: true });
    const data = { mapName, ...agentInterface };
    try {
      return await this.getResultFromAgent(vehicle, SocketEventEnum.RUN_INTERFACE, data);
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async changeMap(vehicleId: number, mapName: string) {
    const vehicle = await this.getVehicle(vehicleId);
    const data = { mapName };
    try {
      return await this.getResultFromAgent(vehicle, SocketEventEnum.CHANGE_MAP, data);
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async stopInterfaceFiles(vehicleId: number, interfaceId: number) {
    const vehicle = await this.getVehicle(vehicleId);
    const agentInterface = await this.interfaceService.getInterfaceById(interfaceId);
    try {
      return await this.getResultFromAgent(
        vehicle,
        SocketEventEnum.STOP_INTERFACE,
        agentInterface.name
      );
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async runInterfaceCommand(vehicleId: number, interfaceId: number, commandId: number) {
    const vehicle = await this.getVehicle(vehicleId);
    const command = await this.commandService.getCommand(interfaceId, commandId);
    try {
      return await this.getResultFromAgent(vehicle, SocketEventEnum.RUN_INTERFACE_COMMAND, command);
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async stopInterfaceCommand(vehicleId: number, interfaceId: number, commandId: number) {
    const vehicle = await this.getVehicle(vehicleId);
    const command = await this.commandService.getCommand(interfaceId, commandId);
    try {
      return await this.getResultFromAgent(
        vehicle,
        SocketEventEnum.STOP_INTERFACE_COMMAND,
        command
      );
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async runAllInterfaceCommands(vehicleId: number, interfaceId: number) {
    const vehicle = await this.getVehicle(vehicleId);
    const commands = await this.commandService.getCommandsByInterfaceId(interfaceId);
    try {
      return await this.getResultFromAgent(
        vehicle,
        SocketEventEnum.RUN_ALL_INTERFACE_COMMANDS,
        commands.map((command) => ({ id: command.id, command: command.command }))
      );
    } catch (err) {
      throw new HttpException(err, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
