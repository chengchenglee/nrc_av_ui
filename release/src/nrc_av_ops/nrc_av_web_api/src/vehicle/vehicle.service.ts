import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RegisterAgentDTO } from '../agent/dto/registerAgent.dto';
import { Vehicle, DatabaseService, VehicleStatus, Model, message, SocketEnum } from '../core';
import { VehicleGateway } from './vehicle.gateway';

@Injectable()
export class VehicleService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly dataSource: DataSource,
    private readonly vehicleGateway: VehicleGateway
  ) {}

  async updateStatus(id: number): Promise<Vehicle> {
    let vehicle = await this.databaseService.getOneByField(Vehicle, 'id', id);

    if (vehicle.status !== VehicleStatus.WAITING) {
      throw new HttpException(message.invalidStatus, HttpStatus.BAD_REQUEST);
    }
    vehicle.status = VehicleStatus.ACTIVE;

    vehicle = await this.databaseService.save(Vehicle, vehicle);
    try {
      await this.vehicleGateway.emitToRoom(
        SocketEnum.EVENT_VEHICLE_ACTIVATION,
        `${SocketEnum.ROOM_PREFIX}${vehicle.certKey}`,
        {
          certKey: vehicle.certKey
        }
      );
    } catch (err) {
      throw new HttpException(message.agentError, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return vehicle;
  }

  async registerVehicle(registerAgentDTO: RegisterAgentDTO): Promise<Vehicle> {
    const { macAddress, model: modelName, certKey, name } = registerAgentDTO;
    let vehicle = await this.databaseService.getOneByField(Vehicle, 'certKey', certKey);
    if (vehicle) {
      return vehicle;
    }
    let model = await this.databaseService.getOneByField(Model, 'name', modelName);

    if (!model) {
      model = await this.databaseService.save(Model, { name: modelName } as Model);
    }

    vehicle = new Vehicle();
    vehicle.certKey = certKey;
    vehicle.macAddress = macAddress;
    vehicle.model = model;
    vehicle.name = name;
    vehicle.lastConnected = new Date();

    vehicle = await this.databaseService.save(Vehicle, vehicle);
    return vehicle;
  }

  async activeVehicle(certKey: string): Promise<Vehicle> {
    const vehicle = await this.databaseService.getOneByField(Vehicle, 'certKey', certKey);
    if (!vehicle || vehicle.status !== VehicleStatus.WAITING) {
      return null;
    }

    vehicle.status = VehicleStatus.ACTIVE;
    vehicle.lastConnected = new Date();
    return await this.databaseService.save<Vehicle>(Vehicle, vehicle);
  }

  async getVehicleByField(field: keyof Vehicle, value: any): Promise<Vehicle> {
    return await this.dataSource.getRepository(Vehicle).findOne({
      where: { [field]: value },
      loadEagerRelations: true
    });
  }

  async getVehiclesByField(field: keyof Vehicle, value: any): Promise<Vehicle[]> {
    return await this.dataSource.getRepository(Vehicle).find({
      where: { [field]: value },
      loadEagerRelations: true
    });
  }

  // @Cron('5 * * * * *')
  // async checkCarStatus() {
  //   const cars = await this.databaseService.getMany(Car);
  //   if (!cars || cars.length === 0) return;

  //   cars.forEach((car) => {
  //     const lastConnected = moment(car.lastConnected).add(45, 'seconds');
  //     const now = moment(new Date());
  //     if (now.isAfter(lastConnected)) {
  //       car.status = CarStatus.OFFLINE;
  //     }
  //   });

  //   await this.databaseService.saveMany(Car, cars);
  // }
}
