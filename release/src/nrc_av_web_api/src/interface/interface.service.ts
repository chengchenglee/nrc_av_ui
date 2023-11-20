import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common';
import { DataSource, EntityManager, ILike, In } from 'typeorm';
import { CacheSubSystemService } from '../cachesubsystem/cachesubsystem.service';
import { CommandService } from '../command/command.service';
import {
  Alias,
  Interface,
  InterfaceContent,
  InterfaceDestination,
  Machine,
  SubSystemType,
  User,
  message
} from '../core';
import { InterfaceDestinationService } from '../interfaceDestination/interfaceDestination.service';
import { MachineService } from '../machine/machine.service';
import { MultiDestinationService } from '../multiDestination/multiDestination.service';
import { SubSystemService } from '../subsystem/subsystem.service';
import { TopicService } from '../topic/topic.service';
import { InterfaceContentService } from './../interfaceContent/interfaceContent.service';
import { InterfaceDTO } from './dto/interface.dto';
import { InterfaceCloneDTO } from './dto/interfaceClone.dto';
import { InterfaceFilteringDTO, InterfaceList } from './dto/interfaceFiltering.dto';
import { InterfaceNoSubDTO } from './dto/interfaceNoSub.dto';
import { SubSystemDTO } from './dto/subsystem.dto';

