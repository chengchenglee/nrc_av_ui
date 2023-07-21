import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, ILike, In } from 'typeorm';
import { AlgorithmService } from '../algorithm/algorithm.service';
import { CommandService } from '../command/command.service';
import { Algorithm, Alias, Command, Interface, Machine, Sensor, User, message } from '../core';
import { InterfaceDestinationService } from '../interfaceDestination/interfaceDestination.service';
import { MachineService } from '../machine/machine.service';
import { MultiDestinationService } from '../multiDestination/multiDestination.service';
import { SensorService } from '../sensor/sensor.service';
import { InterfaceDTO } from './dto/interface.dto';
import { InterfaceFilteringDTO, InterfaceList } from './dto/interfaceFiltering.dto';

@Injectable()
export class InterfaceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly algorithmService: AlgorithmService,
    private readonly machineService: MachineService,
    private readonly commandService: CommandService,
    private readonly sensorService: SensorService,
    private readonly interfaceDestinationService: InterfaceDestinationService,
    private readonly multiDestinationService: MultiDestinationService
  ) {}

  async getInterfaceWithAllRelations(id: number): Promise<Interface> {
    const agentInterface = await this.dataSource
      .getRepository(Interface)
      .createQueryBuilder(Alias.INTERFACE)
      .where({ id, isDeleted: false })
      .getOne();

    if (!agentInterface) {
      throw new HttpException(message.interfaceNotFound, HttpStatus.NOT_FOUND);
    }

    [
      agentInterface.commands,
      agentInterface.sensors,
      agentInterface.machines,
      agentInterface.algorithms,
      agentInterface.multiDestinations,
      agentInterface.interfaceDestinations
    ] = await Promise.all([
      this.commandService.getCommands(id),
      this.sensorService.getSensors(id),
      this.machineService.getMachines(id),
      this.algorithmService.getAlgs(id),
      this.multiDestinationService.getMultiDests(id),
      this.interfaceDestinationService.getInterfaceDests(id)
    ]);

    return agentInterface;
  }

  getInterfaceByNames(names: string[]): Promise<Interface[]> {
    return this.dataSource.getRepository(Interface).find({
      where: {
        name: In(names)
      }
    });
  }

  getInterfaceByName(name: string): Promise<Interface> {
    return this.dataSource.getRepository(Interface).findOne({
      where: {
        name
      }
    });
  }

  async getInterfaceById(id: number): Promise<Interface> {
    const agentInterface = await this.dataSource.getRepository(Interface).findOne({
      where: {
        id
      }
    });
    if (!agentInterface) {
      throw new HttpException(message.interfaceNotFound, HttpStatus.NOT_FOUND);
    }
    return agentInterface;
  }

  async createInterface(interfaceDTO: InterfaceDTO, user: User): Promise<Interface> {
    const {
      name,
      algorithms,
      commands,
      interfaceDestinations: destinations,
      machines,
      multiDestinations,
      sensors
    } = interfaceDTO;

    const existedAgentInterface = await this.getInterfaceByName(name);
    if (existedAgentInterface) {
      throw new HttpException(message.interfaceExisted, HttpStatus.BAD_REQUEST);
    }

    let newInterface = new Interface(name);

    await this.dataSource.manager.transaction(async (transactionalEntityManager: EntityManager) => {
      newInterface.machines = machines?.map((machine) => new Machine(machine.name, machine.addr));

      newInterface.algorithms = algorithms?.map(
        (alg) => new Algorithm(alg.name, alg.errRate, alg.warnRate, alg.topicName, alg.topicType)
      );

      newInterface.commands = commands?.map(
        (cmd) =>
          new Command(
            cmd.name,
            cmd.command,
            cmd.nodes,
            cmd.inclByDef,
            cmd.autoStart,
            cmd.autoRecord
          )
      );

      newInterface.sensors = sensors?.map(
        (sensor) =>
          new Sensor(
            sensor.name,
            sensor.errRate,
            sensor.warnRate,
            sensor.topicName,
            sensor.topicType
          )
      );

      if (multiDestinations?.length) {
        const newMultiDests = await this.multiDestinationService.addMultiDests(
          transactionalEntityManager,
          multiDestinations
        );
        newInterface.multiDestinations = newMultiDests;
      }

      newInterface.users = [user];
      newInterface = await transactionalEntityManager.save(Interface, newInterface);

      if (destinations?.length) {
        const newDests = (
          await this.interfaceDestinationService.addInterfaceDests(
            transactionalEntityManager,
            destinations,
            newInterface
          )
        ).map((interfaceDest) => ({ ...interfaceDest, interface: null }));

        newInterface.interfaceDestinations = newDests;
      }
    });
    delete newInterface.users;

    return newInterface;
  }

  async listInterfaces(interfaceFilteringDTO: InterfaceFilteringDTO): Promise<InterfaceList> {
    const { name, order, currentPage, orderBy, pageSize } = interfaceFilteringDTO;
    const interfaces = await this.dataSource.getRepository(Interface).find({
      where: {
        name: ILike(`%${name}%`)
      },
      order: {
        [orderBy]: order
      },
      skip: currentPage * pageSize,
      take: pageSize,
      relations: ['model']
    });
    const total = await this.dataSource.getRepository(Interface).count({
      where: {
        name: ILike(`%${name}%`)
      }
    });
    return { interfaces, total };
  }

  async updateInterface(id: number, interfaceDTO: InterfaceDTO): Promise<Interface> {
    let agentInterface = await this.getInterfaceWithAllRelations(id);

    const {
      name,
      machines,
      algorithms: algs,
      commands: cmds,
      sensors,
      multiDestinations: multiDests,
      interfaceDestinations: dests
    } = interfaceDTO;

    const existedInterface = await this.getInterfaceByName(name);
    if (existedInterface && existedInterface.id !== id) {
      throw new HttpException(message.interfaceExisted, HttpStatus.BAD_REQUEST);
    }

    agentInterface.name = name;
    agentInterface.machines = this.machineService.updateMachines(agentInterface.machines, machines);
    agentInterface.algorithms = this.algorithmService.updateAlgorithms(
      agentInterface.algorithms,
      algs
    );
    agentInterface.commands = this.commandService.updateCommands(agentInterface.commands, cmds);
    agentInterface.sensors = this.sensorService.updateSensors(agentInterface.sensors, sensors);
    await this.dataSource.manager.transaction(async (transactionalEntityManager: EntityManager) => {
      agentInterface.multiDestinations = await this.multiDestinationService.updateMultiDests(
        agentInterface.multiDestinations,
        multiDests,
        transactionalEntityManager
      );
      const currentInterfaceDests = agentInterface.interfaceDestinations;
      delete agentInterface.interfaceDestinations;
      agentInterface = await transactionalEntityManager.save(Interface, agentInterface);
      agentInterface.interfaceDestinations = (
        await this.interfaceDestinationService.updateInterfaceDests(
          currentInterfaceDests,
          dests,
          transactionalEntityManager,
          agentInterface
        )
      )
        .filter((interfaceDest) => !interfaceDest.isDeleted)
        .map((interfaceDest) => ({ ...interfaceDest, interface: null }));
    });

    agentInterface.machines = agentInterface.machines.filter((machine) => !machine.isDeleted);
    agentInterface.algorithms = agentInterface.algorithms.filter(
      (algorithm) => !algorithm.isDeleted
    );
    agentInterface.commands = agentInterface.commands.filter((command) => !command.isDeleted);
    agentInterface.sensors = agentInterface.sensors.filter((sensor) => !sensor.isDeleted);
    agentInterface.multiDestinations = agentInterface.multiDestinations.filter((multiDest) => {
      if (!multiDest.isDeleted) {
        multiDest.destinations = multiDest.destinations.filter((dest) => !dest.isDeleted);
        return true;
      }
      return false;
    });

    delete agentInterface.users;
    return agentInterface;
  }
}
