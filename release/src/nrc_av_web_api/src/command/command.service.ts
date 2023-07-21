import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Command, message } from '../core';
import { CommandDTO } from '../interface/dto/command.dto';

@Injectable()
export class CommandService {
  constructor(private readonly dataSource: DataSource) {}

  updateCommands(currentCmds: Command[], newCmds: CommandDTO[]): Command[] {
    const updatedCmds: Command[] = [];
    newCmds.forEach((newCmd) => {
      const currentCmd = currentCmds.find((currentCmd) => currentCmd.id === newCmd.id);
      if (currentCmd) {
        currentCmd.name = newCmd.name;
        currentCmd.command = newCmd.command;
        currentCmd.nodes = newCmd.nodes;
        currentCmd.inclByDef = newCmd.inclByDef;
        currentCmd.autoStart = newCmd.autoStart;
        currentCmd.autoRecord = newCmd.autoRecord;
        updatedCmds.push(currentCmd);
        currentCmds.splice(currentCmds.indexOf(currentCmd), 1);
      } else {
        updatedCmds.push(
          new Command(
            newCmd.name,
            newCmd.command,
            newCmd.nodes,
            newCmd.inclByDef,
            newCmd.autoStart,
            newCmd.autoRecord
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
        interface: {
          id: interfaceId,
          isDeleted: false
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
        interface: {
          id: interfaceId,
          isDeleted: false
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
        interface: {
          id: interfaceId
        },
        isDeleted: false
      }
    });
  }
}