@Injectable()
export class InterfaceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly machineService: MachineService,
    private readonly subSystemService: SubSystemService,
    private readonly interfaceDestinationService: InterfaceDestinationService,
    private readonly interfaceContentService: InterfaceContentService,
    private readonly multiDestinationService: MultiDestinationService,
    private readonly commandService: CommandService,
    private readonly topicService: TopicService,
    @Inject(forwardRef(() => CacheSubSystemService))
    private readonly cacheSubSystemService: CacheSubSystemService
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
      agentInterface.machines,
      agentInterface.subSystems,
      agentInterface.multiDestinations,
      agentInterface.interfaceDestinations,
      agentInterface.interfaceContents
    ] = await Promise.all([
      this.machineService.getMachines(id),
      this.subSystemService.getSubs(id),
      this.multiDestinationService.getMultiDests(id),
      this.interfaceDestinationService.getInterfaceDests(id),
      this.interfaceContentService.getInterfaceContent(id)
    ]);
    return agentInterface;
  }

  async getInterfaceWithAllRelationsView(id: number): Promise<InterfaceNoSubDTO> {
    const agentInterface = await this.dataSource
      .getRepository(Interface)
      .createQueryBuilder(Alias.INTERFACE)
      .where({ id, isDeleted: false })
      .getOne();

    if (!agentInterface) {
      throw new HttpException(message.interfaceNotFound, HttpStatus.NOT_FOUND);
    }
    const returnDto: InterfaceNoSubDTO = {
      ...agentInterface,
      sensors: [],
      algorithms: [],
      commands: []
    };
    [
      returnDto.machines,
      returnDto.multiDestinations,
      returnDto.interfaceDestinations,
      returnDto.commands,
      returnDto.sensors,
      returnDto.algorithms
    ] = await Promise.all([
      this.machineService.getMachines(id),
      this.multiDestinationService.getMultiDests(id),
      this.interfaceDestinationService.getInterfaceDests(id),
      this.commandService.getCommands(id),
      this.topicService.getTopics(id, SubSystemType.SENSOR),
      this.topicService.getTopics(id, SubSystemType.ALGORITHM)
    ]);
    return returnDto;
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
        name,
        isDeleted: false
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

  travelDependenciesTree = (
    subSystem: SubSystemDTO,
    subSystemMap: Map<string, SubSystemDTO>,
    subSystemRoot: Map<string, SubSystemDTO>
  ) => {
    subSystem.depends?.forEach((depend) => {
      if (!subSystemRoot.has(depend)) {
        const newDependRoot = new Map(subSystemRoot);
        newDependRoot.set(subSystem.name, subSystem);
        if (!subSystemMap.has(depend)) {
          //Dependency do not exist
          throw new Error(
            message.invalidSubSystem +
              `: Dependency of sub system ${subSystem.name} do not exist - ${depend}`
          );
        }
        this.travelDependenciesTree(subSystemMap.get(depend), subSystemMap, newDependRoot);
      } else {
        //Dependencies create a loop
        throw new Error(
          message.invalidSubSystem +
            `: Dependency of sub system ${subSystem.name} create a loop - ${depend}`
        );
      }
    });
  };

  validateDependencies = (subSystemArr: SubSystemDTO[]) => {
    const subSystemMap: Map<string, SubSystemDTO> = new Map();
    subSystemArr.forEach((subSystem) => {
      if (subSystemMap.has(subSystem.name)) {
        //Duplicate sub system name detected
        throw new Error(
          message.invalidSubSystem + `: Duplicate sub system name detected - ${subSystem.name}`
        );
      }
      subSystemMap.set(subSystem.name, subSystem);
    });
    subSystemArr.forEach((subSystem) => {
      this.travelDependenciesTree(subSystem, subSystemMap, new Map());
    });
  };

  async cloneInterface(
    id: number,
    interfaceCloneDTO: InterfaceCloneDTO,
    user: User
  ): Promise<Interface> {
    const interfaceEntity = await this.getInterfaceWithAllRelations(id);
    const subSystems: SubSystemDTO[] = interfaceEntity.subSystems.map((subSystem) => ({
      ...subSystem,
      depends: subSystem.dependSystems.map((depends) => depends.name)
    }));
    const interfaceContent = interfaceEntity.interfaceContents[0]
      ? interfaceEntity.interfaceContents[0].content
      : '';
    const contentSplit = interfaceContent.split('\n');
    const contentInterfaceName = contentSplit.findIndex((value) => new RegExp('Name:').test(value));
    const interfaceNameIndex = contentSplit[contentInterfaceName].indexOf('Name:');
    if (interfaceNameIndex !== -1) {
      contentSplit[contentInterfaceName] =
        contentSplit[contentInterfaceName].slice(0, interfaceNameIndex + 5) +
        ` ${interfaceCloneDTO.name}`;
    }
    return await this.createInterface(
      { ...interfaceEntity, ...interfaceCloneDTO, subSystems, content: contentSplit.join('\n') },
      user
    );
  }

  async createInterface(interfaceDTO: InterfaceDTO, user: User): Promise<Interface> {
    const {
      name,
      interfaceDestinations: destinations,
      machines,
      multiDestinations,
      subSystems,
      content
    } = interfaceDTO;

    const existedAgentInterface = await this.getInterfaceByName(name);
    if (existedAgentInterface) {
      throw new HttpException(message.interfaceExisted, HttpStatus.BAD_REQUEST);
    }
    try {
      this.validateDependencies(subSystems);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }

    let newInterface = new Interface(name);

    await this.dataSource.manager.transaction(async (transactionalEntityManager: EntityManager) => {
      newInterface.machines = machines?.map((machine) => new Machine(machine.name, machine.addr));

      if (subSystems?.length) {
        try {
          const subSort = this.subSystemService.sortSubSystemsDTO(subSystems);
          const newSubSystems = this.subSystemService.createSubSystems(subSort);
          newInterface.subSystems = newSubSystems;
        } catch {
          throw new HttpException(message.invalidSubSystem, HttpStatus.BAD_REQUEST);
        }
      }

      if (multiDestinations?.length) {
        const newMultiDests = await this.multiDestinationService.addMultiDests(
          transactionalEntityManager,
          multiDestinations
        );
        newInterface.multiDestinations = newMultiDests;
      }

      newInterface.users = [user];
      newInterface.interfaceContents = [new InterfaceContent(content)];
      newInterface = await transactionalEntityManager.save(Interface, newInterface);

      if (destinations?.length) {
        const newDests = (
          await this.interfaceDestinationService.addInterfaceDests(
            transactionalEntityManager,
            destinations,
            newInterface
          )
        ).map(
          (interfaceDest) =>
            ({
              name: interfaceDest.name,
              destination: interfaceDest.destination
            } as InterfaceDestination)
        );

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
        name: ILike(`%${name}%`),
        isDeleted: false
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
        name: ILike(`%${name}%`),
        isDeleted: false
      }
    });
    return { interfaces, total };
  }

  async deleteInterface(id: number): Promise<boolean> {
    const agentInterface = await this.getInterfaceWithAllRelations(id);

    if (!agentInterface) {
      throw new NotFoundException('Interface not found.');
    }

    agentInterface.isDeleted = true;

    await this.dataSource.manager.save(agentInterface);
    const cacheSubSystem = await this.cacheSubSystemService.getSubSystemCacheWithInterfaceId(id);
    if (cacheSubSystem) {
      await this.cacheSubSystemService.deleteCacheSubSystemByIdInterface(id);
    }

    return true;
  }

  async updateInterface(id: number, interfaceDTO: InterfaceNoSubDTO): Promise<Interface> {
    let agentInterface = await this.getInterfaceWithAllRelations(id);
    const {
      name,
      machines,
      algorithms: algs,
      commands: cmds,
      sensors: sens,
      multiDestinations: multiDests,
      interfaceDestinations: dests
    } = interfaceDTO;
    const subSystemDto: SubSystemDTO[] = agentInterface.subSystems.map((sub) => ({
      ...sub,
      topics: [],
      commands: [],
      depends: sub.dependSystems.map((dep) => dep.name)
    }));
    const topic = [...algs, ...sens];
    const topicMap = await this.topicService.mapTopic(
      id,
      topic.map((obj) => ({ ...obj, normalRate: null }))
    );
    const commandMap = await this.commandService.mapCommand(id, cmds);
    subSystemDto.forEach((sub) => {
      if (topicMap.has(sub.id)) {
        sub.topics = topicMap.get(sub.id);
      }
      if (commandMap.has(sub.id)) {
        sub.commands = commandMap.get(sub.id);
      }
    });
    const existedInterface = await this.getInterfaceByName(name);
    if (existedInterface && existedInterface.id !== id) {
      throw new HttpException(message.interfaceExisted, HttpStatus.BAD_REQUEST);
    }

    agentInterface.name = name;
    agentInterface.machines = this.machineService.updateMachines(agentInterface.machines, machines);
    agentInterface.updatedAt = new Date();

    await this.dataSource.manager.transaction(async (transactionalEntityManager: EntityManager) => {
      agentInterface.multiDestinations = await this.multiDestinationService.updateMultiDests(
        agentInterface.multiDestinations,
        multiDests,
        transactionalEntityManager
      );
      const subSort = this.subSystemService.sortSubSystemsDTO(subSystemDto);
      agentInterface.subSystems = await this.subSystemService.updateSubSystems(
        agentInterface.subSystems,
        subSort,
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
        .map(
          (interfaceDest) =>
            ({
              name: interfaceDest.name,
              destination: interfaceDest.destination
            } as InterfaceDestination)
        );
    });

    agentInterface.machines = agentInterface.machines.filter((machine) => !machine.isDeleted);
    agentInterface.multiDestinations = agentInterface.multiDestinations.filter((multiDest) => {
      if (!multiDest.isDeleted) {
        multiDest.destinations = multiDest.destinations.filter((dest) => !dest.isDeleted);
        return true;
      }
      return false;
    });

    delete agentInterface.users;
    const cacheSubSystem = await this.cacheSubSystemService.getSubSystemCacheWithInterfaceId(id);
    if (cacheSubSystem) {
      const fetchSubSystemSequence = await this.subSystemService.fetchSubSystemSequence(id);
      await this.cacheSubSystemService.updateSubSystemCache(
        fetchSubSystemSequence.interfaceId,
        fetchSubSystemSequence.subSystemSeq.toString()
      );
    }

    return agentInterface;
  }

  async updateInterfaceWithSub(id: number, interfaceDTO: InterfaceDTO): Promise<Interface> {
    let agentInterface = await this.getInterfaceWithAllRelations(id);
    const {
      name,
      interfaceDestinations: dests,
      machines,
      multiDestinations: multiDests,
      subSystems,
      content
    } = interfaceDTO;

    const existedInterface = await this.getInterfaceByName(name);
    if (existedInterface && existedInterface.id !== id) {
      throw new HttpException(message.interfaceExisted, HttpStatus.BAD_REQUEST);
    }

    try {
      this.validateDependencies(subSystems);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
    agentInterface.name = name;
    agentInterface.machines = this.machineService.updateMachines(agentInterface.machines, machines);
    agentInterface.updatedAt = new Date();
    await this.dataSource.manager.transaction(async (transactionalEntityManager: EntityManager) => {
      agentInterface.multiDestinations = await this.multiDestinationService.updateMultiDests(
        agentInterface.multiDestinations,
        multiDests,
        transactionalEntityManager
      );
      const subSort = this.subSystemService.sortSubSystemsDTO(subSystems);
      agentInterface.subSystems = await this.subSystemService.updateSubSystems(
        agentInterface.subSystems,
        subSort,
        transactionalEntityManager
      );
      agentInterface.interfaceContents = await this.interfaceContentService.updateInterfaceContent(
        await this.interfaceContentService.getAllInterfaceContent(agentInterface.id),
        content,
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
        .map(
          (interfaceDest) =>
            ({
              name: interfaceDest.name,
              destination: interfaceDest.destination
            } as InterfaceDestination)
        );
    });

    agentInterface.machines = agentInterface.machines.filter((machine) => !machine.isDeleted);
    agentInterface.multiDestinations = agentInterface.multiDestinations.filter((multiDest) => {
      if (!multiDest.isDeleted) {
        multiDest.destinations = multiDest.destinations.filter((dest) => !dest.isDeleted);
        return true;
      }
      return false;
    });

    delete agentInterface.users;
    const cacheSubSystem = await this.cacheSubSystemService.getSubSystemCacheWithInterfaceId(id);
    if (cacheSubSystem) {
      const fetchSubSystemSequence = await this.subSystemService.fetchSubSystemSequence(id);
      await this.cacheSubSystemService.updateSubSystemCache(
        fetchSubSystemSequence.interfaceId,
        fetchSubSystemSequence.subSystemSeq.toString()
      );
    }

    return agentInterface;
  }
}
