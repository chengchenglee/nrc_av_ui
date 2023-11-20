import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CommandService } from '../command/command.service';
import { Alias, Command, ISubSystemCache, SubSystem, Topic, Node } from '../core';
import { SubSystemDTO } from '../interface/dto/subsystem.dto';
import { TopicService } from '../topic/topic.service';

@Injectable()
export class SubSystemService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commandService: CommandService,
    private readonly topicService: TopicService
  ) {}

  sortSubSystemsDTO(subSystemArr: SubSystemDTO[]) {
    const sortedSubSystemArr: SubSystemDTO[] = [];
    const sortedSubSystemMap: Map<string, SubSystemDTO> = new Map();
    const dependSubSystemMap: Map<string, SubSystemDTO> = new Map();
    const dependSubSystemArr: SubSystemDTO[] = [];
    const travelTree = (subSystem: SubSystemDTO) => {
      if (sortedSubSystemMap.get(subSystem.name)) {
        return;
      }
      subSystem?.depends?.forEach((dependName) => {
        const dependSub = dependSubSystemMap.get(dependName);
        if (dependSub) {
          travelTree(dependSub);
        }
      });
      sortedSubSystemMap.set(subSystem.name, subSystem);
      sortedSubSystemArr.push(subSystem);
    };
    subSystemArr.forEach((subSystem) => {
      if (subSystem?.depends?.length === 0 || !subSystem.depends) {
        sortedSubSystemArr.push(subSystem);
        sortedSubSystemMap.set(subSystem.name, subSystem);
      } else {
        const dependencies: (SubSystemDTO | undefined)[] = subSystem.depends.map((dependName) => {
          const dependency: SubSystemDTO | undefined = sortedSubSystemMap.get(dependName);
          if (dependency) {
            return dependency;
          } else {
            return undefined;
          }
        });
        if (dependencies.includes(undefined)) {
          dependSubSystemArr.push(subSystem);
          dependSubSystemMap.set(subSystem.name, subSystem);
        } else {
          sortedSubSystemArr.push(subSystem);
          sortedSubSystemMap.set(subSystem.name, subSystem);
        }
      }
    });
    dependSubSystemArr.forEach((subSystem) => {
      travelTree(subSystem);
    });
    return sortedSubSystemArr;
  }

  createSubSystems(newSubs: SubSystemDTO[]): SubSystem[] {
    const createdSubs: SubSystem[] = [];
    const createdSubsMap: Map<string, SubSystem> = new Map();

    newSubs.forEach((newSub) => {
      const topics = newSub.topics || [];
      const commands = newSub.commands || [];
      const depends = newSub.depends || [];

      const createdSub = new SubSystem(
        newSub.name,
        newSub.description,
        newSub.diagLed,
        newSub.timeout,
        newSub.diagRetry,
        newSub.diagnostic,
        newSub.type,
        topics.map(
          (topic) =>
            new Topic(
              topic.name,
              topic.topicName,
              topic.topicType,
              topic.normalRate,
              topic.errRate,
              topic.warnRate
            )
        ),
        commands.map(
          (cmd) =>
            new Command(
              cmd.name,
              cmd.command,
              cmd.inclByDef,
              cmd.autoStart,
              cmd.autoRecord,
              cmd.launchTime,
              cmd.nodes.map((e) => new Node(e.name))
            )
        ),
        depends.map((depend) => createdSubsMap.get(depend))
      );
      createdSubs.push(createdSub);
      createdSubsMap.set(newSub.name, createdSub);
    });

    return createdSubs;
  }

  // @TODO Handle subsystem dependencies
  async updateSubSystems(
    currentSubs: SubSystem[],
    newSubs: SubSystemDTO[],
    transactionalEntityManager: EntityManager
  ): Promise<SubSystem[]> {
    const updatedSubs: SubSystem[] = [];
    const updatedSubsMap: Map<string, SubSystem> = new Map();
    newSubs.forEach((newSub) => {
      const currentSub = currentSubs.find((currentSub) => currentSub.id === newSub.id);
      if (currentSub) {
        currentSub.name = newSub.name;
        currentSub.description = newSub.description;
        currentSub.type = newSub.type;
        currentSub.topics = this.topicService.updateTopics(currentSub.topics, newSub.topics);
        currentSub.commands = this.commandService.updateCommands(
          currentSub.commands,
          newSub.commands
        );
        currentSub.diagLed = newSub.diagLed;
        currentSub.diagnostic = newSub.diagnostic;
        currentSub.dependSystems = [];
        newSub.depends.forEach((depend) => {
          const dependSub = updatedSubsMap.get(depend);
          if (dependSub) {
            currentSub.dependSystems.push(dependSub);
          }
        });
        updatedSubs.push(currentSub);
        updatedSubsMap.set(currentSub.name, currentSub);
        currentSubs.splice(currentSubs.indexOf(currentSub), 1);
      } else {
        const newUpdatedSubs = new SubSystem(
          newSub.name,
          newSub.description,
          newSub.diagLed,
          newSub.timeout,
          newSub.diagRetry,
          newSub.diagnostic,
          newSub.type,
          newSub?.topics?.map(
            (topic) =>
              new Topic(
                topic.name,
                topic.topicName,
                topic.topicType,
                topic.normalRate,
                topic.errRate,
                topic.warnRate
              )
          ),
          newSub?.commands?.map(
            (cmd) =>
              new Command(
                cmd.name,
                cmd.command,
                cmd.inclByDef,
                cmd.autoStart,
                cmd.autoRecord,
                cmd.launchTime,
                cmd.nodes.map((e) => new Node(e.name))
              )
          ),
          []
        );
        newSub?.depends?.forEach((depend) => {
          const dependSub = updatedSubsMap.get(depend);
          if (dependSub) {
            newUpdatedSubs.dependSystems.push(dependSub);
          }
        });

        updatedSubsMap.set(newUpdatedSubs.name, newUpdatedSubs);
        updatedSubs.push(newUpdatedSubs);
      }
    });
    currentSubs.forEach((currentSub) => {
      currentSub.isDeleted = true;
    });
    return await transactionalEntityManager.save(SubSystem, updatedSubs.concat(currentSubs));
  }

  getSubs(interfaceId: number): Promise<SubSystem[]> {
    return this.dataSource
      .getRepository(SubSystem)
      .createQueryBuilder(Alias.SUBSYSTEM)
      .leftJoinAndSelect(
        `${Alias.SUBSYSTEM}.${Alias.COMMANDS}`,
        Alias.COMMANDS,
        `${Alias.COMMANDS}.isDeleted = false`
      )
      .leftJoinAndSelect(
        `${Alias.COMMANDS}.${Alias.NODES}`,
        Alias.NODES,
        `${Alias.NODES}.isDeleted = false`
      )
      .leftJoinAndSelect(
        `${Alias.SUBSYSTEM}.${Alias.TOPIC}`,
        Alias.TOPIC,
        `${Alias.TOPIC}.isDeleted = false`
      )
      .leftJoinAndSelect(
        `${Alias.SUBSYSTEM}.${Alias.DEPEND_SUBSYSTEM}`,
        `${Alias.DEPEND_SUBSYSTEM}`,
        `${Alias.DEPEND_SUBSYSTEM}.isDeleted = false`
      )
      .where({ interface: { id: interfaceId }, isDeleted: false })
      .orderBy(`${Alias.SUBSYSTEM}.id`, 'ASC')
      .getMany();
  }

  async fetchSubSystemSequence(interfaceId: number): Promise<ISubSystemCache> {
    const subSystemArr: SubSystemDTO[] = (await this.getSubs(interfaceId)).map((subSystem) => ({
      ...subSystem,
      depends: subSystem.dependSystems.map((depends) => depends.name)
    }));
    const subSystemSorted = this.sortSubSystemsDTO(subSystemArr);
    const subSystemCache: ISubSystemCache = {
      interfaceId,
      subSystemSeq: subSystemSorted.map((subSystem) => subSystem.id)
    };
    return subSystemCache;
  }

  sortSubSystem(subSystemArr: SubSystemDTO[], idList: number[]) {
    const idIndexMap = new Map();
    idList.forEach((id, index) => {
      idIndexMap.set(id, index);
    });

    subSystemArr.sort((a, b) => {
      const aIndex = idIndexMap.get(a.id);
      const bIndex = idIndexMap.get(b.id);

      if (aIndex === undefined) {
        return 1;
      }
      if (bIndex === undefined) {
        return -1;
      }

      return aIndex - bIndex;
    });

    return subSystemArr;
  }

  async getSubSystemWithIds(subSystemIds: number[]) {
    const subSystemArr = await this.dataSource.getRepository(SubSystem).find({
      where: {
        id: In(subSystemIds)
      },
      relations: [
        Alias.DEPEND_SUBSYSTEM,
        Alias.COMMANDS,
        `${Alias.COMMANDS}.${Alias.NODES}`,
        Alias.TOPIC
      ]
    });

    return subSystemArr;
  }
}
