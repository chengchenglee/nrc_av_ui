import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Alias, Command, Node, message } from '../core';
import { CommandDTO } from '../interface/dto/command.dto';

@Injectable()
export class CommandService {
  constructor(private readonly dataSource: DataSource) {}

  //@TODO Handle edit for future DTO (launchTime)
  updateCommands(currentCmds: Command[], newCmds: CommandDTO[]): Command[] {
    const updatedCmds: Command[] = [];
    newCmds.forEach((newCmd) => {
      const currentCmd = currentCmds.find((currentCmd) => currentCmd.id === newCmd.id);
      if (currentCmd) {
        currentCmd.name = newCmd.name;
        currentCmd.command = newCmd.command;
        currentCmd.nodes = newCmd.nodes.map((e) => new Node(e.name));
        currentCmd.inclByDef = newCmd.inclByDef;
        currentCmd.autoStart = newCmd.autoStart;
        currentCmd.autoRecord = newCmd.autoRecord;
        if (newCmd.launchTime && newCmd.launchTime !== null) {
          currentCmd.launchTime = newCmd.launchTime;
        }

        updatedCmds.push(currentCmd);
        currentCmds.splice(currentCmds.indexOf(currentCmd), 1);
      } else {
        updatedCmds.push(
          new Command(
            newCmd.name,
            newCmd.command,
            newCmd.inclByDef,
            newCmd.autoStart,
            newCmd.autoRecord,
            0.0,
            newCmd.nodes.map((e) => new Node(e.name))
          )
        );
      }
    });
    currentCmds.forEach((currentCmd) => {
      currentCmd.isDeleted = true;
    });
    return updatedCmds.concat(currentCmds);
  }

  async getCommand(interfaceId: number, commandId: number): Promise<Command> {
    const command = await this.dataSource.getRepository(Command).findOne({
      where: {
        subSystem: {
          interface: {
            id: interfaceId
          }
        },
        id: commandId,
        isDeleted: false
      }
    });
    if (!command) {
      throw new HttpException(message.commandNotFound, HttpStatus.NOT_FOUND);
    }
    return command;
  }

  async getCommandsByInterfaceId(interfaceId: number): Promise<Command[]> {
    const commands = await this.dataSource.getRepository(Command).find({
      where: {
        subSystem: {
          interface: {
            id: interfaceId
          }
        },
        isDeleted: false
      }
    });
    if (!commands || commands.length === 0) {
      throw new HttpException(message.interfaceNoCommand, HttpStatus.NOT_FOUND);
    }
    return commands;
  }

  getCommands(interfaceId: number): Promise<Command[]> {
    return this.dataSource.getRepository(Command).find({
      where: {
        subSystem: {
          interface: {
            id: interfaceId
          }
        },
        isDeleted: false
      },
      relations: [Alias.NODES]
    });
  }

  getCommandsWithRelation(interfaceId: number): Promise<Command[]> {
    return this.dataSource.getRepository(Command).find({
      where: {
        subSystem: {
          interface: {
            id: interfaceId
          }
        },
        isDeleted: false
      },
      relations: [Alias.SUBSYSTEM]
    });
  }

  async mapCommand(
    interfaceId: number,
    commandDtoArr: CommandDTO[]
  ): Promise<Map<number, CommandDTO[]>> {
    const commandList = await this.getCommandsWithRelation(interfaceId);
    const commandMap = new Map<number, CommandDTO[]>();
    commandList.forEach((command) => {
      const currentCommand = commandDtoArr.find(
        (currentCommand) => currentCommand.id === command.id
      );
      if (currentCommand) {
        if (commandMap.has(command.subSystem.id)) {
          const topicArr = commandMap.get(command.subSystem.id);
          topicArr.push(currentCommand);
          commandMap.set(command.subSystem.id, topicArr);
        } else {
          commandMap.set(command.subSystem.id, [currentCommand]);
        }
      }
    });
    return commandMap;
  }
}
